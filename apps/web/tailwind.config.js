/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00E5FF',
          dark: '#00B8D9',
        },
        surface: {
          DEFAULT: '#0D0F14',
          card: '#131720',
          border: '#1E2433',
        },
        success: '#00C48C',
        danger: '#FF4757',
        warning: '#FFB800',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
