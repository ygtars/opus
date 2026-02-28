const test = require('node:test');
const assert = require('node:assert/strict');
const { inferSkill, splitRequirementToTasks, planSchedule } = require('../src/services/planner');

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
    { id: 1, skills: [{ name: 'nodejs' }] },
    { id: 2, skills: [{ name: 'react' }] }
  ];

  const planned = planSchedule(tasks, members, 1);

  assert.equal(planned[0].assignedMemberId, 1);
  assert.equal(planned[1].assignedMemberId, 2);
  assert.equal(planned[0].dayIndex, 1);
  assert.equal(planned[1].dayIndex, 2);
});
