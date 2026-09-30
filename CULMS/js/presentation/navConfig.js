export const navConfig = {
  Guest: [{ label: 'Home', href: 'index.html', enabled: true }, { label: 'Services', href: 'service.html', enabled: true }, { label: 'About', href: 'about.html', enabled: true }, { label: 'Help Desk', href: 'contact.html', enabled: true }, { label: 'Login', href: 'login.html', enabled: true }],
  Student: [{ label: 'My Dashboard', href: 'student.html', enabled: true }, { label: 'Catalogue', href: 'catalogue.html', enabled: false }],
  Professor: [{ label: 'My Dashboard', href: 'professor.html', enabled: true }, { label: 'Catalogue', href: 'catalogue.html', enabled: false }],
  Librarian: [{ label: 'Dashboard', href: 'librarian.html', enabled: true }, { label: 'Circulation', href: 'circulation.html', enabled: false }],
  Administrator: [{ label: 'Dashboard', href: 'admin.html', enabled: true }, { label: 'Reports', href: 'reports.html', enabled: false }]
};
export function visibleNav(role, permissions = []) { return (navConfig[role] || navConfig.Guest).filter(item => item.enabled && (!item.permission || permissions.includes(item.permission))); }
