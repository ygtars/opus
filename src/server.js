const express = require('express');
const { connectDb, initSchema } = require('./db');
const { splitRequirementToTasks, planSchedule } = require('./services/planner');

async function createServer() {
  const db = await connectDb();
  await initSchema(db);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/projects', async (req, res) => {
    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await db.run('INSERT INTO projects(name, description) VALUES (?, ?)', [name, description]);
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    return res.status(201).json(project);
  });

  app.get('/api/projects', async (_req, res) => {
    const rows = await db.all('SELECT * FROM projects ORDER BY id DESC');
    return res.json(rows);
  });

  app.post('/api/members', async (req, res) => {
    const { fullName, role = 'developer', capacityHoursPerDay = 6 } = req.body;
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });

    const result = await db.run(
      'INSERT INTO members(full_name, role, capacity_hours_per_day) VALUES (?, ?, ?)',
      [fullName, role, capacityHoursPerDay]
    );

    const member = await db.get('SELECT * FROM members WHERE id = ?', [result.lastID]);
    return res.status(201).json(member);
  });

  app.post('/api/skills', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    await db.run('INSERT OR IGNORE INTO skills(name) VALUES (?)', [name.toLowerCase()]);
    const skill = await db.get('SELECT * FROM skills WHERE name = ?', [name.toLowerCase()]);
    return res.status(201).json(skill);
  });

  app.post('/api/members/:memberId/skills', async (req, res) => {
    const memberId = Number(req.params.memberId);
    const { skillName, level = 'mid' } = req.body;

    if (!skillName) return res.status(400).json({ error: 'skillName is required' });

    await db.run('INSERT OR IGNORE INTO skills(name) VALUES (?)', [skillName.toLowerCase()]);
    const skill = await db.get('SELECT * FROM skills WHERE name = ?', [skillName.toLowerCase()]);

    await db.run(
      'INSERT OR REPLACE INTO member_skills(member_id, skill_id, level) VALUES (?, ?, ?)',
      [memberId, skill.id, level]
    );

    return res.status(201).json({ memberId, skill: skill.name, level });
  });

  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    const projectId = Number(req.params.projectId);
    const rows = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY day_index, id', [projectId]);
    return res.json(rows);
  });

  app.post('/api/projects/:projectId/ai-plan', async (req, res) => {
    const projectId = Number(req.params.projectId);
    const { requirement } = req.body;
    if (!requirement) return res.status(400).json({ error: 'requirement is required' });

    const members = await db.all(
      `SELECT m.id, m.full_name,
              COALESCE(json_group_array(json_object('name', s.name, 'level', ms.level)), '[]') AS skillsJson
       FROM members m
       LEFT JOIN member_skills ms ON ms.member_id = m.id
       LEFT JOIN skills s ON s.id = ms.skill_id
       GROUP BY m.id
       ORDER BY m.id`
    );

    const normalizedMembers = members.map((m) => ({
      id: m.id,
      fullName: m.full_name,
      skills: JSON.parse(m.skillsJson).filter((x) => x.name)
    }));

    const candidateTasks = splitRequirementToTasks(requirement);
    const planned = planSchedule(candidateTasks, normalizedMembers);

    for (const task of planned) {
      await db.run(
        `INSERT INTO tasks(project_id, title, description, phase, required_skill, estimate_hours, day_index, assigned_member_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          task.title,
          task.description,
          task.phase,
          task.requiredSkill,
          task.estimateHours,
          task.dayIndex,
          task.assignedMemberId
        ]
      );
    }

    const saved = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY day_index, id', [projectId]);
    return res.status(201).json(saved);
  });

  return app;
}

if (require.main === module) {
  createServer()
    .then((app) => {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Server running at http://localhost:${port}`);
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = { createServer };
