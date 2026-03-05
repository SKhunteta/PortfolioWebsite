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
        "ele-bg": "#FAF8F5",
        "ele-surface": "#FFFFFF",
        "ele-text": "#1A1A1A",
        "ele-text-secondary": "#6B6B6B",
        "ele-text-tertiary": "#9A9A9A",
        "ele-border": "#E8E4DF",
        "ele-joy": "#F59E0B",
        "ele-grief": "#3B82F6",
        "ele-rage": "#EF4444",
        "ele-hope": "#10B981",
        "ele-anxiety": "#F97316",
        "ele-empathy": "#8B5CF6",
        "ele-apathy": "#9CA3AF",
        "ele-outrage": "#DC2626",
        "ele-up": "#059669",
        "ele-down": "#DC2626",
        // Atlas (Aaron West Lyric Atlas)
        "atlas-bg": "#FAF6F0",
        "atlas-text": "#2C2C2C",
        "atlas-text-secondary": "#6B6358",
        "atlas-text-muted": "#9A9189",
        "atlas-border": "#E6DFD6",
        "atlas-steel": "#2D5F8A",
        "atlas-brown": "#8B6E4E",
        "atlas-green": "#4A7C59",
        "atlas-amber": "#D4813B",
        "atlas-purple": "#7B4B6A",
        // Plot Twist (Story Discovery)
        "pt-bg": "#0F0F1A",
        "pt-surface": "#1A1A2E",
        "pt-text": "#F0F0F0",
        "pt-text-secondary": "#A0A0B8",
        "pt-text-muted": "#6B6B80",
        "pt-border": "#2A2A3E",
        "pt-accent": "#8B5CF6",
        "pt-like": "#EF4444",
        "pt-dislike": "#6B7280",
        "pt-scifi": "#06B6D4",
        "pt-fantasy": "#8B5CF6",
        "pt-horror": "#EF4444",
        "pt-literary": "#F59E0B",
        "pt-humor": "#10B981",
        "pt-thriller": "#F97316",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "sans-serif"],
        serif: ['"DM Serif Display"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        "sans-ele": ['"DM Sans"', "system-ui", "sans-serif"],
        "serif-atlas": ['"Libre Baskerville"', "Georgia", "serif"],
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
        "ticker-scroll": "ticker-scroll 40s linear infinite",
      },
      keyframes: {
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
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
