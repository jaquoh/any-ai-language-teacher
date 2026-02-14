import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,html}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff5f7",
          100: "#ffe3ea",
          200: "#ffc6d5",
          300: "#ff9eb7",
          400: "#ff6f96",
          500: "#f34679",
          600: "#d82960",
          700: "#b31a4a",
          800: "#8e153c",
          900: "#701531"
        }
      }
    }
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        teacherlight: {
          "primary": "#e11d48",
          "secondary": "#0f766e",
          "accent": "#fb7185",
          "neutral": "#1f2430",
          "base-100": "#fffafc",
          "base-200": "#fff1f5",
          "info": "#0ea5e9",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444"
        }
      }
    ]
  }
};
