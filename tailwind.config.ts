import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssAspectRatio from "@tailwindcss/aspect-ratio";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      fontFamily: {
        // Devanagari falls through to the system face so the Hindi path needs no download.
        sans: ['Satoshi', '"Nirmala UI"', '"Kohinoor Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Nirmala UI"', 'Georgia', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        role: "hsl(var(--role) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        queued: "hsl(var(--queued) / <alpha-value>)",
        synced: "hsl(var(--synced) / <alpha-value>)",
        alert: "hsl(var(--alert) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        panel: "var(--radius-panel)",
      },
      boxShadow: {
        lift: "0 20px 44px -28px hsl(158 21% 8% / 0.38)",
        stamp: "0 0 0 1px hsl(var(--role) / 0.16), 0 12px 28px -22px hsl(158 21% 8% / 0.4)",
      },
      fontSize: {
        // Fluid display steps, tuned down for a 390px phone rather than squashed.
        hero: ["clamp(2.75rem, 5.1vw, 4.35rem)", { lineHeight: "0.94", letterSpacing: "-0.035em" }],
        section: ["clamp(2rem, 4.2vw, 3.4rem)", { lineHeight: "0.98", letterSpacing: "-0.028em" }],
        metric: ["clamp(2.4rem, 4.6vw, 3.8rem)", { lineHeight: "1", letterSpacing: "-0.03em" }],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssAspectRatio],
} satisfies Config;
