module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
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
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
}
