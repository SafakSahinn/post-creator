/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        editorial: {
          dark: '#0d0d0f',
          surface: '#141418',
          card: '#1a1a20',
          border: '#282832',
          accent: '#e6c280', // champagne gold accent
          silver: '#a6a7ab',
        }
      }
    },
  },
  plugins: [],
}
