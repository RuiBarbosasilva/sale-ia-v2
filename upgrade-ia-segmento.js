const fs = require('fs');

console.log('🧠 Atualizando IA para ser consciente de Segmentos...\n');

// 1. Atualizar o Serviço de Criativos
const servicePath = 'src/services/creativeGeneratorService.ts';
let service = fs.readFileSync(servicePath, 'utf8');

// Adicionar lógica de estilo por segmento no prompt
const newPromptLogic = `
    // Definir estilo baseado no segmento
    let styleHint = "Profissional e direto";
    const segLower = request.segment.toLowerCase();
    if (segLower.includes('perfume') || segLower.includes('luxo') || segLower.includes('joia')) {
      styleHint = "Sofisticado, exclusivo, luxuoso e elegante";
    } else if (segLower.includes('brinde') || segLower.includes('corporativo')) {
      styleHint = "Profissional, prático, focado em custo-benefício e parceria";
    } else if (segLower.includes('tecnologia') || segLower.includes('eletrônico')) {
      styleHint = "Inovador, moderno, focado em specs e performance";
    }

    const prompt = \`Você é um especialista em marketing digital e copywriting de alta conversão.
    
Crie materiais de venda para o seguinte produto:
- Produto: \${request.productName}
- Segmento: \${request.segment}
- Público-alvo: \${request.targetAudience}
- Tom de voz obrigatório: \${styleHint} (Adapte a linguagem para este estilo)

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem explicações):
{
  "whatsappScript": "Texto curto e persuasivo para WhatsApp (max 500 caracteres) com emoji e CTA claro",
  "emailSubject": "Assunto de email curto e chamativo (max 60 caracteres)",
  "emailBody": "Corpo do email profissional com problema, solução e CTA (max 800 caracteres)",
  "socialPost": "Post para Instagram/Facebook com hashtags (max 300 caracteres)",
  "cta": "Frase curta de chamada para ação (max 50 caracteres)"
}\`;`;

// Substituir o prompt antigo pelo novo
service = service.replace(/const prompt = `[\s\S]*?`\;/, newPromptLogic);

fs.writeFileSync(servicePath, service, 'utf8');
console.log('✅ Serviço de Criativos atualizado com lógica de segmentos');

// 2. Atualizar o Frontend (HTML) para mostrar o segmento selecionado
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Adicionar campo de Segmento na aba de Criativos, se não existir
if (!html.includes('id="cr-segment-select"')) {
    const segmentSelectHtml = `
                <div class="input-group">
                    <label>Segmento do Produto</label>
                    <select id="cr-segment-select" style="padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="Geral">Geral</option>
                    </select>
                </div>`;
    
    // Inserir antes do botão de gerar
    html = html.replace(
        /(<button class="action-btn" onclick="generateCreative\(\)">Gerar Criativo<\/button>)/,
        segmentSelectHtml + '\n                $1'
    );
    console.log('✅ Seletor de Segmento adicionado ao formulário de Criativos');
}

fs.writeFileSync(htmlPath, html, 'utf8');

// 3. Atualizar o JavaScript para carregar segmentos e usar no prompt
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

if (!js.includes('loadSegmentsForCreative')) {
    const creativeJsUpdate = `
// Carregar segmentos no select de criativos
async function loadSegmentsForCreative() {
    try {
        const res = await fetch(API_BASE + '/segments');
        if (!res.ok) return;
        const data = await res.json();
        const select = document.getElementById('cr-segment-select');
        if (!select) return;
        
        select.innerHTML = '<option value="Geral">Geral</option>';
        data.segments.forEach(seg => {
            const option = document.createElement('option');
            option.value = seg.name;
            option.textContent = seg.icon + ' ' + seg.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Erro ao carregar segmentos para criativos:', err);
    }
}

// Sobrescrever a função generateCreative para usar o segmento
const originalGenerateCreative = generateCreative;
generateCreative = async function() {
    const productName = document.getElementById('cr-product').value.trim();
    const segmentSelect = document.getElementById('cr-segment-select');
    const segment = segmentSelect ? segmentSelect.value : document.getElementById('cr-segment').value.trim();
    const targetAudience = document.getElementById('cr-audience').value.trim();
    const tone = document.getElementById('cr-tone').value;
    
    if (!productName || !segment || !targetAudience) { 
        alert('Preencha produto, segmento e público-alvo'); 
        return; 
    }

    const resultDiv = document.getElementById('creative-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>🧠 A IA está adaptando o texto para o segmento: <strong>' + segment + '</strong>...</p>';

    try {
        const res = await fetch(API_BASE + '/creatives/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName, segment, targetAudience, tone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        if (!data.success || !data.creative) throw new Error('Resposta inválida da API');

        const c = data.creative;
        let html = '<h3>Criativo Gerado (Personalizado)</h3><div style="margin-top: 15px;">';
        html += '<h4>WhatsApp:</h4><p style="background: #f0fdf4; padding: 10px; border-radius: 6px; margin: 10px 0;">' + c.whatsappScript + '</p>';
        html += '<h4>Assunto Email:</h4><p style="background: #eff6ff; padding: 10px; border-radius: 6px; margin: 10px 0;">' + c.emailSubject + '</p>';
        html += '<h4>Corpo Email:</h4><p style="background: #eff6ff; padding: 10px; border-radius: 6px; margin: 10px 0; white-space: pre-wrap;">' + c.emailBody + '</p>';
        html += '<h4>Post Social:</h4><p style="background: #fdf4ff; padding: 10px; border-radius: 6px; margin: 10px 0;">' + c.socialPost + '</p>';
        html += '<h4>CTA:</h4><p style="background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; font-weight: bold;">' + c.cta + '</p>';
        html += '</div>';
        resultDiv.innerHTML = html;
    } catch (err) {
        resultDiv.innerHTML = '<p style="color: red; background: #fee2e2; padding: 15px; border-radius: 6px;"><strong>Erro:</strong> ' + err.message + '</p>';
    }
}

// Chamar carregamento dos segmentos quando a aba de criativos for aberta
const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    if (sectionId === 'creatives') {
        setTimeout(loadSegmentsForCreative, 100);
    }
}
`;
    js += creativeJsUpdate;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('✅ JavaScript atualizado para usar segmentos nos criativos');
}

console.log('\n🎉 CONCLUÍDO!');
console.log('1. Reinicie o servidor (Ctrl+C e depois npm start)');
console.log('2. No navegador: Ctrl+Shift+R');
console.log('3. Vá na aba "Criativos IA" e veja o novo campo "Segmento do Produto"!');
console.log('4. A IA agora adaptará o tom (ex: Luxuoso para Perfumes, Prático para Brindes).');