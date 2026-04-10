/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        primaryLight: 'var(--primary-light)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        border: 'var(--border)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
      },
      borderRadius: {
        brand: 'var(--radius)',
      },
      spacing: {
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
      },
      maxWidth: {
        wide: 'var(--container-wide)',
        admin: 'var(--container-admin)',
        client: 'var(--container-client)',
      },
    },
  },
  plugins: [],
};

