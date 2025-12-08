const esbuild = require('esbuild');

async function buildAll() {
  const entries = [
    { in: 'src/ui/main/main.tsx', out: 'src/renderer/note-main-react.js' },
    { in: 'src/ui/dashboard/dashboard.tsx', out: 'src/dashboard/dashboard-react.js' },
    { in: 'src/ui/note/note.tsx', out: 'src/notes/note-react.js' },
    { in: 'src/ui/notes-list/notes-list.tsx', out: 'src/notes-list/notes-list-react.js' },
    { in: 'src/ui/reminders-list/reminders-list.tsx', out: 'src/reminders-list/reminders-list-react.js' },
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
