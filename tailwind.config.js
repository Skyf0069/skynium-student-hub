/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- C'EST CETTE LIGNE QUI MANQUAIT PEUT-ÊTRE
  theme: {
    extend: {
      colors: {
        skynium: {
          primary: '#1D0469',   // Ton violet dominant
          secondary: '#FA5DFF', // Ton rose fluo
          tertiary: '#FF8A3F',  // Ton orange
          
          dark: '#0d012e',      // Le fond global très sombre
          card: '#15034d',      // Le fond des cartes (légèrement plus clair)
          light: '#F8FAFC',     // Le fond clair (blanc cassé)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}