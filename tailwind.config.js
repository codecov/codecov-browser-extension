/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [{
      codecov: {
        ...require('daisyui/src/colors/themes')["[data-theme=light]"],
        primary: '#FF0077',
      }
    }]
  }
}
