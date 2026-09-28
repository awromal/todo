// State
let currentFilter = '';
let currentSearch = '';

// Elements
const serverStatusText = document.getElementById('server-status-text');
const serverStatusDot = document.querySelector('#server-status .status-dot');
const dbStatusText = document.getElementById('db-status-text');
const tasksList = document.getElementById('tasks-list');
const createForm = document.getElementById('create-task-form');
const searchInput = document.getElementById('search-input');
const filterPills = document.querySelectorAll('.pill');
const statTotal = document.getElementById('stat-total');
const statProgress = document.getElementById('stat-progress');
const statCompleted = document.getElementById('stat-completed');
const statHigh = document.getElementById('stat-high');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  loadStats();
  loadTasks();

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();
    loadTasks();
  });

  // Filter pills handler
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter || '';
      loadTasks();
    });
  });

  // Form submit
  createForm.addEventListener('submit', handleCreateTask);
});

// Check Server and DB Health
async function checkHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();

    if (data.status === 'healthy') {
      serverStatusDot.classList.add('online');
      serverStatusText.textContent = `Online`;

      if (data.database.status === 'connected') {
        dbStatusText.textContent = `MongoDB: Connected`;
      } else {
        dbStatusText.textContent = `Storage: Active`;
      }
    }
  } catch (err) {
    serverStatusDot.classList.remove('online');
    serverStatusText.textContent = 'Offline';
    dbStatusText.textContent = 'Disconnected';
  }
}

// Fetch Aggregated Stats
async function loadStats() {
  try {
    const res = await fetch('/tasks/stats/summary');
    const json = await res.json();
    if (json.success) {
      statTotal.textContent = json.data.total;
      statProgress.textContent = json.data.breakdown['in-progress'] || 0;
      statCompleted.textContent = json.data.breakdown['completed'] || 0;
      statHigh.textContent = json.data.highPriority || 0;
    }
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

// Fetch Tasks
async function loadTasks() {
  try {
    let url = '/tasks?';
    if (currentFilter) url += `status=${encodeURIComponent(currentFilter)}&`;
    if (currentSearch) url += `search=${encodeURIComponent(currentSearch)}&`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tasksList.innerHTML = `
        <div class="empty-state">
          <p>No tasks found.</p>
          <small>Create one using the form on the left!</small>
        </div>
      `;
      return;
    }

    renderTasks(json.data);
  } catch (err) {
    tasksList.innerHTML = `<div class="empty-state text-danger">Failed to fetch tasks: ${err.message}</div>`;
  }
}

// Render Tasks List
function renderTasks(tasks) {
  tasksList.innerHTML = tasks
    .map((task) => {
      const isCompleted = task.status === 'completed';
      const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date';
      const createdDate = new Date(task.createdAt).toLocaleString();

      return `
      <div class="task-card" data-id="${task._id}">
        <div class="task-header">
          <h3 class="task-title ${isCompleted ? 'completed' : ''}">${escapeHtml(task.title)}</h3>
          <div class="task-badges">
            <span class="badge badge-priority-${task.priority}">${task.priority}</span>
            <span class="badge badge-status-${task.status}">${task.status}</span>
          </div>
        </div>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <div class="task-footer">
          <div>
            <span>📅 Due: ${formattedDate}</span>
            <span style="margin-left: 10px;">🕒 ${createdDate}</span>
          </div>
          <div class="task-actions">
            <button class="btn-icon" onclick="cycleStatus('${task._id}', '${task.status}')">
              ${task.status === 'completed' ? '↺ Reopen' : task.status === 'todo' ? '▶ Start' : '✓ Done'}
            </button>
            <button class="btn-icon btn-danger" onclick="deleteTask('${task._id}')">🗑</button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

// Handle Form Submit
async function handleCreateTask(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;

  const payload = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    dueDate: document.getElementById('task-due').value || null,
  };

  try {
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (res.ok) {
      createForm.reset();
      loadTasks();
      loadStats();
    } else {
      alert(`Error creating task: ${json.error || 'Unknown error'}`);
    }
  } catch (err) {
    alert(`Request failed: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

// Cycle Status
async function cycleStatus(id, currentStatus) {
  let nextStatus = 'in-progress';
  if (currentStatus === 'todo') nextStatus = 'in-progress';
  else if (currentStatus === 'in-progress') nextStatus = 'completed';
  else if (currentStatus === 'completed') nextStatus = 'todo';

  try {
    const res = await fetch(`/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.ok) {
      loadTasks();
      loadStats();
    }
  } catch (err) {
    console.error(err);
  }
}

// Delete Task
async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const res = await fetch(`/tasks/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      loadTasks();
      loadStats();
    }
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}
