/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'corama-dark': '#0b2c48',
        'corama-darker': '#0a3f68',
        'corama-teal': '#6bb4b5',
        'corama-teal-light': '#98c9ca',
        'corama-teal-dark': '#144e80',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
