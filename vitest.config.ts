import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Node 25+ ships its own localStorage getter, which shadows jsdom's and is
    // undefined without --localstorage-file.
    execArgv: ["--no-experimental-webstorage"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
