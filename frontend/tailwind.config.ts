import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        // Midnight Court — dark vault ground, gold guilloche, mint/rose ledger.
        // ink/parchment are TEXT scales (light on dark); vault is the dark ground.
        ink: {
          950: "#f2f5ff",
          900: "#dfe7fb",
          800: "#c6d3f2",
          700: "#a8bcf0",
          600: "#8ba6e8",
          500: "#6d8adc",
        },
        vault: {
          950: "#060b1a",
          900: "#0a1230",
          800: "#0f1c46",
          700: "#14265c",
          600: "#1a2f6e",
        },
        gold: {
          200: "#f5e3b3",
          300: "#eccb7d",
          400: "#e0b558",
          500: "#c9992b",
          600: "#a67a1c",
          700: "#7f5c12",
        },
        parchment: {
          DEFAULT: "#e7edfa",
          dim: "#b3c0dc",
          faint: "#7e8db0",
          ghost: "#57668a",
        },
        ledger: {
          green: "#2fbf7f",
          red: "#ff5d70",
          amber: "#f0a12e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
