const esbuild = require("esbuild");

async function buildAll() {
  const entries = [
    { in: "src/renderer/index.tsx", out: "src/renderer/index.js" },
  ];

  for (const e of entries) {
    await esbuild.build({
      entryPoints: [e.in],
      outdir: "dist", // Cambiado a "dist" para un directorio de salida estándar
      entryNames: "[name]", // Añadido para nombrar consistentemente la salida dividida
      splitting: true,    // Añadido para habilitar la división de CSS
      bundle: true,
      platform: "browser",
      target: ["es2020"],
      format: "esm",
      loader: { '.png': 'file' },
      sourcemap: false,
    });
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
