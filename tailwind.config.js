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
        lango: {
          primary:   '#2563eb',
          secondary: '#1d4ed8',
          accent:    '#3b82f6',
          dark:      '#0f2a43',
          light:     '#eff6ff',
          amber:     '#f59e0b',
          navy:      '#0b2238',
        },
        // App canvas behind cards: a touch cooler than gray-50 so white cards lift off it.
        surface: '#f5f7fa',
      },
      fontFamily: {
        // One pairing everywhere: Sora for headings, Inter for everything else.
        sans:    ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 42 67 / 0.04), 0 1px 3px 0 rgb(15 42 67 / 0.05)',
        'card-hover': '0 4px 12px -2px rgb(15 42 67 / 0.08), 0 2px 4px -2px rgb(15 42 67 / 0.05)',
        pop: '0 12px 32px -8px rgb(15 42 67 / 0.18), 0 4px 8px -4px rgb(15 42 67 / 0.08)',
      },
    },
  },
  plugins: [],
}
