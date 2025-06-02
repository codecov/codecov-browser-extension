const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const Dotenv = require('dotenv-webpack');

module.exports = merge(common, {
  devtool: "inline-source-map",
  mode: "development",
  plugins: [
    new Dotenv({
      path: `./.env.local`,
    }),
  ],
});
