const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

console.log('🔧 Iniciando correção de emojis...\n');

// 1. Corrigir HTML - usar HTML entity do emoji 💎
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Substituir placeholder corrompido por HTML entity
html = html.replace(/placeholder="[^"]*"/g, function(match) {
  if (match.includes('seg-icon')) {
    return 'placeholder="&#x1F48E;" value="&#x1F48E;"';
  }
  return match;
});

// Garantir que o value também esteja correto
html = html.replace(/value="[^"]*"/g, function(match) {
  if (match.includes('seg-icon')) {
    return 'value="&#x1F48E;"';
  }
  return match;
});

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✅ HTML corrigido (emoji 💎 via HTML entity)');

// 2. Corrigir banco de dados
async function fixDatabase() {
  const prisma = new PrismaClient();
  try {
    const segments = await prisma.productSegment.findMany();
    console.log('\n📊 Encontrados ' + segments.length + ' segmento(s) no banco');
    
    let fixed = 0;
    for (const seg of segments) {
      let needsFix = false;
      let newIcon = seg.icon;
      let newName = seg.name;
      let newDesc = seg.description;
      
      // Detectar caracteres mojibake (Â, Ã, etc.)
      if (seg.icon && /[ÂÃ]/.test(seg.icon)) {
        newIcon = '💎';
        needsFix = true;
      }
      if (seg.name && /[ÂÃ]/.test(seg.name)) {
        newName = seg.name.replace(/[ÂÃ][^\s]*/g, '').trim() || 'Segmento';
        needsFix = true;
      }
      if (seg.description && /[ÂÃ]/.test(seg.description)) {
        newDesc = seg.description.replace(/[ÂÃ][^\s]*/g, '');
        needsFix = true;
      }
      
      if (needsFix) {
        await prisma.productSegment.update({
          where: { id: seg.id },
          data: { icon: newIcon, name: newName, description: newDesc }
        });
        console.log('   🔧 Corrigido: "' + seg.name + '" -> "' + newName + '" (ícone: ' + newIcon + ')');
        fixed++;
      }
    }
    
    console.log('\n✅ ' + fixed + ' segmento(s) corrigido(s) no banco');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase().then(() => {
  console.log('\n CONCLUÍDO!');
  console.log('\nPróximos passos:');
  console.log('1. Reinicie o servidor: Ctrl+C e depois npm start');
  console.log('2. No navegador: Ctrl+Shift+R (recarregar forçado)');
  console.log('3. Para inserir emojis: pressione WIN + . (ponto)');
});