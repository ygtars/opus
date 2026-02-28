const KEYWORD_SKILLS = [
  { keyword: 'backend', skill: 'nodejs' },
  { keyword: 'api', skill: 'nodejs' },
  { keyword: 'crud', skill: 'sql' },
  { keyword: 'frontend', skill: 'react' },
  { keyword: 'auth', skill: 'nodejs' },
  { keyword: 'test', skill: 'qa' },
  { keyword: 'rapor', skill: 'sql' }
];

function inferSkill(text) {
  const lower = text.toLowerCase();
  const match = KEYWORD_SKILLS.find((item) => lower.includes(item.keyword));
  return match ? match.skill : 'nodejs';
}

function splitRequirementToTasks(requirement) {
  const parts = requirement
    .split(/[\n,.;+]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const raw = parts.length ? parts : ['Proje setup', requirement, 'Test ve dokümantasyon'];

  return raw.map((title, idx) => ({
    title,
    description: `AI üretti: ${title}`,
    phase: idx <= 1 ? 'Faz-1 Core' : idx <= 3 ? 'Faz-2 Geliştirme' : 'Faz-3 Stabilizasyon',
    requiredSkill: inferSkill(title),
    estimateHours: 4 + (idx % 3) * 2
  }));
}

function chooseMemberForTask(task, members) {
  if (!members.length) return null;

  const bySkill = members.filter((member) =>
    member.skills.some((skill) => skill.name.toLowerCase() === task.requiredSkill.toLowerCase())
  );

  if (bySkill.length) {
    return bySkill.sort((a, b) => a.currentLoad - b.currentLoad)[0];
  }

  return [...members].sort((a, b) => a.currentLoad - b.currentLoad)[0];
}

function planSchedule(tasks, members, startDay = 1) {
  const working = members.map((m) => ({ ...m, currentLoad: 0 }));

  return tasks.map((task, idx) => {
    const selected = chooseMemberForTask(task, working);
    if (selected) {
      selected.currentLoad += task.estimateHours;
    }

    return {
      ...task,
      dayIndex: startDay + idx,
      assignedMemberId: selected ? selected.id : null
    };
  });
}

module.exports = {
  inferSkill,
  splitRequirementToTasks,
  planSchedule
};
