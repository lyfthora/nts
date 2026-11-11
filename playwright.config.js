const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/offline",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    actionTimeout: 10000,
    trace: "retain-on-failure",
  },
});
