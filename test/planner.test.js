const test = require('node:test');
const assert = require('node:assert/strict');
const {
  inferSkill,
  splitRequirementToTasks,
  planSchedule,
  mapDayIndexToDate
} = require('../src/services/planner');

test('inferSkill should detect common keywords', () => {
  assert.equal(inferSkill('Backend auth API'), 'nodejs');
  assert.equal(inferSkill('CRUD rapor ekranı'), 'sql');
});

test('splitRequirementToTasks should produce non-empty task list', () => {
  const tasks = splitRequirementToTasks('backend api, frontend ekran, test');
  assert.ok(tasks.length >= 3);
  assert.equal(tasks[0].phase, 'Faz-1 Core');
});

test('planSchedule should assign by skill when possible', () => {
  const tasks = [
    { title: 'API', requiredSkill: 'nodejs', estimateHours: 4 },
    { title: 'UI', requiredSkill: 'react', estimateHours: 4 }
  ];

  const members = [
    { id: 1, capacityHoursPerDay: 6, skills: [{ name: 'nodejs' }] },
    { id: 2, capacityHoursPerDay: 6, skills: [{ name: 'react' }] }
  ];

  const planned = planSchedule(tasks, members, 1);

  assert.equal(planned[0].assignedMemberId, 1);
  assert.equal(planned[1].assignedMemberId, 2);
  assert.equal(planned[0].dayIndex, 1);
  assert.equal(planned[1].dayIndex, 1);
});

test('planSchedule should keep assigning unknown skill tasks to least loaded member', () => {
  const tasks = [
    { title: 'Task-1', requiredSkill: 'go', estimateHours: 5 },
    { title: 'Task-2', requiredSkill: 'go', estimateHours: 2 }
  ];

  const members = [
    { id: 1, capacityHoursPerDay: 8, skills: [{ name: 'nodejs' }] },
    { id: 2, capacityHoursPerDay: 8, skills: [{ name: 'react' }] }
  ];

  const planned = planSchedule(tasks, members, 1);

  assert.equal(planned[0].assignedMemberId, 1);
  assert.equal(planned[1].assignedMemberId, 2);
});

test('planSchedule should continue scheduling on following day when backlog grows', () => {
  const tasks = [
    { title: 'API-1', requiredSkill: 'nodejs', estimateHours: 5 },
    { title: 'API-2', requiredSkill: 'nodejs', estimateHours: 4 },
    { title: 'API-3', requiredSkill: 'nodejs', estimateHours: 3 }
  ];

  const members = [{ id: 1, capacityHoursPerDay: 8, skills: [{ name: 'nodejs' }] }];
  const planned = planSchedule(tasks, members, 1);

  assert.equal(planned[0].dayIndex, 1);
  assert.equal(planned[1].dayIndex, 1);
  assert.equal(planned[2].dayIndex, 2);
});

test('mapDayIndexToDate should skip weekends when enabled', () => {
  // 2026-03-06 is Friday
  assert.equal(mapDayIndexToDate(1, '2026-03-06', true), '2026-03-06');
  assert.equal(mapDayIndexToDate(2, '2026-03-06', true), '2026-03-09');
});

test('planSchedule should include dayDate with weekend skipping', () => {
  const tasks = [
    { title: 'A', requiredSkill: 'nodejs', estimateHours: 8 },
    { title: 'B', requiredSkill: 'nodejs', estimateHours: 8 }
  ];
  const members = [{ id: 1, capacityHoursPerDay: 8, skills: [{ name: 'nodejs' }] }];

  const planned = planSchedule(tasks, members, 1, { startDate: '2026-03-06', skipWeekends: true });
  assert.equal(planned[0].dayDate, '2026-03-06');
  assert.equal(planned[1].dayDate, '2026-03-09');
});
