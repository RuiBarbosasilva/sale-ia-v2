const fs = require('fs');

console.log(' Atualizando modelo para gemini-3.6-flash...\n');

const servicePath = 'src/services/creativeGeneratorService.ts';
let service = fs.readFileSync(servicePath, 'utf8');

// Substituir qualquer versão antiga do gemini pela 3.6-flash
service = service.replace(/gemini-[\d\.a-z\-]+/g, 'gemini-3.6-flash');

fs.writeFileSync(servicePath, service, 'utf8');
console.log('✅ Modelo atualizado no creativeGeneratorService.ts');