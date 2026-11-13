import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    // Windows: the default `forks` pool boots workers from the CLI path (`d:\` when VS Code
    // opens the folder lowercase) while Vite resolves test imports to `D:\`, so Node loads two
    // copies of the runner and every suite fails with "reading 'config'". vmThreads loads the
    // runner inside each context and avoids it. Other platforms keep the default pool.
    pool: process.platform === "win32" ? "vmThreads" : "forks",
  },
});
