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

  const pool = bySkill.length ? bySkill : members;
  return [...pool].sort((a, b) => a.totalAssignedHours - b.totalAssignedHours)[0];
}

function estimateDayIndex(totalAssignedHours, capacityHoursPerDay, startDay) {
  const safeCapacity = Math.max(1, Number(capacityHoursPerDay) || 6);
  const dayOffset = Math.floor(totalAssignedHours / safeCapacity);
  return startDay + dayOffset;
}

function mapDayIndexToDate(dayIndex, startDate, skipWeekends) {
  if (!startDate) return null;

  const current = new Date(startDate);
  if (Number.isNaN(current.getTime())) return null;

  let daysToAdvance = Math.max(0, dayIndex - 1);
  while (daysToAdvance > 0) {
    current.setDate(current.getDate() + 1);
    if (skipWeekends && (current.getDay() === 0 || current.getDay() === 6)) continue;
    daysToAdvance -= 1;
  }

  if (skipWeekends) {
    while (current.getDay() === 0 || current.getDay() === 6) {
      current.setDate(current.getDate() + 1);
    }
  }

  return current.toISOString().slice(0, 10);
}

function planSchedule(tasks, members, startDay = 1, options = {}) {
  const { startDate = null, skipWeekends = false } = options;
  const working = members.map((m) => ({
    ...m,
    capacityHoursPerDay: Math.max(1, Number(m.capacityHoursPerDay) || 6),
    totalAssignedHours: 0
  }));

  return tasks.map((task) => {
    const selected = chooseMemberForTask(task, working);
    if (!selected) {
      const dayDate = mapDayIndexToDate(startDay, startDate, skipWeekends);
      return {
        ...task,
        dayIndex: startDay,
        dayDate,
        assignedMemberId: null
      };
    }

    const dayIndex = estimateDayIndex(selected.totalAssignedHours, selected.capacityHoursPerDay, startDay);
    const dayDate = mapDayIndexToDate(dayIndex, startDate, skipWeekends);
    selected.totalAssignedHours += task.estimateHours;

    return {
      ...task,
      dayIndex,
      dayDate,
      assignedMemberId: selected.id
    };
  });
}

module.exports = {
  inferSkill,
  splitRequirementToTasks,
  planSchedule,
  mapDayIndexToDate
};
