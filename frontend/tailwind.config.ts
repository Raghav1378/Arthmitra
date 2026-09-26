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
        ink: {
          950: "#f4f7ff",
          900: "#a8b4cc",
        },
        vault: {
          950: "#080d1a",
          900: "#0b1020",
          800: "#111936",
          700: "#182246",
          600: "#263453",
        },
        accent: {
          500: "#5b7cff",
          600: "#4f6bff",
        },
        parchment: {
          DEFAULT: "#f4f7ff",
          dim: "#a8b4cc",
          faint: "#687793",
          ghost: "#7f8da8",
        },
        ledger: {
          green: "#35d0ba",
          red: "#ff6b6b",
          amber: "#f4b860",
        },
      },
    },
  },
  plugins: [],
};
export default config;
