const fs = require('fs');

console.log('🔧 Adicionando aba Financeiro...\n');

// 1. Atualizar HTML
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const financialButton = '<button class="nav-btn" onclick="showSection(\'financial\')">Financeiro</button>';

// Adicionar botão antes do fechamento do menu
if (!html.includes("showSection('financial')")) {
    const lastNavIndex = html.lastIndexOf('</nav>');
    if (lastNavIndex !== -1) {
        html = html.slice(0, lastNavIndex) + '\n            ' + financialButton + '\n        ' + html.slice(lastNavIndex);
        console.log('✅ Botão Financeiro adicionado ao menu');
    }
} else {
    console.log('✅ Botão Financeiro já existe no menu');
}

// Adicionar a seção antes do fechamento do main
const financialSection = `
        <!-- FINANCEIRO -->
        <section id="financial" class="section">
            <h2>Dashboard Financeiro por Segmento</h2>
            <div class="metrics-grid" style="margin-bottom: 30px;">
                <div class="metric-card" style="border-left: 4px solid #10b981;">
                    <h3>Receita Total (Estoque)</h3>
                    <p id="fin-total-revenue" style="font-size: 32px; color: #10b981;">R$ 0,00</p>
                </div>
                <div class="metric-card" style="border-left: 4px solid #3b82f6;">
                    <h3>Lucro Potencial</h3>
                    <p id="fin-total-profit" style="font-size: 32px; color: #3b82f6;">R$ 0,00</p>
                </div>
                <div class="metric-card" style="border-left: 4px solid #f59e0b;">
                    <h3>Margem Média</h3>
                    <p id="fin-avg-margin" style="font-size: 32px; color: #f59e0b;">0%</p>
                </div>
                <div class="metric-card" style="border-left: 4px solid #8b5cf6;">
                    <h3>Segmentos</h3>
                    <p id="fin-total-segments" style="font-size: 32px; color: #8b5cf6;">0</p>
                </div>
            </div>
            <h3 style="margin-bottom: 20px;">Desempenho por Segmento</h3>
            <div id="financial-segments-list" class="result-box"><p>Carregando...</p></div>
            <h3 style="margin: 30px 0 20px 0;">Top 10 Produtos com Maior Estoque</h3>
            <div id="financial-top-products" class="result-box"><p>Carregando...</p></div>
            <button class="action-btn" onclick="loadFinancialData()" style="margin-top: 20px; background: #10b981;">Atualizar Dados</button>
        </section>
`;

if (!html.includes('id="financial"')) {
    const lastMainIndex = html.lastIndexOf('</main>');
    if (lastMainIndex !== -1) {
        html = html.slice(0, lastMainIndex) + financialSection + '\n    ' + html.slice(lastMainIndex);
        console.log('✅ Seção Financeiro adicionada ao HTML');
    }
} else {
    console.log('✅ Seção Financeiro já existe no HTML');
}

fs.writeFileSync(htmlPath, html, 'utf8');

// 2. Garantir que o JavaScript esteja no app-v3.js
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

if (!js.includes('async function loadFinancialData()')) {
    const financialJs = `
async function loadFinancialData() {
    try {
        const res = await fetch(API_BASE + '/financial/by-segment');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        document.getElementById('fin-total-revenue').textContent = 'R$ ' + parseFloat(data.grandTotal.totalRevenue).toFixed(2).replace('.', ',');
        document.getElementById('fin-total-profit').textContent = 'R$ ' + parseFloat(data.grandTotal.totalProfit).toFixed(2).replace('.', ',');
        document.getElementById('fin-avg-margin').textContent = data.grandTotal.avgMargin + '%';
        document.getElementById('fin-total-segments').textContent = data.grandTotal.totalSegments;
        
        const listDiv = document.getElementById('financial-segments-list');
        let html = '<table class="data-table"><thead><tr><th>Segmento</th><th>Produtos</th><th>Estoque</th><th>Receita</th><th>Custo</th><th>Lucro</th><th>Margem</th></tr></thead><tbody>';
        
        data.report.forEach(r => {
            const marginColor = parseFloat(r.marginPercent) > 30 ? 'green' : parseFloat(r.marginPercent) > 15 ? 'orange' : 'red';
            html += '<tr style="border-left: 4px solid ' + r.segmentColor + ';">';
            html += '<td><strong>' + r.segmentIcon + ' ' + r.segmentName + '</strong></td>';
            html += '<td>' + r.totalProducts + '</td>';
            html += '<td>' + r.totalStock + ' un</td>';
            html += '<td>R$ ' + parseFloat(r.totalRevenue).toFixed(2).replace('.', ',') + '</td>';
            html += '<td>R$ ' + parseFloat(r.totalCost).toFixed(2).replace('.', ',') + '</td>';
            html += '<td style="color: green; font-weight: bold;">R$ ' + parseFloat(r.profit).toFixed(2).replace('.', ',') + '</td>';
            html += '<td style="color: ' + marginColor + '; font-weight: bold;">' + r.marginPercent + '%</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        listDiv.innerHTML = html;
        
        const topRes = await fetch(API_BASE + '/financial/top-products');
        if (topRes.ok) {
            const topData = await topRes.json();
            const topDiv = document.getElementById('financial-top-products');
            let topHtml = '<table class="data-table"><thead><tr><th>#</th><th>Produto</th><th>Segmento</th><th>Estoque</th><th>Receita Potencial</th></tr></thead><tbody>';
            
            topData.ranking.forEach((p, index) => {
                topHtml += '<tr>';
                topHtml += '<td style="font-weight: bold; font-size: 18px;">' + (index + 1) + '</td>';
                topHtml += '<td><strong>' + p.name + '</strong></td>';
                topHtml += '<td>' + p.segmentIcon + ' ' + p.segment + '</td>';
                topHtml += '<td>' + p.stock + ' un</td>';
                topHtml += '<td style="color: green; font-weight: bold;">R$ ' + parseFloat(p.potentialRevenue).toFixed(2).replace('.', ',') + '</td>';
                topHtml += '</tr>';
            });
            topHtml += '</tbody></table>';
            topDiv.innerHTML = topHtml;
        }
    } catch (err) {
        console.error('Erro financeiro:', err);
    }
}
`;
    js += financialJs;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('✅ Função loadFinancialData adicionada ao JavaScript');
} else {
    console.log('✅ Função loadFinancialData já existe no JavaScript');
}

console.log('\n🎉 CONCLUÍDO!');
console.log('1. Reinicie o servidor (Ctrl+C e depois npm start)');
console.log('2. No navegador: Ctrl+Shift+R (recarregamento forçado)');
console.log('3. A aba "Financeiro" aparecerá no final do menu!');