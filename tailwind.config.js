/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ["Lexend", "sans-serif"],
        body: ["Noto Sans", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#2b6cee",
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        "background-light": "#f6f6f8",
        "background-dark": "#101622",
        "surface-dark": "#192233", 
        "card-dark": "#1a2230",
        "border-dark": "#324467",
        "text-secondary": "#92a4c9",
        "accent-blue": "#3b82f6",
      }
    },
  },
  plugins: [],
}