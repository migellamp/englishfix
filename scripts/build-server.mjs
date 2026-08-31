import { build } from "esbuild";

await build({
  entryPoints: ["server/worker.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  conditions: ["worker", "browser", "import"],
  sourcemap: false,
  legalComments: "none",
});
