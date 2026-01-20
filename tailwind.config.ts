import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Lakeland Cup brand colors
        lake: {
          red: "#c41e3a",
          "red-dark": "#9a1830",
          blue: "#1e3a5f",
          "blue-dark": "#152942",
          "blue-light": "#2a4a73",
          gold: "#c9a227",
          ice: "#e8f4f8",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
