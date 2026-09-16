const https = require('https');
const fs = require('fs');

console.log('Buscando modelos disponiveis para sua API Key...\n');

const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
if (!apiKeyMatch) {
    console.log('ERRO: GEMINI_API_KEY nao encontrada no .env');
    process.exit(1);
}
const apiKey = apiKeyMatch[1].trim();

// Endpoint para listar modelos
const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('✅ Modelos disponiveis que suportam "generateContent":\n');
                const validModels = json.models.filter(m => 
                    m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
                );
                
                if (validModels.length === 0) {
                    console.log('Nenhum modelo encontrado. Verifique se sua API Key esta ativa e com permissao.');
                } else {
                    validModels.forEach(m => {
                        console.log('-> ' + m.name.replace('models/', ''));
                    });
                    console.log('\n💡 Recomendação: Use "gemini-pro" ou "gemini-1.5-flash-latest" no seu codigo.');
                }
            } else {
                console.log('Erro na resposta da API:');
                console.log(data);
            }
        } catch (e) {
            console.log('Erro ao processar resposta:', e.message);
            console.log('Resposta bruta:', data);
        }
    });
}).on('error', (e) => {
    console.log('Erro na conexao:', e.message);
});