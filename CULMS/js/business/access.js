export const ROLE_HOME = { Student: 'student.html', Professor: 'professor.html', Librarian: 'librarian.html', Administrator: 'admin.html' };
const PUBLIC = new Set(['index.html', 'service.html', 'about.html', 'contact.html', 'login.html', 'books.html', 'book.html']);
const ROLE_PAGES = { Student: new Set(['student.html']), Professor: new Set(['professor.html']), Librarian: new Set(['librarian.html']), Administrator: new Set(['admin.html']) };
export function canAccess(user, allowedRoles) { return !!user && (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).includes(user.role); }
export function safeNextUrl(next, user) {
  const value = typeof next === 'string' ? next : '';
  if (/[\\]/.test(value) || /%2f|%5c|%00/i.test(value) || value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return ROLE_HOME[user?.role] || 'index.html';
  const match = value.match(/^([a-z0-9-]+\.html)(?:\?[^#]*)?$/i);
  const filename = match?.[1];
  const allowed = new Set([...PUBLIC, ...(ROLE_PAGES[user?.role] || [])]);
  return filename && allowed.has(filename) ? value : (ROLE_HOME[user?.role] || 'index.html');
}
