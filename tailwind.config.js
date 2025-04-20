/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: "meta-",
  darkMode: ["class", ".theme-dark"],
  corePlugins: {
    preflight: false,
  },
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "inherit",
            a: {
              color: "var(--text-accent)",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            },
            code: {
              color: "var(--text-normal)",
              backgroundColor: "var(--background-secondary)",
              borderRadius: "3px",
              padding: "0.2em 0.4em",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: 0,
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
