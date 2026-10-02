import { execFileSync } from 'node:child_process';

const root = process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script: string, args: string[] = []) {
  console.log(`\\n>>> ${script} ${args.join(' ')}`);
  execFileSync(npm, ['run', script, ...args], { cwd: root, stdio: 'inherit' });
}

run('typecheck');
run('build');
run('test', ['--', '--runInBand', '--forceExit']);
console.log('\\nPASS — auditoria completa concluída.');
