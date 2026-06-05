import * as esbuild from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");
await mkdir("dist", { recursive: true });

const mainOpts = {
  entryPoints: ["src/main/code.ts"],
  outfile: "dist/code.js",
  bundle: true,
  format: "iife",
  target: "es2017",
  tsconfig: "tsconfig.main.json",
};

async function buildUi() {
  const result = await esbuild.build({
    entryPoints: ["src/ui/main.ts"],
    bundle: true,
    format: "iife",
    target: "es2017",
    write: false,
    tsconfig: "tsconfig.ui.json",
  });
  const js = result.outputFiles[0].text;
  const template = await readFile("src/ui/ui.html", "utf8");
  const html = template.replace("/*__BUNDLE__*/", () => js);
  await writeFile("dist/ui.html", html);
}

if (watch) {
  const ctx = await esbuild.context(mainOpts);
  await ctx.watch();
  await buildUi();
  console.log("watching… (re-run `npm run dev` to rebuild ui after ui changes)");
} else {
  await esbuild.build(mainOpts);
  await buildUi();
  console.log("build complete: dist/code.js + dist/ui.html");
}
