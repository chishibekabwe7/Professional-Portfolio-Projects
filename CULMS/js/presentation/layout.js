import { culms, getSession, clearSession } from './app.js';
import { visibleNav } from './navConfig.js';
import { currentUser } from './guard.js';
import { showToast } from './ui/toast.js';
import { escapeHtml } from './ui/render.js';
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
function renderHeader() {
  const user = currentUser(); const links = visibleNav(user?.role || 'Guest', user?.permissions || []).map(item => `<a href="${item.href}" class="nav-item nav-link${currentPage === item.href ? ' active' : ''}">${item.label}</a>`).join('');
  const account = user ? `<div class="nav-item dropdown"><a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">${escapeHtml(user.name)}</a><div class="dropdown-menu m-0"><span class="dropdown-item-text">${escapeHtml(user.role)}<br>${escapeHtml(user.campus)}</span><a href="account.html" class="dropdown-item">Account</a><a href="#" class="dropdown-item" id="culms-logout">Logout</a></div></div><div class="nav-item dropdown"><a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"><i class="fa fa-bell"></i><span id="culms-unread" class="badge bg-danger ms-1"></span></a><div class="dropdown-menu dropdown-menu-end m-0" id="culms-notifications"></div></div>` : '';
  document.querySelector('#site-header').innerHTML = `<div class="container-fluid position-relative p-0"><nav class="navbar navbar-expand-lg navbar-dark px-5 py-3 py-lg-0"><a href="index.html" class="navbar-brand p-0"><h1 class="m-0"><i class="fa fa-book me-2"></i>CULMS</h1></a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"><span class="fa fa-bars"></span></button><div class="collapse navbar-collapse" id="navbarCollapse"><div class="navbar-nav ms-auto py-0">${links}${account}</div></div></nav></div>`;
  document.querySelector('#culms-logout')?.addEventListener('click', event => { event.preventDefault(); clearSession(); window.location.href = 'index.html'; });
  refreshNotifications(user);
}
function refreshNotifications(user) {
  if (!user) return; const items = culms.notifications.getForUser(user.id).data.slice(-5).reverse(); const unread = culms.notifications.unreadCount(user.id).data;
  const badge = document.querySelector('#culms-unread'); if (badge) { badge.textContent = unread; badge.classList.toggle('d-none', unread === 0); }
  const menu = document.querySelector('#culms-notifications'); if (menu) { menu.innerHTML = `${items.map(item => `<span class="dropdown-item-text${item.read ? '' : ' fw-bold'}">${escapeHtml(item.message)}</span>`).join('')}<a href="#" class="dropdown-item" id="culms-mark-read">Mark all as read</a>`; menu.querySelector('#culms-mark-read')?.addEventListener('click', e => { e.preventDefault(); culms.notifications.markAllRead(user.id); refreshNotifications(user); }); }
}
function renderFooter() { document.querySelector('#site-footer').innerHTML = `<div class="container-fluid bg-dark text-light mt-5 wow fadeInUp"><div class="container"><div class="row gx-5"><div class="col-lg-4 col-md-6 footer-about"><div class="d-flex flex-column align-items-center justify-content-center text-center h-100 bg-primary p-4"><a href="index.html" class="navbar-brand"><h1 class="m-0 text-white"><i class="fa fa-book me-2"></i>CULMS</h1></a><p class="mt-3 mb-0">Copperbelt University Library connects students, professors and researchers with knowledge, resources and support across the university.</p></div></div></div></div></div><div class="container-fluid text-white" style="background: #061429;"><div class="container text-center"><p class="mb-0 py-4">&copy; <a class="text-white border-bottom" href="index.html">Copperbelt University Library</a>. All Rights Reserved. Designed by <a class="text-white border-bottom" href="https://htmlcodex.com">HTML Codex</a></p></div></div>`; }
export function renderSharedLayout() { renderHeader(); renderFooter(); }
renderSharedLayout();
document.addEventListener('culms:changed', () => renderHeader());
