/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef1f8',
          100: '#dbe1f0',
          200: '#b0bde0',
          300: '#8496cc',
          400: '#4a5a99',
          500: '#243874',
          600: '#182a5e',
          700: '#141f4d',
          800: '#101a40',
          900: '#0f1f4d',
          950: '#0a1230',
        },
        lime: {
          50: '#f8fbe0',
          100: '#eef5b8',
          200: '#dfeb85',
          300: '#cddf4d',
          400: '#c4d600',
          500: '#aebd00',
          600: '#8f9c00',
          700: '#6f7a00',
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
