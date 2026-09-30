import { culms, getSession, clearSession } from './app.js';
import { canAccess, ROLE_HOME } from '../business/access.js';
import { showToast } from './ui/toast.js';
export function currentUser() {
  const session = getSession();
  if (!session) return null;
  const result = culms.auth.resolve(session.id, session.role);
  if (!result.ok) { clearSession(); return null; }
  return result.data;
}
export function requireRole(allowedRoles) {
  const main = document.querySelector('main');
  if (main) main.classList.add('d-none');
  const user = currentUser();
  if (!user) { window.location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() || 'index.html')}`; return null; }
  if (!canAccess(user, allowedRoles)) { showToast('You do not have access to that page.', 'warning'); window.location.href = ROLE_HOME[user.role] || 'index.html'; return null; }
  if (main) main.classList.remove('d-none');
  return user;
}
