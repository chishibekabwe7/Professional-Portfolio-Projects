import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.bg-grid-pattern': {
          'background-image': 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          'background-size': '20px 20px',
        },
      })
    }),
  ],
}
