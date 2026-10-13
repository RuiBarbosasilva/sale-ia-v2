import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const ROOT = process.cwd();
const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.htm', '.css',
  '.md', '.prisma', '.sql', '.yml', '.yaml', '.ps1', '.bat', '.txt'
]);
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'runtime', '_audit_backups']);
const GENERATED_SQL = new Set(['DIFF_9_MIGRATIONS_VS_DATABASE.sql', 'DIFF_BANCO_SCHEMA.sql', 'DIFF_SCHEMA_MIGRATIONS.sql', 'RECONCILE_EXISTING_DATABASE.sql']);
const decoder = new TextDecoder('utf-8', { fatal: true });
const bad: string[] = [];

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase()) && !GENERATED_SQL.has(entry.name)) {
      try {
        const text = decoder.decode(fs.readFileSync(full));
        const relative = path.relative(ROOT, full).split(path.sep).join('/');
        // UTF-8 validity alone does not detect mojibake. Scan public UI assets too.
        if (relative.startsWith('public/') && /(?:ÃƒÂ.|Ã‚.|â€[™œž“”‘’–—]|â€¦|âš™|ðŸ.)/.test(text)) {
          bad.push(relative + ' [MOJIBAKE_SUSPECTED]');
        }
      } catch {
        bad.push(path.relative(ROOT, full) + ' [INVALID_UTF8]');
      }
    }
  }
}

walk(ROOT);
if (bad.length) {
  console.error('UTF-8 CHECK FAILED');
  for (const file of bad) console.error(' - ' + file);
  process.exit(1);
}
console.log('UTF-8 CHECK PASSED — all scanned text files are valid UTF-8.');
