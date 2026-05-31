import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bier: {
          DEFAULT: "#f59e0b",
          soft: "#fef3c7",
        },
        koffie: {
          DEFAULT: "#2563eb",
          soft: "#dbeafe",
        },
        ei: {
          DEFAULT: "#16a34a",
          soft: "#dcfce7",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
