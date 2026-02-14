/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,html}",
    "./node_modules/preline/dist/*.js",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          100: "rgb(var(--color-base-100) / <alpha-value>)",
          200: "rgb(var(--color-base-200) / <alpha-value>)",
        },
        neutral: "rgb(var(--color-neutral) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
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
  plugins: [],
};
