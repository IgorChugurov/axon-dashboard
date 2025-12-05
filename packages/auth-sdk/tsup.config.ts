import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server/index.ts",
    client: "src/client/index.ts",
    components: "src/components/index.tsx",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "next",
    "@supabase/ssr",
    "@supabase/supabase-js",
  ],
  treeshake: true,
});

