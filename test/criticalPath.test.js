const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeTaskGraph } = require('../src/services/criticalPath');

test('analyzeTaskGraph should compute longest dependency chain', () => {
  const tasks = [
    { id: 1, estimate_hours: 3 },
    { id: 2, estimate_hours: 4 },
    { id: 3, estimate_hours: 2 },
    { id: 4, estimate_hours: 1 }
  ];

  const deps = [
    { task_id: 2, blocked_by_task_id: 1 },
    { task_id: 3, blocked_by_task_id: 2 }
  ];

  const result = analyzeTaskGraph(tasks, deps);
  assert.equal(result.hasCycle, false);
  assert.deepEqual(result.criticalPathTaskIds, [1, 2, 3]);
  assert.equal(result.criticalPathTotalHours, 9);
});

test('analyzeTaskGraph should detect cycle', () => {
  const tasks = [
    { id: 1, estimate_hours: 2 },
    { id: 2, estimate_hours: 2 }
  ];

  const deps = [
    { task_id: 1, blocked_by_task_id: 2 },
    { task_id: 2, blocked_by_task_id: 1 }
  ];

  const result = analyzeTaskGraph(tasks, deps);
  assert.equal(result.hasCycle, true);
});
