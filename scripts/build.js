const esbuild = require('esbuild');

async function buildAll() {
  const entries = [
    { in: 'src/renderer/note-main-react.tsx', out: 'src/renderer/note-main-react.js' },
    { in: 'src/dashboard/dashboard-react.tsx', out: 'src/dashboard/dashboard-react.js' },
    { in: 'src/notes/note-react.tsx', out: 'src/notes/note-react.js' },
    { in: 'src/notes-list/notes-list-react.tsx', out: 'src/notes-list/notes-list-react.js' },
    { in: 'src/reminders-list/reminders-list-react.tsx', out: 'src/reminders-list/reminders-list-react.js' },
  ];

  for (const e of entries) {
    await esbuild.build({
      entryPoints: [e.in],
      outfile: e.out,
      bundle: true,
      platform: 'browser',
      target: ['es2020'],
      format: 'iife',
      sourcemap: false,
    });
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

