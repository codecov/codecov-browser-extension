const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { ProvidePlugin } = require("webpack");
const scriptsDir = path.join(__dirname, "..", "src", "scripts");

module.exports = {
  entry: {
    popup: path.join(scriptsDir, "popup.tsx"),
    options: path.join(scriptsDir, "options.tsx"),
    background: path.join(scriptsDir, "background.ts"),
    content_script: path.join(scriptsDir, "content_script.tsx"),
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
