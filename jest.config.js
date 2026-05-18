const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/test-setup.js"],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "identity-obj-proxy"
  },
};