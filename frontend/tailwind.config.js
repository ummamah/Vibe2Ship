/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0806',
          surface: '#14100d',
          elevated: '#1c1612',
          border: '#2d241e',
          hover: '#3a2e26',
        },
        primary: {
          DEFAULT: '#d97706',
          hover: '#b45309',
          light: '#fbbf24',
        },
        accent: {
          purple: '#92400e',
          pink: '#b45309',
          cyan: '#d97706',
        },
        earth: {
          500: '#8b5a2b',
          600: '#6b4423',
          700: '#5c3a1e',
        }
      },
backgroundImage: {
        'Gradient-dark': 'linear-gradient(to bottom right, #0a0806, #14100d)',
        'Gradient-primary': 'linear-gradient(to right, #d97706, #fbbf24)',
        'Gradient-accent': 'linear-gradient(to right, #8b5a2b, #d97706)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(217, 119, 6, 0.25)',
        'glow-lg': '0 0 40px rgba(217, 119, 6, 0.35)',
        'outline-orange': '0 0 0 2px rgba(217, 119, 6, 0.5)',
      }
    },
  },
  plugins: [],
}
