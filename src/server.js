const express = require('express');
const { connectDb, initSchema } = require('./db');
const { splitRequirementToTasks, planSchedule } = require('./services/planner');
const { analyzeTaskGraph } = require('./services/criticalPath');

function toInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function getTask(db, taskId) {
  return db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
}

async function dependencyWouldCreateCycle(db, taskId, blockedByTaskId) {
  const rows = await db.all('SELECT task_id, blocked_by_task_id FROM task_dependencies');
  const graph = new Map();

  for (const row of rows) {
    if (!graph.has(row.task_id)) graph.set(row.task_id, []);
    graph.get(row.task_id).push(row.blocked_by_task_id);
  }

  if (!graph.has(taskId)) graph.set(taskId, []);
  graph.get(taskId).push(blockedByTaskId);

  const visited = new Set();
  const inStack = new Set();

  function dfs(node) {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const next of neighbors) {
      if (dfs(next)) return true;
    }

    inStack.delete(node);
    return false;
  }

  return dfs(taskId);
}


async function loadMembersWithSkills(db) {
  const members = await db.all(
    `SELECT m.id, m.full_name, m.capacity_hours_per_day,
            COALESCE(json_group_array(json_object('name', s.name, 'level', ms.level)), '[]') AS skillsJson
     FROM members m
     LEFT JOIN member_skills ms ON ms.member_id = m.id
     LEFT JOIN skills s ON s.id = ms.skill_id
     GROUP BY m.id
     ORDER BY m.id`
  );

  return members.map((m) => ({
    id: m.id,
    fullName: m.full_name,
    capacityHoursPerDay: m.capacity_hours_per_day,
    skills: JSON.parse(m.skillsJson).filter((x) => x.name)
  }));
}

