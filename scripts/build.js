const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

async function buildAll(watch = false) {
  const entries = [
    { in: "src/renderer/index.tsx", out: "src/renderer/index.js" },
  ];

  const copyIcons = () => {
    const iconsDir = path.join(__dirname, "../src/renderer/assets/icons");
    const distDir = path.join(__dirname, "../dist");

    const iconFiles = ["button.png", "pause.png", "checked.png", "remove.png"];
    for (const icon of iconFiles) {
      const src = path.join(iconsDir, icon);
      const dest = path.join(distDir, icon);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
  };

  for (const e of entries) {
    const buildOptions = {
      entryPoints: [e.in],
      outdir: "dist",
      entryNames: "[name]",
      splitting: true,
      bundle: true,
      platform: "browser",
      target: ["es2020"],
      format: "esm",
      loader: {
        '.png': 'file',
        '.css': 'css'
      },
      sourcemap: false,
    };

    if (watch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log("👀 Watching for changes...");

      // Copy icons on first build
      copyIcons();
    } else {
      await esbuild.build(buildOptions);
      copyIcons();
      console.log("Build completed successfully!");
    }
  }
}

const watchMode = process.argv.includes('--watch');
buildAll(watchMode).catch((err) => {
  console.error(err);
  process.exit(1);
});
