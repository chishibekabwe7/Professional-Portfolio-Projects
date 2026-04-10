import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

type NavbarTab = {
  key: string;
  label: string;
  icon: IconProp;
};

type ResponsiveNavbarProps = {
  brand: string;
  subtitle: string;
  userLabel?: string;
  roleLabel?: string;
  tabs: NavbarTab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  onLogout: () => void;
};

/**
 * Shared responsive navbar used by dashboard screens.
 * On small screens, actions and tabs collapse behind a hamburger menu.
 */
export default function ResponsiveNavbar({
  brand,
  subtitle,
  userLabel,
  roleLabel = '',
  tabs,
  activeTab,
  onTabChange,
  onLogout,
}: ResponsiveNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [activeTab]);

  return (
    <header className="app-navbar">
      <div className="app-navbar__top">
        <div className="app-navbar__brand-wrap">
          <h1 className="app-navbar__brand">{brand}</h1>
          <p className="app-navbar__subtitle">{subtitle}</p>
        </div>

        <div className="app-navbar__actions app-navbar__actions--desktop">
          <ThemeToggle />
          <span className="app-navbar__user">{userLabel}</span>
          {roleLabel && <span className="app-navbar__role">{roleLabel}</span>}
          <button className="btn btn-dark btn-sm" onClick={onLogout}>Logout</button>
        </div>

        <button
          type="button"
          className={menuOpen ? 'app-navbar__toggle is-open' : 'app-navbar__toggle'}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={menuOpen ? 'app-navbar__menu is-open' : 'app-navbar__menu'}>
        <nav className="app-navbar__tabs" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={activeTab === tab.key ? 'app-navbar__tab is-active' : 'app-navbar__tab'}
            >
              <FontAwesomeIcon icon={tab.icon} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="app-navbar__actions app-navbar__actions--mobile">
          <ThemeToggle />
          <span className="app-navbar__user">{userLabel}</span>
          {roleLabel && <span className="app-navbar__role">{roleLabel}</span>}
          <button className="btn btn-dark btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
