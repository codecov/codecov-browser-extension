const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { ProvidePlugin } = require("webpack");
const srcDir = path.join(__dirname, "..", "src");

module.exports = {
  entry: {
    background: path.join(srcDir, "background", "main.ts"),
    github: path.join(srcDir, "content", "github", "main.ts"),
    popup: path.join(srcDir, "popup", "main.tsx"),
    options: path.join(srcDir, "options", "main.tsx"),
  },
  output: {
    path: path.join(__dirname, "../dist/js"),
    filename: "[name].js",
  },
  optimization: {
    splitChunks: {
      name: "vendor",
      chunks(chunk) {
        return chunk.name !== "background";
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: ".", to: "../", context: "public" }],
      options: {},
    }),
    new ProvidePlugin({
      browser: "webextensions-polyfill",
    }),
  ],
};
