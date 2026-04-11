/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { arabic: ['Tajawal', 'Almarai', 'sans-serif'] },
      colors: {
        gold:  { DEFAULT: '#B8860B', light: '#FFD700' },
        'green-custom': { DEFAULT: '#228B22', light: '#90EE90', xlight: '#F0FFF0' },
      },
    },
  },
  plugins: [],
}
