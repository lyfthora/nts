const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

// esbuild define `process.env.NODE_ENV` como "development" salvo que se
// minifique, así que el bundle de release incluía React de desarrollo: cada
// render se duplicaba por StrictMode y arrastraba comprobaciones y avisos que
// no existen en producción. En release se compila en modo producción; con
// `pnpm dev` (--watch) se mantiene desarrollo para conservar esos mensajes.
const watchMode = process.argv.includes("--watch");
const devBuild =
  watchMode ||
  process.argv.includes("--dev") ||
  process.env.NODE_ENV === "development";

async function buildAll(watch = false) {
  const entries = [
    { in: "src/renderer/index.tsx", out: "src/renderer/index.js" },
  ];

  const copyIcons = () => {
    const iconsDir = path.join(__dirname, "../src/renderer/assets/icons");
    const distDir = path.join(__dirname, "../dist");

    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    const iconFiles = ["button.png", "pause.png", "checked.png", "remove.png"];
    for (const icon of iconFiles) {
      const src = path.join(iconsDir, icon);
      const dest = path.join(distDir, icon);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }

    const htmlSrc = path.join(__dirname, "../src/renderer/index.html");
    const htmlDest = path.join(distDir, "index.html");
    if (fs.existsSync(htmlSrc)) {
      fs.copyFileSync(htmlSrc, htmlDest);
    }
  };

  // Limpia bundles con hash de builds anteriores (ej. BrainGraph-*.js
  // huérfanos): solo en build release, nunca en watch.
  if (!watch) {
    const distDir = path.join(__dirname, "../dist");
    if (fs.existsSync(distDir)) {
      for (const f of fs.readdirSync(distDir)) {
        if (/\.(js|css|map)$/.test(f)) {
          fs.rmSync(path.join(distDir, f), { force: true });
        }
      }
    }
  }

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
        ".png": "file",
        ".css": "css",
        ".woff2": "file",
        ".woff": "file",
        ".ttf": "file",
        ".eot": "file",
        ".gif": "file",
      },
      sourcemap: false,
      // Release minificado (menor parse/heap); en dev/watch se mantiene legible y rápido.
      minify: !devBuild,
      define: {
        "process.env.NODE_ENV": JSON.stringify(devBuild ? "development" : "production"),
        "process.env.NTS_API_URL": JSON.stringify(process.env.NTS_API_URL || ""),
      },
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

buildAll(watchMode).catch((err) => {
  console.error(err);
  process.exit(1);
});
