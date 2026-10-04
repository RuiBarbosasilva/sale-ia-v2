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
        const bytes = fs.readFileSync(full);
        if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
          bad.push(path.relative(ROOT, full) + ' [BOM]');
          continue;
        }
        const text = decoder.decode(bytes);
        if (/[ÃÂâð�]/.test(text)) bad.push(path.relative(ROOT, full) + ' [MOJIBAKE]');
      } catch (error) {
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
console.log('UTF-8 CHECK PASSED — no BOM, invalid UTF-8 or common mojibake markers found.');
