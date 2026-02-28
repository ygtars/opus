const state = {
  activeProjectId: 1,
  timerSeconds: 0,
  timerRef: null
};

const $ = (id) => document.getElementById(id);

async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

function renderTimer() {
  const hh = String(Math.floor(state.timerSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((state.timerSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(state.timerSeconds % 60).padStart(2, '0');
  $('timer').textContent = `${hh}:${mm}:${ss}`;
}

async function refreshMembers() {
  const members = await api('/api/members');
  $('memberList').innerHTML = members
    .map((m) => `<li>#${m.id} ${m.full_name} (${m.role}) · ${m.capacity_hours_per_day}s/gün</li>`)
    .join('');
}

async function refreshTasks() {
  const tasks = await api(`/api/projects/${state.activeProjectId}/tasks`);
  $('taskList').innerHTML = tasks
    .map((t) => `<li>#${t.id} [${t.phase}] ${t.title}<br/>${t.day_date || '-'} (day ${t.day_index}) · ${t.status}</li>`)
    .join('');
}

function formPlanningPayload() {
  return {
    requirement: $('requirement').value,
    startDay: Number($('startDay').value || 1),
    startDate: $('startDate').value || null,
    skipWeekends: $('skipWeekends').checked,
    clearExisting: true
  };
}

async function boot() {
  try {
    const health = await api('/health');
    $('healthBadge').textContent = health.ok ? 'API hazır' : 'API sorunlu';
  } catch {
    $('healthBadge').textContent = 'API erişilemiyor';
  }

  $('createOrgBtn').onclick = async () => {
    const org = await api('/api/organizations', 'POST', { name: $('orgName').value });
    $('planOutput').textContent = `Organization oluşturuldu: #${org.id}`;
  };

  $('createProjectBtn').onclick = async () => {
    const project = await api('/api/projects', 'POST', {
      organizationId: 1,
      name: $('projectName').value,
      description: $('projectDesc').value
    });
    state.activeProjectId = project.id;
    $('planOutput').textContent = `Aktif proje #${project.id}: ${project.name}`;
    await refreshTasks();
  };

  $('addMemberBtn').onclick = async () => {
    await api('/api/members', 'POST', {
      organizationId: 1,
      fullName: $('memberName').value,
      role: $('memberRole').value,
      capacityHoursPerDay: Number($('memberCapacity').value || 6)
    });
    await refreshMembers();
  };

  $('addSkillBtn').onclick = async () => {
    await api(`/api/members/${Number($('skillMemberId').value)}/skills`, 'POST', {
      skillName: $('skillName').value,
      level: 'mid'
    });
    $('planOutput').textContent = 'Skill atandı';
  };

  $('previewBtn').onclick = async () => {
    const planned = await api(`/api/projects/${state.activeProjectId}/ai-plan/preview`, 'POST', formPlanningPayload());
    $('planOutput').textContent = JSON.stringify(planned, null, 2);
  };

  $('savePlanBtn').onclick = async () => {
    await api(`/api/projects/${state.activeProjectId}/ai-plan`, 'POST', formPlanningPayload());
    await refreshTasks();
    $('planOutput').textContent = 'Plan kaydedildi';
  };

  $('startTimerBtn').onclick = () => {
    if (state.timerRef) return;
    state.timerRef = setInterval(() => {
      state.timerSeconds += 1;
      renderTimer();
    }, 1000);
  };

  $('stopTimerBtn').onclick = () => {
    if (state.timerRef) clearInterval(state.timerRef);
    state.timerRef = null;
  };

  $('resetTimerBtn').onclick = () => {
    state.timerSeconds = 0;
    renderTimer();
  };

  renderTimer();
  await refreshMembers().catch(() => {});
  await refreshTasks().catch(() => {});
}

boot();
