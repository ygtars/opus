function toEstimateHours(task) {
  const raw = task.estimate_hours ?? task.estimateHours ?? 0;
  return Math.max(0, Number(raw) || 0);
}

function analyzeTaskGraph(tasks, dependencies) {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const indegree = new Map();
  const outgoing = new Map();
  const incoming = new Map();

  for (const task of tasks) {
    indegree.set(task.id, 0);
    outgoing.set(task.id, []);
    incoming.set(task.id, []);
  }

  for (const dep of dependencies) {
    const taskId = dep.task_id ?? dep.taskId;
    const blockerId = dep.blocked_by_task_id ?? dep.blockedByTaskId;
    if (!taskById.has(taskId) || !taskById.has(blockerId)) continue;

    outgoing.get(blockerId).push(taskId);
    incoming.get(taskId).push(blockerId);
    indegree.set(taskId, indegree.get(taskId) + 1);
  }

  const queue = [];
  for (const [id, deg] of indegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder = [];
  while (queue.length) {
    const id = queue.shift();
    topoOrder.push(id);

    for (const next of outgoing.get(id) || []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }

  if (topoOrder.length !== tasks.length) {
    return { hasCycle: true, topologicalOrder: [], criticalPathTaskIds: [], criticalPathTotalHours: 0 };
  }

  const longest = new Map();
  const parent = new Map();

  for (const id of topoOrder) {
    const preds = incoming.get(id) || [];
    const selfHours = toEstimateHours(taskById.get(id));

    if (!preds.length) {
      longest.set(id, selfHours);
      parent.set(id, null);
      continue;
    }

    let bestPred = preds[0];
    let bestDist = longest.get(bestPred) ?? 0;

    for (const pred of preds.slice(1)) {
      const d = longest.get(pred) ?? 0;
      if (d > bestDist) {
        bestDist = d;
        bestPred = pred;
      }
    }

    longest.set(id, bestDist + selfHours);
    parent.set(id, bestPred);
  }

  let endId = topoOrder[0] ?? null;
  for (const id of topoOrder) {
    if ((longest.get(id) ?? 0) > (longest.get(endId) ?? 0)) endId = id;
  }

  const criticalPathTaskIds = [];
  let cursor = endId;
  while (cursor !== null && cursor !== undefined) {
    criticalPathTaskIds.push(cursor);
    cursor = parent.get(cursor) ?? null;
  }
  criticalPathTaskIds.reverse();

  return {
    hasCycle: false,
    topologicalOrder: topoOrder,
    criticalPathTaskIds,
    criticalPathTotalHours: longest.get(endId) ?? 0
  };
}

module.exports = {
  analyzeTaskGraph
};
