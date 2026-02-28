/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mac-blue': '#007AFF',
        'mac-green': '#34C759',
        'mac-red': '#FF3B30',
        'mac-orange': '#FF9500',
        'mac-yellow': '#FFCC00',
        'mac-purple': '#AF52DE',
        'mac-gray': {
          50: '#F5F5F7',
          100: '#E8E8ED',
          200: '#D2D2D7',
          300: '#AEAEB2',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#3A3A3C',
          800: '#2C2C2E',
          900: '#1C1C1E',
        }
      },
      fontFamily: {
        'sf': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'mac': '0 0 0 0.5px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.1)',
        'mac-lg': '0 0 0 0.5px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        'macos': '10px',
      }
    },
  },
  plugins: [],
}
