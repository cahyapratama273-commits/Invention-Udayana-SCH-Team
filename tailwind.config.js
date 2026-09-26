/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./artikel/**/*.html",
    "./component/**/*.html",
    "./js/**/*.js",
    "./data/**/*.json"
  ],
  theme: {
    extend: {
      colors: {
        teduh: {
          dark: '#0D1220',
          card: '#151B2E',
          accent: '#2DD4A8',
          text: '#F5F5F5',
          muted: '#8A93A8'
        }
      }
    },
  },
  plugins: [],
}