async function createServer() {
  const db = await connectDb();
  await initSchema(db);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/organizations', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    await db.run('INSERT OR IGNORE INTO organizations(name) VALUES (?)', [name]);
    const org = await db.get('SELECT * FROM organizations WHERE name = ?', [name]);
    return res.status(201).json(org);
  }));

  app.get('/api/organizations', asyncHandler(async (_req, res) => {
    const rows = await db.all('SELECT * FROM organizations ORDER BY id ASC');
    return res.json(rows);
  }));

  app.post('/api/projects', asyncHandler(async (req, res) => {
    const { organizationId = null, name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await db.run(
      'INSERT INTO projects(organization_id, name, description) VALUES (?, ?, ?)',
      [organizationId, name, description]
    );
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    return res.status(201).json(project);
  }));

  app.get('/api/projects', asyncHandler(async (_req, res) => {
    const rows = await db.all('SELECT * FROM projects ORDER BY id DESC');
    return res.json(rows);
  }));

  app.get('/api/projects/:projectId', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'project not found' });
    return res.json(project);
  }));

  app.patch('/api/projects/:projectId', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    const { name, description } = req.body;
    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });

    await db.run(
      'UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
      [name ?? null, description ?? null, projectId]
    );

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'project not found' });
    return res.json(project);
  }));

  app.delete('/api/projects/:projectId', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });

    const result = await db.run('DELETE FROM projects WHERE id = ?', [projectId]);
    if (!result.changes) return res.status(404).json({ error: 'project not found' });
    return res.status(204).send();
  }));

  app.post('/api/members', asyncHandler(async (req, res) => {
    const { organizationId = null, fullName, role = 'developer', capacityHoursPerDay = 6 } = req.body;
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });

    const result = await db.run(
      'INSERT INTO members(organization_id, full_name, role, capacity_hours_per_day) VALUES (?, ?, ?, ?)',
      [organizationId, fullName, role, capacityHoursPerDay]
    );

    const member = await db.get('SELECT * FROM members WHERE id = ?', [result.lastID]);
    return res.status(201).json(member);
  }));

  app.get('/api/members', asyncHandler(async (_req, res) => {
    const rows = await db.all('SELECT * FROM members ORDER BY id ASC');
    return res.json(rows);
  }));

  app.post('/api/skills', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    await db.run('INSERT OR IGNORE INTO skills(name) VALUES (?)', [name.toLowerCase()]);
    const skill = await db.get('SELECT * FROM skills WHERE name = ?', [name.toLowerCase()]);
    return res.status(201).json(skill);
  }));

  app.post('/api/members/:memberId/skills', asyncHandler(async (req, res) => {
    const memberId = toInt(req.params.memberId);
    const { skillName, level = 'mid' } = req.body;

    if (memberId === null) return res.status(400).json({ error: 'invalid memberId' });
    if (!skillName) return res.status(400).json({ error: 'skillName is required' });

    await db.run('INSERT OR IGNORE INTO skills(name) VALUES (?)', [skillName.toLowerCase()]);
    const skill = await db.get('SELECT * FROM skills WHERE name = ?', [skillName.toLowerCase()]);

    await db.run(
      'INSERT OR REPLACE INTO member_skills(member_id, skill_id, level) VALUES (?, ?, ?)',
      [memberId, skill.id, level]
    );

    return res.status(201).json({ memberId, skill: skill.name, level });
  }));

  app.get('/api/projects/:projectId/tasks', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });

    const rows = await db.all(
      `SELECT t.*, m.full_name AS assigned_member_name
       FROM tasks t
       LEFT JOIN members m ON m.id = t.assigned_member_id
       WHERE t.project_id = ?
       ORDER BY t.day_index, t.id`,
      [projectId]
    );
    return res.json(rows);
  }));

  app.patch('/api/tasks/:taskId', asyncHandler(async (req, res) => {
    const taskId = toInt(req.params.taskId);
    const { status, assignedMemberId, estimateHours, dayIndex, dayDate } = req.body;
    if (taskId === null) return res.status(400).json({ error: 'invalid taskId' });

    await db.run(
      `UPDATE tasks
       SET status = COALESCE(?, status),
           assigned_member_id = COALESCE(?, assigned_member_id),
           estimate_hours = COALESCE(?, estimate_hours),
           day_index = COALESCE(?, day_index),
           day_date = COALESCE(?, day_date)
       WHERE id = ?`,
      [status ?? null, assignedMemberId ?? null, estimateHours ?? null, dayIndex ?? null, dayDate ?? null, taskId]
    );

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'task not found' });
    return res.json(task);
  }));

  app.post('/api/tasks/:taskId/dependencies', asyncHandler(async (req, res) => {
    const taskId = toInt(req.params.taskId);
    const blockedByTaskId = toInt(req.body.blockedByTaskId);

    if (taskId === null || blockedByTaskId === null) {
      return res.status(400).json({ error: 'taskId and blockedByTaskId must be integers' });
    }

    if (taskId === blockedByTaskId) {
      return res.status(400).json({ error: 'task cannot depend on itself' });
    }

    const task = await getTask(db, taskId);
    const blocker = await getTask(db, blockedByTaskId);
    if (!task || !blocker) return res.status(404).json({ error: 'task or blockedBy task not found' });
    if (task.project_id !== blocker.project_id) {
      return res.status(400).json({ error: 'dependencies must be in same project' });
    }

    const createsCycle = await dependencyWouldCreateCycle(db, taskId, blockedByTaskId);
    if (createsCycle) {
      return res.status(400).json({ error: 'dependency would create a cycle' });
    }

    await db.run(
      'INSERT OR IGNORE INTO task_dependencies(task_id, blocked_by_task_id) VALUES (?, ?)',
      [taskId, blockedByTaskId]
    );

    const deps = await db.all(
      'SELECT task_id, blocked_by_task_id FROM task_dependencies WHERE task_id = ? ORDER BY blocked_by_task_id',
      [taskId]
    );

    return res.status(201).json(deps);
  }));

  app.get('/api/tasks/:taskId/dependencies', asyncHandler(async (req, res) => {
    const taskId = toInt(req.params.taskId);
    if (taskId === null) return res.status(400).json({ error: 'invalid taskId' });

    const deps = await db.all(
      `SELECT td.task_id, td.blocked_by_task_id, t.title AS blocked_by_title
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.blocked_by_task_id
       WHERE td.task_id = ?
       ORDER BY td.blocked_by_task_id`,
      [taskId]
    );

    return res.json(deps);
  }));

  app.post('/api/projects/:projectId/ai-plan/preview', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    const { requirement, startDay = 1, startDate = null, skipWeekends = false } = req.body;
    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });
    if (!requirement) return res.status(400).json({ error: 'requirement is required' });

    const normalizedMembers = await loadMembersWithSkills(db);

    const candidateTasks = splitRequirementToTasks(requirement);
    const planned = planSchedule(candidateTasks, normalizedMembers, Number(startDay) || 1, {
      startDate,
      skipWeekends: Boolean(skipWeekends)
    });

    return res.json(planned);
  }));

  app.post('/api/projects/:projectId/ai-plan', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    const {
      requirement,
      clearExisting = false,
      startDay = 1,
      startDate = null,
      skipWeekends = false
    } = req.body;

    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });
    if (!requirement) return res.status(400).json({ error: 'requirement is required' });

    if (clearExisting) {
      await db.run('DELETE FROM tasks WHERE project_id = ?', [projectId]);
    }

    const normalizedMembers = await loadMembersWithSkills(db);

    const candidateTasks = splitRequirementToTasks(requirement);
    const planned = planSchedule(candidateTasks, normalizedMembers, Number(startDay) || 1, {
      startDate,
      skipWeekends: Boolean(skipWeekends)
    });

    for (const task of planned) {
      await db.run(
        `INSERT INTO tasks(project_id, title, description, phase, required_skill, estimate_hours, day_index, day_date, assigned_member_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          task.title,
          task.description,
          task.phase,
          task.requiredSkill,
          task.estimateHours,
          task.dayIndex,
          task.dayDate,
          task.assignedMemberId
        ]
      );
    }

    const saved = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY day_index, id', [projectId]);
    return res.status(201).json(saved);
  }));


  app.get('/api/projects/:projectId/critical-path', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });

    const tasks = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY id', [projectId]);
    const deps = await db.all(
      `SELECT td.task_id, td.blocked_by_task_id
       FROM task_dependencies td
       JOIN tasks t ON t.id = td.task_id
       WHERE t.project_id = ?`,
      [projectId]
    );

    const analysis = analyzeTaskGraph(tasks, deps);
    if (analysis.hasCycle) {
      return res.status(400).json({ error: 'project dependency graph has cycle' });
    }

    const criticalTasks = analysis.criticalPathTaskIds.map((id) => tasks.find((t) => t.id === id));
    return res.json({
      projectId,
      topologicalOrder: analysis.topologicalOrder,
      criticalPathTaskIds: analysis.criticalPathTaskIds,
      criticalPathTotalHours: analysis.criticalPathTotalHours,
      criticalTasks
    });
  }));

  app.post('/api/projects/:projectId/replan', asyncHandler(async (req, res) => {
    const projectId = toInt(req.params.projectId);
    const {
      startDay = 1,
      startDate = null,
      skipWeekends = false,
      statuses = ['todo', 'in_progress']
    } = req.body;

    if (projectId === null) return res.status(400).json({ error: 'invalid projectId' });

    const list = Array.isArray(statuses) && statuses.length ? statuses : ['todo', 'in_progress'];
    const placeholders = list.map(() => '?').join(',');
    const taskRows = await db.all(
      `SELECT * FROM tasks WHERE project_id = ? AND status IN (${placeholders}) ORDER BY id`,
      [projectId, ...list]
    );

    const normalizedMembers = await loadMembersWithSkills(db);
    const planningInput = taskRows.map((task) => ({
      title: task.title,
      description: task.description,
      phase: task.phase,
      requiredSkill: task.required_skill || 'nodejs',
      estimateHours: task.estimate_hours
    }));

    const planned = planSchedule(planningInput, normalizedMembers, Number(startDay) || 1, {
      startDate,
      skipWeekends: Boolean(skipWeekends)
    });

    for (let i = 0; i < planned.length; i += 1) {
      const targetTask = taskRows[i];
      const ptask = planned[i];
      await db.run(
        `UPDATE tasks SET day_index = ?, day_date = ?, assigned_member_id = ? WHERE id = ?`,
        [ptask.dayIndex, ptask.dayDate, ptask.assignedMemberId, targetTask.id]
      );
    }

    const saved = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY day_index, id', [projectId]);
    return res.json(saved);
  }));

  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: 'internal error', detail: err.message });
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

module.exports = { createServer, dependencyWouldCreateCycle };
