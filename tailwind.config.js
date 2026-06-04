/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f4f8',
          100: '#c9d7e4',
          200: '#a2bacf',
          300: '#7b9dba',
          400: '#5480a5',
          500: '#1e3a5f',
          600: '#193050',
          700: '#142641',
          800: '#0f1c32',
          900: '#0a1223',
        },
        accent: {
          50: '#fdf8f3',
          100: '#f8e8d8',
          200: '#f3d8bd',
          300: '#eec8a2',
          400: '#e9b887',
          500: '#d4a574',
          600: '#b88b5c',
          700: '#9c7144',
          800: '#80572c',
          900: '#643d14',
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
