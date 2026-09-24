import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle color theme"
      title="Switch theme"
    >
      <img
        src="/icons/circle-half-stroke-solid-full.svg"
        alt=""
        aria-hidden="true"
        className="theme-toggle__icon"
      />
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
