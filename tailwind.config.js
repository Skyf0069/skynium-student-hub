/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        skynium: {
          // --- LE THÈME RUBY ---
          primary: '#E0115F',   // Le vrai Rouge RuBY officiel
          secondary: '#FF4D85', // Un rose/rouge vif pour les dégradés et les survols (hovers)
          tertiary: '#FF9B71',  // Un orange chaleureux pour garder du contraste sur les petites icônes
          
          // --- LE MODE SOMBRE RUBY ---
          dark: '#1A050A',      // Un rouge bordeaux/noir abyssal au lieu du violet très sombre
          card: '#2A0813',      // Le fond des cartes (légèrement plus clair pour se détacher du fond)
          
          // --- LE MODE CLAIR ---
          light: '#FCF8F9',     // Un blanc cassé avec une microscopique teinte rouge pour l'harmonie
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}