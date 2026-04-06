module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        primary: "#1A3A6B",
        secondary: "#FF6B00",
        accent: "#138808",
        bg: "#F5F7FA",
        surface: "#FFFFFF",
        text: {
          primary: "#1A1A2E",
          secondary: "#64748B",
        },
        success: "#16A34A",
        warning: "#D97706",
        error: "#DC2626",
        info: "#0066CC",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans", "sans-serif"],
      },
      fontSize: {
        'h1': ['1.75rem', { lineHeight: '1.3', fontWeight: '500' }],
        'h2': ['1.375rem', { lineHeight: '1.3', fontWeight: '500' }],
        'h3': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'h4': ['1rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'label': ['0.8125rem', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],
        'micro': ['0.6875rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.06em' }],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      shadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'bounce': 'bounce 1s infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideInUp 0.3s ease-out',
        'slide-down': 'slideInDown 0.3s ease-out',
        'slide-left': 'slideInLeft 0.3s ease-out',
        'slide-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        spin: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideInUp: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          'from': { opacity: '0', transform: 'translateX(-10px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          'from': { opacity: '0', transform: 'translateX(10px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
