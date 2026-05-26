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
        // Lakeland Cup brand palette. Authored in OKLCH for perceptually-uniform
        // tinting. The `<alpha-value>` placeholder is REQUIRED — without it
        // Tailwind silently drops `/<opacity>` modifiers (e.g. `bg-lake-gold/20`).
        // The hex counterparts live in `src/lib/colors.ts` for runtime JS color
        // math (RetiredJersey contrast detection parses hex). Keep in sync.
        lake: {
          red:            "oklch(53.08% 0.1969 19.54 / <alpha-value>)",   // #c41e3a
          "red-dark":     "oklch(44.66% 0.1628 18.01 / <alpha-value>)",   // #9a1830
          blue:           "oklch(34.62% 0.0736 256.04 / <alpha-value>)",  // #1e3a5f
          "blue-dark":    "oklch(27.77% 0.0534 254.83 / <alpha-value>)",  // #152942
          "blue-darkest": "oklch(18.84% 0.0128 248.51 / <alpha-value>)",  // #0f1419 — page bg
          "blue-light":   "oklch(40.50% 0.0792 255.33 / <alpha-value>)",  // #2a4a73
          gold:           "oklch(72.80% 0.1380 89.73 / <alpha-value>)",   // #c9a227
          "gold-bright":  "oklch(82.74% 0.1630 89.63 / <alpha-value>)",   // #f0c020 — medals
          ice:            "oklch(95.94% 0.0138 219.62 / <alpha-value>)",  // #e8f4f8
          "ice-muted":    "oklch(72.40% 0.0098 220.00 / <alpha-value>)",  // ≈#a7b1b5 — AAA on lake-blue-darkest (~8.4:1)
          // Semantic tokens (same hue family as brand)
          success:        "oklch(59.02% 0.0697 156.13 / <alpha-value>)",  // #5a8a6c
          warning:        "oklch(73.50% 0.1462 84.27 / <alpha-value>)",   // #d4a017
          error:          "oklch(53.08% 0.1969 19.54 / <alpha-value>)",   // alias of lake.red
          info:           "oklch(40.50% 0.0792 255.33 / <alpha-value>)",  // alias of lake.blue-light
          // Medal tiers
          silver:         "oklch(84.33% 0.0104 228.91 / <alpha-value>)",  // #c5cdd1
          bronze:         "oklch(59.61% 0.0939 60.04 / <alpha-value>)",   // #a87142
          // Position accents
          goalie:         "oklch(66.14% 0.0928 298.66 / <alpha-value>)",  // #9a86c4
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
