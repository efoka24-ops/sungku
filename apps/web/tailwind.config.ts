import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sungku design tokens (from Figma Make theme.css)
        background: "#000000",
        foreground: "#ffffff",
        card: "#121212",
        "card-foreground": "#ffffff",
        popover: "#1a1a1a",
        primary: "#654DDF",
        "primary-foreground": "#ffffff",
        secondary: "#1e1e2e",
        muted: "#1a1a1a",
        "muted-foreground": "#a0a0a0",
        accent: "#7c63e8",
        destructive: "#E74C3C",
        border: "rgba(255, 255, 255, 0.08)",
        input: "#1e1e2e",
        "input-background": "#1e1e2e",
        "switch-background": "#333355",
        ring: "#654DDF",
        // Semantic aliases used across the app
        surface: "#000000",
        "text-primary": "#FFFFFF",
        "text-secondary": "#A0A0A0",
        success: "#2ECC71",
        alert: "#E74C3C",
      },
      borderRadius: {
        pill: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
