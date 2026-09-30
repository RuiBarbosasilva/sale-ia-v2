'use strict';
const fs = require('fs');

function countMojibake(str) {
  const patterns = [/Ã./g, /â€./g, /â€"/g, /Â./g, /ðŸ/g];
  let count = 0;
  for (const p of patterns) {
    const m = str.match(p);
    if (m) count += m.length;
  }
  return count;
}

function tryFixMojibake(str) {
  try {
    const buf = Buffer.from(str, 'latin1');
    return buf.toString('utf8');
  } catch (e) {
    return null;
  }
}

function readRawUtf8(file) {
  const buf = fs.readFileSync(file);
  let start = 0;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    start = 3;
  }
  return buf.slice(start).toString('utf8');
}

function analyze(file) {
  if (!file || !fs.existsSync(file)) return null;
  const content = readRawUtf8(file);
  return { file, content, mojibake: countMojibake(content) };
}

function main() {
  const target = process.argv[2];
  const backup = process.argv[3];

  if (!target) {
    console.error('Uso: node repair-encoding.js <arquivo> [arquivo-backup-opcional]');
    process.exit(1);
  }

  const a = analyze(target);
  if (!a) {
    console.error('Arquivo nao encontrado:', target);
    process.exit(1);
  }
  const b = backup ? analyze(backup) : null;

  console.log('== ANALISE ==');
  console.log(`${target} -> ocorrencias de mojibake: ${a.mojibake}`);
  if (b) console.log(`${backup} -> ocorrencias de mojibake: ${b.mojibake}`);

  let base = a;
  let baseLabel = 'arquivo atual';
  if (b && b.mojibake < a.mojibake) {
    base = b;
    baseLabel = 'backup';
  }
  console.log(`\n>> Usando ${baseLabel} como base (menos mojibake).`);

  let finalContent = base.content;
  let status = 'sem alteracao (sem mojibake detectado)';

  if (base.mojibake > 0) {
    const fixed = tryFixMojibake(base.content);
    const fixedCount = fixed ? countMojibake(fixed) : Infinity;
    console.log('Apos tentativa de correcao, mojibake residual:', fixedCount);

    if (fixed && fixedCount < base.mojibake) {
      finalContent = fixed;
      status = `corrigido (${base.mojibake} -> ${fixedCount} ocorrencias)`;
    } else {
      status = 'FALHOU: correcao automatica nao reduziu o mojibake. Nao aplicada.';
      console.log('\n>> ATENCAO: nao foi possivel corrigir automaticamente este arquivo.');
      console.log('>> Isso pode indicar corrupcao dupla (2 passadas) ou perda de bytes.');
    }
  }

  const outFile = target + '.utf8-fixed';
  fs.writeFileSync(outFile, finalContent, { encoding: 'utf8' });
  console.log('\nStatus:', status);
  console.log('Arquivo de saida (NAO sobrescreve o original):', outFile);
  console.log('\nProximo passo: abra o .utf8-fixed em um editor UTF-8 (ex: VSCode)');
  console.log('e confira visualmente "Operação", "Prospecção", os icones, etc.');
  console.log('Só depois de validar, substitua o arquivo original manualmente.');
}

main();
