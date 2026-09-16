const fs = require('fs');
const https = require('https');

console.log('Testando Gemini com modelo atualizado...\n');

const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
if (!apiKeyMatch) {
    console.log('ERRO: GEMINI_API_KEY nao encontrada no .env');
    process.exit(1);
}
const apiKey = apiKeyMatch[1].trim();

const model = 'gemini-1.5-flash';
const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

const prompt = 'Voce e um especialista em marketing de luxo.\n\nCrie um texto curto de WhatsApp para vender:\n- Produto: Perfume Chanel Nº 5\n- Segmento: Perfumes Importados\n- Publico: Mulheres sofisticadas de alta renda\n- Tom: Sofisticado, exclusivo, luxuoso\n\nRetorne APENAS o texto, sem explicacoes.';

const postData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512
    }
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.candidates && json.candidates[0] && json.candidates[0].content) {
                console.log('SUCESSO! A IA esta funcionando perfeitamente!');
                console.log('\nTexto gerado:');
                console.log('----------------------------------------');
                console.log(json.candidates[0].content.parts[0].text);
                console.log('----------------------------------------');
            } else {
                console.log('Resposta inesperada da IA:');
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log('Erro ao ler resposta:', e.message);
            console.log('Resposta bruta:', data);
        }
    });
});

req.on('error', (e) => {
    console.log('Erro na conexao:', e.message);
});

req.write(postData);
req.end();