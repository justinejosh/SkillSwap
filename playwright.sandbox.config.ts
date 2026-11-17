import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/sandbox",
  workers: 1,
  timeout: 60000,
  reporter: "list",
  outputDir: "test-results/sandbox",
  use: {
    baseURL: "http://localhost:5180",
    headless: true,
    channel: process.env.PLAYWRIGHT_SANDBOX_CHANNEL || "msedge",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
