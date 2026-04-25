import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  future: {
    // Wraps every `hover:` variant in `@media (hover: hover)` so
    // touch-only devices never hold a "sticky hover" after tap. This
    // is Tailwind's canonical mobile-UX hardening and fixes a class of
    // bugs where buttons look pressed until the user taps elsewhere.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        md: "2rem",
        lg: "2.5rem",
      },
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        /** Cosmos palette — dark-only editorial space aesthetic. */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        panel: "hsl(var(--panel))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          soft: "hsl(var(--accent-soft))",
        },
        danger: "hsl(var(--danger))",
        success: "hsl(var(--success))",
        status: {
          live: "hsl(var(--status-live))",
          cache: "hsl(var(--status-cache))",
          stale: "hsl(var(--status-stale))",
          fallback: "hsl(var(--status-fallback))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Geometric sans display stack — Jost first, Futura (macOS) /
        // generic geometric fallbacks after, so the cinematic voice
        // survives if the webfont hasn't loaded yet.
        display: [
          "var(--font-display)",
          "Futura",
          "Futura PT",
          "Trebuchet MS",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Geometric sans tightens visually better than a serif, so the
        // tracking is a hair tighter at the top end (-0.035em) to push
        // the headline into film-poster density.
        "display-xl": ["clamp(3.5rem, 7vw, 6.5rem)", { lineHeight: "0.95", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2.75rem, 5vw, 4.5rem)", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(2rem, 3.5vw, 3rem)", { lineHeight: "1.06", letterSpacing: "-0.025em" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "22px",
        "2xl": "28px",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.8)",
        glow: "0 0 24px -4px hsl(var(--accent) / 0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translate3d(0,10px,0)" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "spin-slow": {
          "0%": { transform: "translate(-50%, -50%) rotate(0deg)" },
          "100%": { transform: "translate(-50%, -50%) rotate(360deg)" },
        },
        "float-in": {
          "0%": { opacity: "0", transform: "translate3d(0,14px,0)", filter: "blur(6px)" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0)", filter: "blur(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 800ms ease-out both",
        "pulse-soft": "pulse-soft 3.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin-slow 3.2s linear infinite",
        "float-in": "float-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
