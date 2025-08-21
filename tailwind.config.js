/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'arabic': ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        'sans': ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Use rgb(var(--token)) so we can add alpha channels easily */
        border: "rgb(var(--border))",
        input: "rgb(var(--input))",
        ring: "rgb(var(--ring))",
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        primary: {
          DEFAULT: "rgb(var(--primary))",
          foreground: "rgb(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary))",
          foreground: "rgb(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive))",
          foreground: "rgb(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "rgb(var(--muted))",
          foreground: "rgb(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "rgb(var(--accent))",
          foreground: "rgb(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "rgb(var(--popover))",
          foreground: "rgb(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "rgb(var(--card))",
          foreground: "rgb(var(--card-foreground))",
        },
        // Custom teal colors matching the design
        teal: {
          50: 'rgb(240 253 250)',
          100: 'rgb(204 251 241)',
          200: 'rgb(153 246 228)',
          300: 'rgb(94 234 212)',
          400: 'rgb(45 212 191)',
          500: 'rgb(20 184 166)',
          600: 'rgb(13 148 136)',
          700: 'rgb(15 118 110)',
          800: 'rgb(17 94 89)',
          900: 'rgb(19 78 74)',
        },
        // Override gray colors to use nearly black
        gray: {
          50: 'rgb(249 250 251)',
          100: 'rgb(243 244 246)',
          200: 'rgb(229 231 235)',
          300: 'rgb(209 213 219)',
          400: 'rgb(156 163 175)',
          500: 'rgb(107 114 128)',
          600: 'rgb(75 85 99)',
          700: 'rgb(31 41 55)', // Nearly black for text
          800: 'rgb(31 41 55)', // Nearly black for text
          900: 'rgb(31 41 55)', // Nearly black for text
        },
        // Override slate colors to use nearly black
        slate: {
          50: 'rgb(248 250 252)',
          100: 'rgb(241 245 249)',
          200: 'rgb(226 232 240)',
          300: 'rgb(203 213 225)',
          400: 'rgb(148 163 184)',
          500: 'rgb(100 116 139)',
          600: 'rgb(71 85 105)',
          700: 'rgb(31 41 55)', // Nearly black for text
          800: 'rgb(31 41 55)', // Nearly black for text
          900: 'rgb(31 41 55)', // Nearly black for text
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, rgb(20 184 166) 0%, rgb(56 189 248) 50%, rgb(59 130 246) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%)',
        'gradient-hero': 'linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 50%, rgb(51 65 85) 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}