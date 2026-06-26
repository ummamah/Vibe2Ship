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
          bg: '#020617',
          surface: '#0f172a',
          elevated: '#1e293b',
          border: '#334155',
          hover: '#475569',
        },
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          light: '#60a5fa',
        },
        accent: {
          purple: '#a855f7',
          pink: '#ec4899',
          cyan: '#06b6d4',
        }
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to bottom right, #0f172a, #1e293b)',
        'gradient-primary': 'linear-gradient(to right, #3b82f6, #8b5cf6)',
        'gradient-accent': 'linear-gradient(to right, #ec4899, #a855f7)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
      }
    },
  },
  plugins: [],
}
