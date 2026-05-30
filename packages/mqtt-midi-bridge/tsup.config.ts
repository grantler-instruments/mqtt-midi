import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    outDir: "dist",
  },
  {
    entry: { "mqtt-midi-bridge": "src/cli.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "es2022",
    outDir: "bin",
    splitting: false,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
