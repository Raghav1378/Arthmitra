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
        vault: {
          950: "#121212",
          900: "#1a1a1a",
          800: "#242424",
          700: "#303030",
          600: "#3d3d3d",
        },
        accent: {
          300: "#ffcc00",
          400: "#ffaa00",
          500: "#ff8800",
          600: "#e67700",
        },
        parchment: {
          DEFAULT: "#f0f0f0",
          dim: "#d1d1d1",
          faint: "#a0a0a0",
          ghost: "#707070",
        },
        ledger: {
          green: "#00c853",
          red: "#ff3d00",
          amber: "#ffab00",
        },
      },
    },
  },
  plugins: [],
};
export default config;
