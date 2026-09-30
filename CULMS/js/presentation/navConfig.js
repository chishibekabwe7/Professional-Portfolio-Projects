export const navConfig = {
  Guest: [{ label: 'Home', href: 'index.html', enabled: true }, { label: 'Services', href: 'service.html', enabled: true }, { label: 'About', href: 'about.html', enabled: true }, { label: 'Help Desk', href: 'contact.html', enabled: true }, { label: 'Login', href: 'login.html', enabled: true }],
  Student: [{ label: 'My Dashboard', href: 'student.html', enabled: true }, { label: 'Books', href: 'books.html', enabled: true }],
  Professor: [{ label: 'My Dashboard', href: 'professor.html', enabled: true }, { label: 'Books', href: 'books.html', enabled: true }],
  Librarian: [{ label: 'Dashboard', href: 'librarian.html', enabled: true }, { label: 'Books', href: 'books.html', enabled: true }],
  Administrator: [{ label: 'Dashboard', href: 'admin.html', enabled: true }, { label: 'Books', href: 'books.html', enabled: true }]
};
export function visibleNav(role, permissions = []) { return (navConfig[role] || navConfig.Guest).filter(item => item.enabled && (!item.permission || permissions.includes(item.permission))); }
