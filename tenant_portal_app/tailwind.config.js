const { nextui } = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        deep: {
          900: "#030712",
          800: "#0f172a",
        },
        neon: {
          blue: "#00f0ff",
          purple: "#7000ff",
          pink: "#ff0099",
        },
        glass: {
          surface: "rgba(255, 255, 255, 0.05)",
          border: "rgba(255, 255, 255, 0.12)",
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', "Menlo", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath fill='none' stroke='%2300f0ff0d' stroke-width='1' d='M0 0h48v48H0z'/%3E%3Cg stroke='%23ffffff0f' stroke-width='0.5'%3E%3Cpath d='M0 .5H48'/%3E%3Cpath d='M.5 0V48'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 240, 255, 0.25)",
        "glass-strong": "0 20px 60px rgba(0,0,0,0.35)",
      },
      keyframes: {
        "orb-pulse": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(0,240,255,0.45)" },
          "50%": { transform: "scale(1.08)", boxShadow: "0 0 30px 12px rgba(0,240,255,0.2)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "orb-pulse": "orb-pulse 8s ease-in-out infinite",
        "gradient-move": "gradient-shift 18s ease infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [nextui({
    prefix: "nextui",
    addCommonColors: false,
    defaultTheme: "dark",
    defaultExtendTheme: "dark",
    layout: {
      spacingUnit: 4,
      disabledOpacity: 0.5,
      dividerWeight: "1px",
      fontSize: {
        tiny: "0.75rem",
        small: "0.875rem",
        medium: "1rem",
        large: "1.125rem",
      },
      lineHeight: {
        tiny: "1rem",
        small: "1.25rem",
        medium: "1.5rem",
        large: "1.75rem",
      },
      radius: {
        small: "10px",
        medium: "14px",
        large: "18px",
      },
      borderWidth: {
        small: "1px",
        medium: "2px",
        large: "3px",
      },
      boxShadow: {
        small: "0px 0px 12px 0px rgb(0 240 255 / 0.06),0px 2px 12px 0px rgb(0 0 0/0.35)",
        medium: "0px 0px 18px 0px rgb(0 240 255 / 0.1),0px 4px 36px 0px rgb(0 0 0/0.45)",
        large: "0px 0px 28px 0px rgb(112 0 255 / 0.15),0px 8px 48px 0px rgb(0 0 0/0.5)",
      },
    },
    themes: {
      dark: {
        colors: {
          background: "#030712",
          foreground: "#E5E7EB",
          primary: {
            DEFAULT: "#00f0ff",
            foreground: "#011619",
          },
          secondary: {
            DEFAULT: "#7000ff",
            foreground: "#0b041a",
          },
          focus: "#00f0ff",
          divider: "rgba(255,255,255,0.1)",
        },
      },
    },
  })],
}
