/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2D3E50",
        secondary: "#2C3E50",
        accent: "#3498DB",
        "accent-light": "#85C1E9",
        dark: "#1A202C",
        light: "#F8FAFC",
        "gray-dark": "#4A5568",
        "gray-light": "#EDF2F7",
        "bg-gradient-start": "#D6EAF8",
        "bg-gradient-end": "#FFFFFF",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        custom: "0 4px 6px rgba(0, 0, 0, 0.1)",
        "custom-lg": "0 10px 15px rgba(0, 0, 0, 0.1)",
        "custom-2xl": "0 25px 50px rgba(0, 0, 0, 0.15)",
        "custom-inner": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
      },
      backgroundImage: {
        "hero-pattern": "url('/pattern.svg')",
      },
      animation: {
        blob: "blob 7s infinite",
        "fade-in": "fade-in 0.8s ease-out forwards",
        "reveal-left":
          "reveal-left 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "reveal-right":
          "reveal-right 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "reveal-left": {
          from: {
            opacity: "0",
            transform: "translateX(-40px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "reveal-right": {
          from: {
            opacity: "0",
            transform: "translateX(40px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
