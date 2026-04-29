/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1730',
        slate: '#475569',
        brand: '#4F46E5',
        cyan: '#06B6D4',
        violet: '#7C3AED'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        glow: '0 10px 40px rgba(79, 70, 229, 0.25)'
      }
    }
  },
  plugins: []
}
