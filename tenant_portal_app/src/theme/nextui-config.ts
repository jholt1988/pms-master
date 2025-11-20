// NextUI Theme Configuration extracted from SVG wireframes
// Note: NextUI configuration is now handled in tailwind.config.js
export const nextUIThemeConfig = {
  prefix: "nextui",
  addCommonColors: false,
  defaultTheme: "dark",
  defaultExtendTheme: "dark",
  layout: {
    // Spacing system from wireframes
    spacingUnit: 4, // Base unit: 4px
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
      small: "8px",
      medium: "12px",
      large: "14px",
    },
    borderWidth: {
      small: "1px",
      medium: "2px",
      large: "3px",
    },
    boxShadow: {
      small: "0px 0px 5px 0px rgb(0 0 0/0.02),0px 2px 10px 0px rgb(0 0 0/0.06),0px 0px 1px 0px rgb(0 0 0/0.3)",
      medium: "0px 0px 15px 0px rgb(0 0 0/0.03),0px 2px 30px 0px rgb(0 0 0/0.08),0px 0px 1px 0px rgb(0 0 0/0.3)",
      large: "0px 0px 30px 0px rgb(0 0 0/0.04),0px 30px 60px 0px rgb(0 0 0/0.12),0px 0px 1px 0px rgb(0 0 0/0.3)",
    },
  },
  themes: {
    light: {
      layout: {
        hoverOpacity: 0.8,
        boxShadow: {
          small: "0px 0px 5px 0px rgb(0 0 0/0.02),0px 2px 10px 0px rgb(0 0 0/0.06),0px 0px 1px 0px rgb(0 0 0/0.3)",
          medium: "0px 0px 15px 0px rgb(0 0 0/0.03),0px 2px 30px 0px rgb(0 0 0/0.08),0px 0px 1px 0px rgb(0 0 0/0.3)",
          large: "0px 0px 30px 0px rgb(0 0 0/0.04),0px 30px 60px 0px rgb(0 0 0/0.12),0px 0px 1px 0px rgb(0 0 0/0.3)",
        },
      },
      colors: {
        // Background colors from wireframes
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(202, 24%, 9%)",
        
        // Content backgrounds
        content1: "hsl(0, 0%, 100%)",
        content2: "hsl(240, 5%, 96%)",
        content3: "hsl(240, 6%, 90%)",
        content4: "hsl(240, 5%, 84%)",
        
        // Divider and overlay
        divider: "hsl(0, 0%, 7%)",
        overlay: "hsl(0, 0%, 0%)",
        
        // Focus color
        focus: "hsl(212, 100%, 47%)",
        
        // Default color palette
        default: {
          50: "hsl(0, 0%, 98%)",
          100: "hsl(240, 5%, 96%)",
          200: "hsl(240, 6%, 90%)",
          300: "hsl(240, 5%, 84%)",
          400: "hsl(240, 5%, 65%)",
          500: "hsl(240, 4%, 46%)",
          600: "hsl(240, 5%, 34%)",
          700: "hsl(240, 5%, 26%)",
          800: "hsl(240, 4%, 16%)",
          900: "hsl(240, 6%, 10%)",
          foreground: "hsl(0, 0%, 0%)",
          DEFAULT: "hsl(240, 5%, 84%)",
        },
        
        // Primary color (from wireframes)
        primary: {
          50: "hsl(213, 92%, 95%)",
          100: "hsl(212, 92%, 90%)",
          200: "hsl(212, 92%, 79%)",
          300: "hsl(212, 92%, 69%)",
          400: "hsl(212, 92%, 58%)",
          500: "hsl(212, 100%, 47%)",
          600: "hsl(212, 100%, 38%)",
          700: "hsl(212, 100%, 29%)",
          800: "hsl(212, 100%, 19%)",
          900: "hsl(212, 100%, 10%)",
          foreground: "hsl(0, 0%, 100%)",
          DEFAULT: "hsl(212, 100%, 47%)",
        },
        
        // Secondary color
        secondary: {
          50: "hsl(270, 62%, 95%)",
          100: "hsl(270, 59%, 89%)",
          200: "hsl(270, 59%, 79%)",
          300: "hsl(270, 59%, 68%)",
          400: "hsl(270, 59%, 58%)",
          500: "hsl(270, 67%, 47%)",
          600: "hsl(270, 67%, 38%)",
          700: "hsl(270, 67%, 28%)",
          800: "hsl(270, 67%, 19%)",
          900: "hsl(270, 67%, 9%)",
          foreground: "hsl(0, 0%, 100%)",
          DEFAULT: "hsl(270, 67%, 47%)",
        },
        
        // Success color
        success: {
          50: "hsl(147, 64%, 95%)",
          100: "hsl(146, 61%, 89%)",
          200: "hsl(146, 62%, 77%)",
          300: "hsl(146, 63%, 66%)",
          400: "hsl(146, 62%, 55%)",
          500: "hsl(146, 79%, 44%)",
          600: "hsl(146, 80%, 35%)",
          700: "hsl(146, 79%, 26%)",
          800: "hsl(146, 80%, 17%)",
          900: "hsl(146, 78%, 9%)",
          foreground: "hsl(0, 0%, 0%)",
          DEFAULT: "hsl(146, 79%, 44%)",
        },
        
        // Warning color
        warning: {
          50: "hsl(55, 92%, 95%)",
          100: "hsl(37, 91%, 91%)",
          200: "hsl(37, 91%, 82%)",
          300: "hsl(37, 91%, 73%)",
          400: "hsl(37, 91%, 64%)",
          500: "hsl(37, 91%, 55%)",
          600: "hsl(37, 74%, 44%)",
          700: "hsl(37, 74%, 33%)",
          800: "hsl(37, 75%, 22%)",
          900: "hsl(37, 75%, 11%)",
          foreground: "hsl(0, 0%, 0%)",
          DEFAULT: "hsl(37, 91%, 55%)",
        },
        
        // Danger color
        danger: {
          50: "hsl(339, 92%, 95%)",
          100: "hsl(340, 92%, 90%)",
          200: "hsl(339, 90%, 80%)",
          300: "hsl(339, 91%, 71%)",
          400: "hsl(339, 90%, 61%)",
          500: "hsl(339, 90%, 51%)",
          600: "hsl(339, 87%, 41%)",
          700: "hsl(339, 86%, 31%)",
          800: "hsl(339, 87%, 20%)",
          900: "hsl(340, 85%, 10%)",
          foreground: "hsl(0, 0%, 100%)",
          DEFAULT: "hsl(339, 90%, 51%)",
        },
      },
    },
  },
};

