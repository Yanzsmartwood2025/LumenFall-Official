/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0A0B0F',
        ember: '#E8A33D',
        'ember-dim': '#6B4A22',
        mist: '#AEB4C2',
        blood: '#6E2A2A',
      },
      fontFamily: {
        display: ['Spectral', 'serif'],
        ui: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        ember: '0 0 40px 4px rgba(232, 163, 61, 0.25)',
      },
    },
  },
  plugins: [],
};
