import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.htm', '.css',
  '.md', '.prisma', '.sql', '.yml', '.yaml', '.ps1', '.bat', '.txt'
]);
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'runtime', '_audit_backups']);

function score(text: string): number {
  return (text.match(/(?:Ã|Â|â€|â„|â„¢|âš|âœ|âž|ðŸ|ã£|ã‚|Â£|Â©)/g) || []).length;
}

function repair(text: string): string {
  let current = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < 6; i++) {
    const before = score(current);
    if (!before) break;
    try {
      const candidate = Buffer.from(current, 'latin1').toString('utf8');
      const after = score(candidate);
      if (after < before) current = candidate;
      else break;
    } catch {
      break;
    }
  }
  return current.replace(/^\uFEFF/, '');
}

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    const bytes = fs.readFileSync(full);
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      text = Buffer.from(bytes).toString('latin1');
    }
    const fixed = repair(text);
    if (fixed !== text || bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      fs.writeFileSync(full, fixed, { encoding: 'utf8' });
      console.log('[encoding-repair]', path.relative(ROOT, full));
    }
  }
}

walk(ROOT);
