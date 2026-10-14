/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Inter'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "Menlo", "monospace"],
      },
      colors: {
        dark: {
          bg: "#09090b",
          surface: "#121215",
          card: "#18181b",
          border: "#27272a",
          hover: "#222226",
          text: "#f4f4f5",
          muted: "#a1a1aa",
        },
        light: {
          bg: "#fafafa",
          surface: "#ffffff",
          card: "#ffffff",
          border: "#e4e4e7",
          hover: "#f4f4f5",
          text: "#09090b",
          muted: "#71717a",
        }
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'premium-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
};