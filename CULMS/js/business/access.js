export const ROLE_HOME = { Student: 'student.html', Professor: 'professor.html', Librarian: 'librarian.html', Administrator: 'admin.html' };
const PUBLIC = new Set(['index.html', 'service.html', 'about.html', 'contact.html', 'login.html', 'books.html', 'book.html']);
const ROLE_PAGES = { Student: new Set(['student.html', 'account.html', 'my-loans.html', 'my-reservations.html']), Professor: new Set(['professor.html', 'account.html', 'my-loans.html', 'my-reservations.html']), Librarian: new Set(['librarian.html', 'account.html']), Administrator: new Set(['admin.html', 'account.html']) };
export function isSessionExpired(startedAt, now = Date.now(), maxHours = 8) { const start = new Date(startedAt).getTime(); const current = now instanceof Date ? now.getTime() : new Date(now).getTime(); return !Number.isFinite(start) || !Number.isFinite(current) || current - start >= maxHours * 60 * 60 * 1000; }
export function canAccess(user, allowedRoles) { return !!user && (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).includes(user.role); }
export function safeNextUrl(next, user) {
  const value = typeof next === 'string' ? next : '';
  if (/[\\]/.test(value) || /%2f|%5c|%00/i.test(value) || value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return ROLE_HOME[user?.role] || 'index.html';
  const match = value.match(/^([a-z0-9-]+\.html)(?:\?[^#]*)?$/i);
  const filename = match?.[1];
  const allowed = new Set([...PUBLIC, ...(ROLE_PAGES[user?.role] || [])]);
  return filename && allowed.has(filename) ? value : (ROLE_HOME[user?.role] || 'index.html');
}
