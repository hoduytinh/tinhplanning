/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
        },
        sidebar: "#0f172a",
        sidebarItem: "#1e293b",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        cardHover: "0 4px 12px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};
