/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#2563eb', // Royal Blue
        secondary: '#475569', // Slate 600
        success: '#10b981', // Emerald 500
        warning: '#f59e0b', // Amber 500
        danger: '#ef4444', // Red 500
        metal: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          100: '#f1f5f9',
        }
      },
      backgroundImage: {
        'metallic-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        'metallic-blue': 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        'glass': 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
      }
    }
  },
  plugins: [],
}
