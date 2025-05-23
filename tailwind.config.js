/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        "codecov-pink": "rgb(240, 31, 122)",
        "codecov-blue": "rgb(0, 136, 233)",
      },
    },
  },
};
