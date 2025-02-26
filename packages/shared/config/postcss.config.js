const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const postcssObfuscator = require("../utils/postcssObfuscator.js");

const NODE_ENV = process.env.NODE_ENV || "production";

module.exports = {
  plugins: [
    tailwindcss,
    autoprefixer,
    NODE_ENV === "production" ? postcssObfuscator({ debug: true }) : null,
  ].filter(Boolean),
};
