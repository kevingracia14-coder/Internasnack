/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./gamification.js",
    "./src/**/*.js",
    "./data/modules/*.json"
  ],
  safelist: [
    "z-[55]",
    "z-[60]",
    "z-[65]",
    "z-[70]",
    "max-h-[85dvh]",
    "max-h-[88dvh]",
    "pointer-events-none",
    "pointer-events-auto",
    "bg-rose-600",
    "border-rose-800",
    "bg-amber-600",
    "border-amber-800",
    "bg-emerald-600",
    "border-emerald-800",
    "bg-sky-600",
    "border-sky-800"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        sans: ["Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        vignette: ["Plus Jakarta Sans", "-apple-system", "sans-serif"]
      },
      colors: {
        canvas: "var(--bg-canvas)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          subtle: "var(--bg-surface-subtle)",
          elevated: "var(--bg-surface-subtle)"
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)"
        },
        divider: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)"
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          coral: "var(--accent-coral)"
        }
      }
    }
  }
};
