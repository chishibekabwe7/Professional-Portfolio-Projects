let queue = []; let active = false;
function next() {
  if (active || !queue.length) return;
  active = true; const { message, type } = queue.shift();
  let container = document.querySelector('#culms-toast-container');
  if (!container) { container = document.createElement('div'); container.id = 'culms-toast-container'; container.className = 'position-fixed bottom-0 end-0 p-3'; container.style.zIndex = '1100'; document.body.appendChild(container); }
  const toast = document.createElement('div'); toast.className = `toast align-items-center text-white bg-${type || 'info'} border-0`; toast.setAttribute('role', 'alert');
  toast.innerHTML = `<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  toast.querySelector('.toast-body').textContent = message; container.appendChild(toast);
  const instance = window.bootstrap?.Toast.getOrCreateInstance(toast, { delay: 3500 }); instance?.show();
  setTimeout(() => { toast.remove(); active = false; next(); }, 3700);
}
export function showToast(message, type = 'info') { queue.push({ message, type: ['success', 'danger', 'warning', 'info'].includes(type) ? type : 'info' }); next(); }
export function showResultError(result) { if (!result?.ok && result.error?.message) showToast(result.error.message, 'danger'); }
