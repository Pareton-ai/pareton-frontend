import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Parsers live in parse.ts so they can run outside RSC / server-only.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
