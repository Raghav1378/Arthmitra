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
        // Sapphire Court palette — porcelain white, sapphire blue, royal gold
        ink: {
          950: "#0a1f4d",
          900: "#10306e",
          800: "#1a4291",
          700: "#2456b4",
          600: "#346fd8",
          500: "#5289e8",
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
          DEFAULT: "#14213d",
          dim: "#44536f",
          faint: "#6d7b95",
          ghost: "#9aa6bb",
        },
        ledger: {
          green: "#1f9d63",
          red: "#d92637",
          amber: "#d98a17",
        },
      },
    },
  },
  plugins: [],
};
export default config;
