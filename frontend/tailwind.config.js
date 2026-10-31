/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue:{50:'#F4F0FF',100:'#E9D7FE',200:'#D6BBFB',300:'#B692F6',400:'#A48AFB',500:'#875BF7',600:'#6941C6',700:'#5330A5',800:'#42307D',900:'#101A35',950:'#101A35'},
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb', // primary blue
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#101A35', // deep navy
          950: '#020617',
        },
        slate: {
          850: '#151f32',
          900: '#101A35',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
