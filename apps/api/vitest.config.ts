import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Tests always use the root .env.test (database dawry_test), never .env.
process.loadEnvFile(resolve(import.meta.dirname, "../../.env.test"));

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/helpers/global-setup.ts"],
    // All files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
