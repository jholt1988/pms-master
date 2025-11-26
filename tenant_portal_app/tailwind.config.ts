import { nextui } from "@nextui-org/react";
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Exo 2"', 'Montserrat', 'sans-serif'], // Futuristic tech font
        mono: ['"JetBrains Mono"', 'monospace'], // For data values
      },
      colors: {
        // Scheme 4 Palette: "Digital Twin"
        deep: {
          "900": "#030712", // Main background (void)
          "800": "#0f172a", // Secondary background
        },
        neon: {
          blue: "#00f0ff", // Primary Action / KPI
          purple: "#7000ff", // AI / Gradient
          pink: "#ff0099", // Alerts
        },
        glass: {
          border: "rgba(255, 255, 255, 0.1)",
          surface: "rgba(255, 255, 255, 0.05)",
          highlight: "rgba(255, 255, 255, 0.15)",
        }
      },
      backgroundImage: {
        'cyber-gradient': "radial-gradient(circle at 50% 0%, #1e1b4b 0%, #020617 60%)",
        'glass-gradient': "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='white' stroke-width='0.5' opacity='0.2'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E\")",
        'deep-space': "linear-gradient(135deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)",
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  darkMode: "class", // Scheme 4 is Dark Mode ONLY
  plugins: [nextui({
    defaultTheme: "dark",
  //   layout: {
  //     // Spacing system from wireframes
  //     spacingUnit: 4, // Base unit: 4px
  //     disabledOpacity: 0.5,
  //     dividerWeight: "1px",
  //     fontSize: {
  //       tiny: "0.75rem",
  //       small: "0.875rem",
  //       medium: "1rem",
  //       large: "1.125rem",
  //     },
  //     lineHeight: {
  //       tiny: "1rem",
  //       small: "1.25rem",
  //       medium: "1.5rem",
  //       large: "1.75rem",
  //     },
  //     radius: {
  //       small: "8px",
  //       medium: "12px",
  //       large: "14px",
  //     },
  //     borderWidth: {
  //       small: "1px",
  //       medium: "2px",
  //       large: "3px",
  //     },
  //     boxShadow: {
  //       small: "0px 0px 5px 0px rgb(0 0 0/0.02),0px 2px 10px 0px rgb(0 0 0/0.06),0px 0px 1px 0px rgb(0 0 0/0.3)",
  //       medium: "0px 0px 15px 0px rgb(0 0 0/0.03),0px 2px 30px 0px rgb(0 0 0/0.08),0px 0px 1px 0px rgb(0 0 0/0.3)",
  //       large: "0px 0px 30px 0px rgb(0 0 0/0.04),0px 30px 60px 0px rgb(0 0 0/0.12),0px 0px 1px 0px rgb(0 0 0/0.3)",
  //     },
  //   },
  //   themes: {
  //     light: {
  //       layout: {
  //         hoverOpacity: 0.8,
  //         boxShadow: {
  //           small: "0px 0px 5px 0px rgb(0 0 0/0.02),0px 2px 10px 0px rgb(0 0 0/0.06),0px 0px 1px 0px rgb(0 0 0/0.3)",
  //           medium: "0px 0px 15px 0px rgb(0 0 0/0.03),0px 2px 30px 0px rgb(0 0 0/0.08),0px 0px 1px 0px rgb(0 0 0/0.3)",
  //           large: "0px 0px 30px 0px rgb(0 0 0/0.04),0px 30px 60px 0px rgb(0 0 0/0.12),0px 0px 1px 0px rgb(0 0 0/0.3)",
  //         },
  //       },
  //       colors: {
  //         // Background colors from wireframes
  //         background: "hsl(0, 0%, 100%)",
  //         foreground: "hsl(202, 24%, 9%)",

  //         // Content backgrounds
  //         content1: "hsl(0, 0%, 100%)",
  //         content2: "hsl(240, 5%, 96%)",
  //         content3: "hsl(240, 6%, 90%)",
  //         content4: "hsl(240, 5%, 84%)",

  //         // Divider and overlay
  //         divider: "hsl(0, 0%, 7%)",
  //         overlay: "hsl(0, 0%, 0%)",

  //         // Focus color
  //         focus: "hsl(212, 100%, 47%)",

  //         // Default color palette
  //         default: {
  //           "50": "hsl(0, 0%, 98%)",
  //           "100": "hsl(240, 5%, 96%)",
  //           "200": "hsl(240, 6%, 90%)",
  //           "300": "hsl(240, 5%, 84%)",
  //           "400": "hsl(240, 5%, 65%)",
  //           "500": "hsl(240, 4%, 46%)",
  //           "600": "hsl(240, 5%, 34%)",
  //           "700": "hsl(240, 5%, 26%)",
  //           "800": "hsl(240, 4%, 16%)",
  //           "900": "hsl(240, 6%, 10%)",
  //           foreground: "hsl(0, 0%, 0%)",
  //           DEFAULT: "hsl(240, 5%, 84%)",
  //         },

  //         // Primary color (from wireframes)
  //         primary: {
  //           "50": "hsl(213, 92%, 95%)",
  //           "100": "hsl(212, 92%, 90%)",
  //           "200": "hsl(212, 92%, 79%)",
  //           "300": "hsl(212, 92%, 69%)",
  //           "400": "hsl(212, 92%, 58%)",
  //           "500": "hsl(212, 100%, 47%)",
  //           "600": "hsl(212, 100%, 38%)",
  //           "700": "hsl(212, 100%, 29%)",
  //           "800": "hsl(212, 100%, 19%)",
  //           "900": "hsl(212, 100%, 10%)",
  //           foreground: "hsl(0, 0%, 100%)",
  //           DEFAULT: "hsl(212, 100%, 47%)",
  //         },

  //         // Secondary color
  //         secondary: {
  //           "50": "hsl(270, 62%, 95%)",
  //           "100": "hsl(270, 59%, 89%)",
  //           "200": "hsl(270, 59%, 79%)",
  //           "300": "hsl(270, 59%, 68%)",
  //           "400": "hsl(270, 59%, 58%)",
  //           "500": "hsl(270, 67%, 47%)",
  //           "600": "hsl(270, 67%, 38%)",
  //           "700": "hsl(270, 67%, 28%)",
  //           "800": "hsl(270, 67%, 19%)",
  //           "900": "hsl(270, 67%, 9%)",
  //           foreground: "hsl(0, 0%, 100%)",
  //           DEFAULT: "hsl(270, 67%, 47%)",
  //         },

  //         // Success color
  //         success: {
  //           "50": "hsl(147, 64%, 95%)",
  //           "100": "hsl(146, 61%, 89%)",
  //           "200": "hsl(146, 62%, 77%)",
  //           "300": "hsl(146, 63%, 66%)",
  //           "400": "hsl(146, 62%, 55%)",
  //           "500": "hsl(146, 79%, 44%)",
  //           "600": "hsl(146, 80%, 35%)",
  //           "700": "hsl(146, 79%, 26%)",
  //           "800": "hsl(146, 80%, 17%)",
  //           "900": "hsl(146, 78%, 9%)",
  //           foreground: "hsl(0, 0%, 0%)",
  //           DEFAULT: "hsl(146, 79%, 44%)",
  //         },

  //         // Warning color
  //         warning: {
  //           "50": "hsl(55, 92%, 95%)",
  //           "100": "hsl(37, 91%, 91%)",
  //           "200": "hsl(37, 91%, 82%)",
  //           "300": "hsl(37, 91%, 73%)",
  //           "400": "hsl(37, 91%, 64%)",
  //           "500": "hsl(37, 91%, 55%)",
  //           "600": "hsl(37, 74%, 44%)",
  //           "700": "hsl(37, 74%, 33%)",
  //           "800": "hsl(37, 75%, 22%)",
  //           "900": "hsl(37, 75%, 11%)",
  //           foreground: "hsl(0, 0%, 0%)",
  //           DEFAULT: "hsl(37, 91%, 55%)",
  //         },

  //         // Danger color
  //         danger: {
  //           "50": "hsl(339, 92%, 95%)",
  //           "100": "hsl(340, 92%, 90%)",
  //           "200": "hsl(339, 90%, 80%)",
  //           "300": "hsl(339, 91%, 71%)",
  //           "400": "hsl(339, 90%, 61%)",
  //           "500": "hsl(339, 90%, 51%)",
  //           "600": "hsl(339, 87%, 41%)",
  //           "700": "hsl(339, 86%, 31%)",
  //           "800": "hsl(339, 87%, 20%)",
  //           "900": "hsl(340, 85%, 10%)",
  //           foreground: "hsl(0, 0%, 100%)",
  //           DEFAULT: "hsl(339, 90%, 51%)",
  //         },
  //       },
  //     },
  //   },
  // })],
  })],
};

export default config;
