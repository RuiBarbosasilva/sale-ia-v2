import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const required = ['package.json', 'tsconfig.json', 'prisma/schema.prisma', 'src/app.ts'];
const missing = required.filter((file) => !existsSync(`${root}/${file}`));

console.log('SALE-IA V2 — SYSTEM AUDIT');
if (missing.length) {
  console.error('FAIL — arquivos ausentes:', missing.join(', '));
  process.exit(1);
}

try {
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'validate'], {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('PASS — Prisma schema validado.');
} catch {
  console.error('FAIL — Prisma validate falhou.');
  process.exit(1);
}

console.log('PASS — estrutura básica e Prisma válidos.');
