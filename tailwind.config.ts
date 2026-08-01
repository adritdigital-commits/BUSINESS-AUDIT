import type { Config } from "tailwindcss";

/**
 * Every colour is wired to a CSS custom property declared in globals.css so
 * the palette lives in exactly one place. The severity trio (good / warning /
 * critical) is a fixed status ramp — validated for CVD separation and >= 3:1
 * contrast against the canvas — and is never reused for decoration.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
        },
        hairline: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          secondary: "var(--ink-secondary)",
          muted: "var(--ink-muted)",
          inverse: "var(--ink-inverse)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          ink: "var(--accent-ink)",
        },
        good: "var(--good)",
        warning: "var(--warning)",
        critical: "var(--critical)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "14px",
        panel: "20px",
      },
      boxShadow: {
        lift: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 48px -24px rgba(0,0,0,0.9)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // Used only by /game. The reduced-motion rule in globals.css flattens
        // all three to a single near-instant frame.
        pop: {
          from: { opacity: "0", transform: "scale(.94) translateY(10px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "card-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        confetti: {
          from: { opacity: "1", transform: "translateY(-10vh) rotate(0deg)" },
          to: { opacity: "0", transform: "translateY(105vh) rotate(540deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up .38s cubic-bezier(.21,.6,.35,1) both",
        "fade-in": "fade-in .3s ease both",
        pop: "pop .34s cubic-bezier(.21,.9,.35,1) both",
        "card-shake": "card-shake .32s ease-in-out",
        confetti: "confetti 2.6s linear forwards",
      },
    },
  },
  plugins: [],
};
export default config;
