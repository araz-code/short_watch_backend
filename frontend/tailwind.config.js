/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "wave-pattern": "url('/src/static/pattern.svg')",
      },
      backgroundSize: {
        "50%": "100%",
        16: "4rem",
      },
      fontFamily: {
        display: ["Verdana"],
      },
    },
  },
  plugins: [],
};