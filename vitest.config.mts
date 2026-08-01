import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// tsconfig sets `jsx: preserve` because Next owns the JSX transform in the
// app build; Vitest needs its own, hence the React plugin here.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // src/_deferred is not part of the application; its tests travel with it
    // and run again once it is restored.
    exclude: ["node_modules", ".next", "src/_deferred/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: ["src/_deferred/**", "src/**/*.test.*"],
    },
  },
});