// Custom CSS variables for additional design tokens
export const customCSSVariables = {
  // Spacing system
  "--nextui-spacing-unit": "4px",
  "--nextui-spacing-unit-xs": "0.5rem",
  "--nextui-spacing-unit-sm": "0.75rem", 
  "--nextui-spacing-unit-md": "1rem",
  "--nextui-spacing-unit-lg": "1.375rem",
  "--nextui-spacing-unit-xl": "2.25rem",
  "--nextui-spacing-unit-2xl": "3rem",
  "--nextui-spacing-unit-3xl": "5rem",
  "--nextui-spacing-unit-4xl": "7.5rem",
  "--nextui-spacing-unit-5xl": "14rem",
  "--nextui-spacing-unit-6xl": "18rem",
  
  // Numeric spacing units
  "--nextui-spacing-unit-0": "0px",
  "--nextui-spacing-unit-1": "0.25rem",
  "--nextui-spacing-unit-2": "0.5rem",
  "--nextui-spacing-unit-3": "0.75rem",
  "--nextui-spacing-unit-4": "1rem",
  "--nextui-spacing-unit-5": "1.25rem",
  "--nextui-spacing-unit-6": "1.5rem",
  "--nextui-spacing-unit-7": "1.75rem",
  "--nextui-spacing-unit-8": "2rem",
  "--nextui-spacing-unit-9": "2.25rem",
  "--nextui-spacing-unit-10": "2.5rem",
  "--nextui-spacing-unit-11": "2.75rem",
  "--nextui-spacing-unit-12": "3rem",
  "--nextui-spacing-unit-16": "4rem",
  "--nextui-spacing-unit-20": "5rem",
  "--nextui-spacing-unit-24": "6rem",
  "--nextui-spacing-unit-32": "8rem",
  "--nextui-spacing-unit-40": "10rem",
  "--nextui-spacing-unit-48": "12rem",
  "--nextui-spacing-unit-56": "14rem",
  "--nextui-spacing-unit-64": "16rem",
  
  // Additional color tokens
  "--accent": "#339cff",
  "--card": "#0a0a0a",
  "--card-foreground": "#f2f2f21a",
  "--muted": "#262626",
  "--muted-foreground": "#a3a3a3",
  "--ring": "#d4d4d4",
  "--border": "#262626",
  "--input": "#262626",
  "--background": "#313131",
  "--foreground": "#fafafa",
  "--tooltip": "#313131",
  "--tooltip-foreground": "#fafafa",
  "--popover": "#555555",
  "--popover-foreground": "#fafafa",
  
  // Custom colors from wireframes
  "--pink": "#ff64f9",
  "--red": "#ff6565", 
  "--orange": "#ff6d1b",
  "--yellow": "#ffee55",
  "--green": "#5bff89",
  "--blue": "#4d8aff",
  "--purple": "#6b5fff",
  "--color-error": "#ff6e00",
};