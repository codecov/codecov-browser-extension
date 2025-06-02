const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const Dotenv = require("dotenv-webpack");
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");
const { codecovWebpackPlugin } = require("@codecov/webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",
  plugins: [
    new Dotenv({
      path: `./.env`,
      safe: true,
    }),
    sentryWebpackPlugin({
      org: "codecov",
      project: "browser-extension",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    codecovWebpackPlugin({
      enableBundleAnalysis: true,
      bundleName: "codecov-browser-extension",
      oidc: {
        useGitHubOIDC: true,
      },
    }),
  ],
});
