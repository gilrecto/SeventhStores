/** @type {import('tailwindcss').Config} */

let plugin = require('tailwindcss/plugin');

module.exports = {
	prefix: "ts",
  content: ['./**/*.liquid', './frontend/**/*.{js,ts,jsx,tsx}'],
  safelist: [],
};