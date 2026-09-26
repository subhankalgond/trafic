/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#06111F',
          800: '#0B1F33',
          700: '#102A44',
          600: '#16344F',
        },
        brand: {
          DEFAULT: '#0EA5E9',
          dark: '#0284C7',
          light: '#7DD3FC',
        },
        traffic: {
          low: '#22C55E',
          moderate: '#FACC15',
          high: '#F97316',
          severe: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
