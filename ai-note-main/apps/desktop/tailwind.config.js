/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#f8f9fa',
          dark: '#1e1e2e'
        },
        editor: {
          DEFAULT: '#ffffff',
          dark: '#1e1e1e'
        }
      }
    }
  },
  plugins: []
}
