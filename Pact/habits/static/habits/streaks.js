function getStatusClass(status) {
  // Three states only: Pact's per-day data is binary (counted / awaiting
  // verification / nothing), so rejected, expired and empty days all share
  // the "none" swatch rather than implying intensity levels.
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'verified') return 'status-verified';
  if (normalized === 'pending') return 'status-pending';
  return 'status-none';
}

function getStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'verified') return 'Verified';
  if (normalized === 'pending') return 'Pending verification';
  return 'No check-in';
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
    // The API pads the current week out to Saturday with in_range=false
    // cells for future dates; skipping them keeps the trailing column short,
    // the way contribution grids look mid-week.
    if (day.in_range === false) {
      return;
    }
    const cell = document.createElement('div');
    cell.className = `heatmap-cell ${getStatusClass(day.status)}`;
    const label = `${formatDateLabel(day.date)}: ${getStatusLabel(day.status)}`;
    cell.title = label;
    cell.setAttribute('aria-label', label);
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
