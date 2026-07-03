function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'verified') return 'status-verified';
  if (normalized === 'pending') return 'status-pending';
  if (normalized === 'rejected') return 'status-rejected';
  if (normalized === 'expired') return 'status-expired';
  return 'status-none';
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function renderHeatmap(container, days) {
  container.innerHTML = '';

  days.forEach((day) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `heatmap-cell ${getStatusClass(day.status)}`;
    cell.title = `${formatDateLabel(day.date)}: ${day.status.replace('_', ' ')}`;
    cell.setAttribute('aria-label', cell.title);
    container.appendChild(cell);
  });
}

async function loadHeatmap() {
  const summaryEl = document.getElementById('streak-summary');
  const grid = document.getElementById('heatmap-grid');
  if (!summaryEl || !grid) {
    return;
  }

  const response = await fetch(summaryEl.dataset.apiUrl, {
    headers: { 'Accept': 'application/json' },
  });
  const data = await response.json();

  const currentEl = summaryEl.querySelector('[data-streak-current]');
  const longestEl = summaryEl.querySelector('[data-streak-longest]');
  if (currentEl) currentEl.textContent = data.pact.current_streak;
  if (longestEl) longestEl.textContent = data.pact.longest_streak;

  renderHeatmap(grid, data.days || []);
}

document.addEventListener('DOMContentLoaded', () => {
  loadHeatmap().catch(() => {
    const grid = document.getElementById('heatmap-grid');
    if (grid) {
      grid.innerHTML = '<div class="text-muted">Unable to load heatmap.</div>';
    }
  });
});
