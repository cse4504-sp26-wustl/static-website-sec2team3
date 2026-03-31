import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@domain": path.resolve(__dirname, "src/domain"),
      "@application": path.resolve(__dirname, "src/application"),
      "@adapters": path.resolve(__dirname, "src/adapters"),
      "@ui": path.resolve(__dirname, "src/ui")
    }
  },
  base: "./",
  test: {
    environment: "node",
    globals: true
  }
});
