/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "wave-pattern": "url('/src/static/wave.svg')",
        "wave-pattern-dark": "url('/src/static/wave-dark.svg')",
      },
      backgroundSize: {
        "50%": "100%",
        16: "4rem",
      },
      height: {
        screen: ["100svh /* fallback for Opera, IE and etc. */", "100dvh"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        fadeOut: {
          "0%": { opacity: 1, transform: "scale(1)" },
          "100%": { opacity: 0, transform: "scale(0.95)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s forwards",
        fadeOut: "fadeOut 0.5s forwards",
      },
      fontSize: {
        "xs-plus": "0.85rem",
      },
    },
  },
  plugins: [],
};
