/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#00E5FF', dim: 'rgba(0,229,255,0.12)', glow: 'rgba(0,229,255,0.35)' },
        surface: {
          DEFAULT: '#080A0F',
          card: '#0E1118',
          elevated: '#141820',
          border: '#1C2235',
          'border-bright': '#2A3450',
        },
        success: { DEFAULT: '#00C48C', dim: 'rgba(0,196,140,0.12)' },
        danger:  { DEFAULT: '#FF4757', dim: 'rgba(255,71,87,0.12)' },
        warning: { DEFAULT: '#FFB800', dim: 'rgba(255,184,0,0.12)' },
        tx: { primary: '#E8EDF8', secondary: '#6B7A99', tertiary: '#3D4A66' },
      },
      fontFamily: {
        mono:    ['DM Mono', 'monospace'],
        sans:    ['Syne', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '8px', lg: '12px', xl: '16px' },
      animation: {
        'slide-up':    'slide-up 0.4s ease forwards',
        'fade-in':     'fade-in 0.3s ease forwards',
        'pulse-brand': 'pulse-brand 2s ease-in-out infinite',
      },
      screens: {
        xs: '375px',  // small phones
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
