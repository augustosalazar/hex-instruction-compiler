import { defineConfig } from "tsup";

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    tsconfig: "./tests/tsconfig.build.json",
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: true
})