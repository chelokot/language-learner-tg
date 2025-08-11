import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "json-summary", "lcov"],
    },
    exclude: ["./build/**", "./stryker-tmp/**", "./node_modules/**"],
  },
});
