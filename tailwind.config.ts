import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        court: {
          DEFAULT: "#0d3b2c",
          light: "#145a45",
          muted: "#1a5c47",
        },
        sand: {
          DEFAULT: "#c4a574",
          light: "#dcc9a4",
        },
        accent: {
          DEFAULT: "#e85d04",
          soft: "#ff8c42",
        },
        ink: "#0a0f0d",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(13, 59, 44, 0.12), 0 8px 16px -8px rgba(0,0,0,0.08)",
        glow: "0 0 40px -8px rgba(232, 93, 4, 0.35)",
      },
      backgroundImage: {
        "court-gradient":
          "linear-gradient(145deg, #0d3b2c 0%, #0a2a20 50%, #061a14 100%)",
        "hero-mesh":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232, 93, 4, 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(196, 165, 116, 0.12), transparent)",
        "mesh-dashboard":
          "radial-gradient(ellipse 100% 80% at 0% -20%, rgba(16, 185, 129, 0.08), transparent), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(249, 115, 22, 0.06), transparent)",
        "profile-cover":
          "linear-gradient(135deg, #064e3b 0%, #0f172a 45%, #134e4a 100%)",
      },
      keyframes: {
        "fade-slide": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        /** Success icon after a student sends a lesson request. */
        "success-pop": {
          "0%": { opacity: "0", transform: "scale(0.55)" },
          "65%": { opacity: "1", transform: "scale(1.06)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "landing-rise": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "landing-ken-burns": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
      },
      animation: {
        "fade-slide": "fade-slide 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2s infinite",
        "success-pop": "success-pop 0.75s cubic-bezier(0.22, 1, 0.36, 1) both",
        "landing-rise": "landing-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "landing-ken-burns": "landing-ken-burns 28s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
