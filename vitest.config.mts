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
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: ["src/lib/supabase/**", "src/lib/prisma.ts", "src/**/*.test.*"],
    },
  },
});
