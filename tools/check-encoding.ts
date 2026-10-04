import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const ROOT = process.cwd();
const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.htm', '.css',
  '.md', '.prisma', '.sql', '.yml', '.yaml', '.ps1', '.bat', '.txt'
]);
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'runtime', '_audit_backups']);
const decoder = new TextDecoder('utf-8', { fatal: true });
const bad: string[] = [];

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      try {
        decoder.decode(fs.readFileSync(full));
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
