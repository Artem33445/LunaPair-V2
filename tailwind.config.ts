import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        elevated: "hsl(var(--elevated) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        primarySoft: "hsl(var(--primary-soft) / <alpha-value>)",
        coral: "hsl(var(--coral) / <alpha-value>)",
        peach: "hsl(var(--peach) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        phaseMenstrual: "hsl(var(--phase-menstrual) / <alpha-value>)",
        phaseFollicular: "hsl(var(--phase-follicular) / <alpha-value>)",
        phaseFertile: "hsl(var(--phase-fertile) / <alpha-value>)",
        phaseOvulation: "hsl(var(--phase-ovulation) / <alpha-value>)",
        phaseLuteal: "hsl(var(--phase-luteal) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(76, 55, 108, 0.12)"
      },
      borderRadius: {
        card: "22px"
      },
      fontFamily: {
        sans: [
          "Unbounded",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
} satisfies Config;
