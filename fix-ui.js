const fs = require('fs');

console.log('🔧 Corrigindo interface dos Segmentos...');

// 1. Atualizar app-v3.js com as funções corretas e botões
const appJsPath = 'public/app-v3.js';
let appJs = fs.readFileSync(appJsPath, 'utf8');

const newSegmentFunctions = `
// === FUNÇÕES DE SEGMENTOS (ATUALIZADAS) ===
async function loadSegments() {
    try {
        const res = await fetch(API_BASE + '/segments');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        const listDiv = document.getElementById('segments-list');
        const filterSelect = document.getElementById('seg-filter');
        if (!listDiv || !filterSelect) return;
        
        if (!data.segments || data.segments.length === 0) {
            listDiv.innerHTML = '<p>Nenhum segmento cadastrado.</p>';
            return;
        }
        
        let html = '';
        filterSelect.innerHTML = '<option value="">Todos os segmentos</option>';
        
        data.segments.forEach(seg => {
            const emoji = seg.icon || '📦';
            const color = seg.color || '#2563eb';
            const safeName = seg.name.replace(/'/g, "\\'");
            const safeDesc = (seg.description || '').replace(/'/g, "\\'");
            const safeIcon = (seg.icon || '').replace(/'/g, "\\'");
            
            html += '<div class="metric-card" style="border-left: 4px solid ' + color + ';">';
            html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
            html += '<div style="flex: 1;">';
            html += '<h3 style="margin: 0; font-size: 18px;">' + emoji + ' ' + seg.name + '</h3>';
            html += '<p style="font-size: 14px; color: #666; margin: 5px 0;">' + seg.description + '</p>';
            html += '<p style="margin-top: 10px; font-weight: bold; color: ' + color + ';">' + seg._count.products + ' produtos</p>';
            html += '</div>';
            html += '<div style="display: flex; gap: 8px; flex-shrink: 0;">';
            html += '<button onclick="editSegment(\\'' + seg.id + '\\', \\'' + safeName + '\\', \\'' + safeDesc + '\\', \\'' + color + '\\', \\'' + safeIcon + '\\')" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Editar</button>';
            html += '<button onclick="deleteSegment(\\'' + seg.id + '\\')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Excluir</button>';
            html += '</div></div></div>';
            
            const option = document.createElement('option');
            option.value = seg.id;
            option.textContent = emoji + ' ' + seg.name + ' (' + seg._count.products + ')';
            filterSelect.appendChild(option);
        });
        listDiv.innerHTML = html;
    } catch (err) {
        console.error('Erro ao carregar segmentos:', err);
    }
}

async function editSegment(id, name, desc, color, icon) {
    const newName = prompt('Nome do segmento:', name);
    if (!newName) return;
    const newDesc = prompt('Descrição:', desc);
    const newColor = prompt('Cor (ex: #7c3aed):', color);
    const newIcon = prompt('Ícone (emoji):', icon);
    
    try {
        const res = await fetch(API_BASE + '/segments/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, description: newDesc, color: newColor, icon: newIcon })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Segmento atualizado!');
        loadSegments();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function deleteSegment(id) {
    if (!confirm('Tem certeza que deseja excluir este segmento?\\n\\nIsso NÃO apagará os produtos vinculados.')) return;
    try {
        const res = await fetch(API_BASE + '/segments/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Segmento excluído!');
        loadSegments();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}
`;

// Remove funções antigas de segmento se existirem e adiciona as novas
appJs = appJs.replace(/\/\/ === FUNÇÕES DE SEGMENTOS[\s\S]*?async function loadProductsBySegment/, newSegmentFunctions + '\nasync function loadProductsBySegment');
if (!appJs.includes('// === FUNÇÕES DE SEGMENTOS')) {
    appJs = appJs.replace('async function loadProductsBySegment', newSegmentFunctions + '\nasync function loadProductsBySegment');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✅ JavaScript atualizado com sucesso!');

// 2. Garantir que o HTML tenha o input de emoji correto
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

if (html.includes('placeholder="💎"')) {
    console.log('✅ HTML já está correto.');
} else {
    html = html.replace(/placeholder="[^"]*"/g, (match) => {
        if (match.includes('seg-icon')) return 'placeholder="💎" value="💎"';
        return match;
    });
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✅ HTML atualizado com o emoji correto!');
}

console.log('\n🎉 CONCLUÍDO! Agora reinicie o servidor (Ctrl+C e npm start) e teste a aba Segmentos.');