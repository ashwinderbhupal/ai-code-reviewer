/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#c7d6ff",
          300: "#a4bcff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        ink: {
          900: "#0b1020",
          800: "#11172b",
          700: "#1a2240",
          600: "#243056",
        },
        severity: {
          critical: "#dc2626",
          high: "#ea580c",
          medium: "#ca8a04",
          low: "#2563eb",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "score-fill": {
          "0%": { strokeDashoffset: "calc(var(--circ) * 1)" },
          "100%": { strokeDashoffset: "var(--target-offset)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "slide-in-right": "slide-in-right 220ms ease-out both",
      },
    },
  },
  plugins: [],
};
