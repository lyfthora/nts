const esbuild = require("esbuild");

async function buildAll() {
  const entries = [
    { in: "src/ui/main/main.tsx", out: "src/windows/home/bundle.js" },
    {
      in: "src/ui/dashboard/dashboard.tsx",
      out: "src/windows/dashboard/bundle.js",
    },
    { in: "src/ui/note/note.tsx", out: "src/windows/note/bundle.js" },
    {
      in: "src/ui/notes-list/notes-list.tsx",
      out: "src/windows/notes-list/bundle.js",
    },
    {
      in: "src/ui/reminders-list/reminders-list.tsx",
      out: "src/windows/reminders-list/bundle.js",
    },
  ];

  for (const e of entries) {
    await esbuild.build({
      entryPoints: [e.in],
      outfile: e.out,
      bundle: true,
      platform: "browser",
      target: ["es2020"],
      format: "iife",
      sourcemap: false,
    });
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
