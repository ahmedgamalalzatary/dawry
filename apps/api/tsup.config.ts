import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/migrate.ts", "src/cli/create-admin.ts", "src/cli/seed-dev.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  // Bundle the workspace package (it ships TS source); keep npm deps external.
  noExternal: ["@dawry/shared"],
});
