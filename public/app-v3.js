const API_BASE = '/api';

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    if (event && event.target) event.target.classList.add('active');
    
    if (sectionId === 'dashboard') loadDashboard();
    else if (sectionId === 'segments') loadSegments();
    else if (sectionId === 'products') loadProducts();
    else if (sectionId === 'prospecting') loadProspectingStats();
    else if (sectionId === 'creatives') {}
    else if (sectionId === 'suppliers') {}
    else if (sectionId === 'outreach') loadOutreachStats();
    else if (sectionId === 'followup') loadFollowUpStats();
    else if (sectionId === 'automation') loadAutomationData();
}

async function loadDashboard() {
    console.log('Loading dashboard...');
    const elTotal = document.getElementById('total-leads');
    const elHuman = document.getElementById('human-leads');
    const elRevenue = document.getElementById('monthly-revenue');
    const elPix = document.getElementById('pix-generated');
    const elPending = document.getElementById('pending-orders');
    const elPaid = document.getElementById('paid-orders');
    const elNewLeads = document.getElementById('new-leads');
    
    try {
        const res = await fetch(API_BASE + '/dashboard/overview');
        if (!res.ok) throw new Error('API error ' + res.status);
        const data = await res.json();
        const m = data.metrics || {};
        
        if (elTotal) elTotal.textContent = String(m.totalLeads || 0);
        if (elHuman) elHuman.textContent = String(m.humanModeLeads || 0);
        if (elRevenue) elRevenue.textContent = 'R$ ' + (Number(m.monthlyRevenue) || 0).toFixed(2).replace('.', ',');
        if (elPix) elPix.textContent = String(m.pixGenerated || 0);
        if (elPending) elPending.textContent = String(m.pendingOrders || 0);
        if (elPaid) elPaid.textContent = String(m.paidOrders || 0);
        if (elNewLeads) elNewLeads.textContent = String(m.newLeads || 0);
        console.log('Dashboard loaded successfully');
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

async function loadProducts() {
    try {
        const res = await fetch(API_BASE + '/products');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const list = document.getElementById('products-list');
        if (!list) return;
        
        if (!data.products || data.products.length === 0) {
            list.innerHTML = '<p>Nenhum produto encontrado.</p>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>Nome</th><th>Categoria</th><th>Preco Venda</th><th>Preco Custo</th><th>Margem</th><th>Estoque</th></tr></thead><tbody>';
        data.products.forEach(p => {
            const margin = p.salePrice > 0 ? (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(0) : 0;
            html += '<tr><td><strong>' + p.name + '</strong></td><td>' + (p.niche || '-') + '</td><td>R$ ' + p.salePrice.toFixed(2) + '</td><td>R$ ' + p.costPrice.toFixed(2) + '</td><td>' + margin + '%</td><td>' + p.stock + '</td></tr>';
        });
        html += '</tbody></table>';
        list.innerHTML = html;
    } catch (err) {
        console.error('Products error:', err);
    }
}

async function createProduct() {
    const name = document.getElementById('product-name').value.trim();
    const niche = document.getElementById('product-niche').value;
    const salePrice = parseFloat(document.getElementById('product-sale-price').value);
    const costPrice = parseFloat(document.getElementById('product-cost-price').value) || 0;
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    if (!name || !salePrice) { alert('Preencha nome e preco de venda'); return; }
    try {
        const res = await fetch(API_BASE + '/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, niche, salePrice, costPrice, stock })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Produto criado!');
        document.getElementById('product-name').value = '';
        document.getElementById('product-sale-price').value = '';
        document.getElementById('product-cost-price').value = '';
        document.getElementById('product-stock').value = '';
        loadProducts();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function loadProspectingStats() {
    try {
        const res = await fetch(API_BASE + '/prospecting/stats');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const s = data.stats || {};
        document.getElementById('wp-total').textContent = s.totalProspects || 0;
        document.getElementById('wp-no-site').textContent = s.withoutWebsite || 0;
        document.getElementById('wp-qualified').textContent = s.qualified || 0;
        document.getElementById('wp-demos').textContent = s.demosReady || 0;
        document.getElementById('wp-proposals').textContent = s.proposalsSent || 0;
        document.getElementById('wp-accepted').textContent = s.accepted || 0;

        const resList = await fetch(API_BASE + '/prospecting/prospects?minScore=40');
        if (resList.ok) {
            const listData = await resList.json();
            const listDiv = document.getElementById('wp-list');
            if (listData.prospects && listData.prospects.length > 0) {
                let html = '<table class="data-table"><thead><tr><th>Empresa</th><th>Cidade</th><th>Score</th><th>Nota</th><th>Status</th><th>Acoes</th></tr></thead><tbody>';
                listData.prospects.slice(0, 10).forEach(p => {
                    const gradeColor = p.scoreGrade === 'A' ? 'green' : p.scoreGrade === 'B' ? 'blue' : 'orange';
                    html += '<tr><td><strong>' + p.companyName + '</strong><br><small>' + (p.segment || '-') + '</small></td>';
                    html += '<td>' + (p.city || '-') + '</td><td>' + p.score + '</td>';
                    html += '<td><span style="font-weight:bold; color:' + gradeColor + ';">' + p.scoreGrade + '</span></td>';
                    html += '<td>' + p.status + '</td>';
                    html += '<td><button onclick="generateDemo(\'' + p.id + '\')" style="padding:5px; font-size:11px; margin-right:5px;">Demo</button>';
                    html += '<button onclick="generateProposal(\'' + p.id + '\')" style="padding:5px; font-size:11px;">Proposta</button></td></tr>';
                });
                html += '</tbody></table>';
                listDiv.innerHTML = html;
            } else {
                listDiv.innerHTML = '<p>Nenhum prospect qualificado.</p>';
            }
        }
    } catch (err) {
        console.error('Prospecting error:', err);
    }
}

async function createWebsiteProspect() {
    const companyName = document.getElementById('wp-company-name').value.trim();
    const segment = document.getElementById('wp-segment').value.trim();
    const city = document.getElementById('wp-city').value.trim();
    const phone = document.getElementById('wp-phone').value.trim();
    const currentWebsite = document.getElementById('wp-website').value.trim();
    if (!companyName) { alert('Informe o nome da empresa'); return; }
    try {
        const res = await fetch(API_BASE + '/prospecting/prospects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName, segment, city, phone, currentWebsite })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Prospect adicionado! Score: ' + data.prospect.score + ' (' + data.prospect.scoreGrade + ')');
        document.getElementById('wp-company-name').value = '';
        document.getElementById('wp-website').value = '';
        loadProspectingStats();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function generateDemo(prospectId) {
    if (!confirm('Gerar demo?')) return;
    try {
        const res = await fetch(API_BASE + '/prospecting/prospects/' + prospectId + '/demo', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Demo gerado! Versao: ' + data.demo.version);
        loadProspectingStats();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function generateProposal(prospectId) {
    if (!confirm('Gerar proposta?')) return;
    try {
        const res = await fetch(API_BASE + '/prospecting/prospects/' + prospectId + '/proposal', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Proposta gerada!');
        loadProspectingStats();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function generateCreative() {
    const productName = document.getElementById('cr-product').value.trim();
    const segment = document.getElementById('cr-segment').value.trim();
    const targetAudience = document.getElementById('cr-audience').value.trim();
    const tone = document.getElementById('cr-tone').value;
    if (!productName || !segment || !targetAudience) { alert('Preencha produto, segmento e publico-alvo'); return; }

    const resultDiv = document.getElementById('creative-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>Gerando criativo com IA...</p>';

    try {
        const res = await fetch(API_BASE + '/creatives/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName, segment, targetAudience, tone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        if (!data.success || !data.creative) throw new Error('Resposta invalida da API');

        const c = data.creative;
        let html = '<h3>Criativo Gerado</h3><div style="margin-top: 15px;">';
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

async function addSupplier() {
    const name = document.getElementById('sup-name').value.trim();
    const contactName = document.getElementById('sup-contact').value.trim();
    const phone = document.getElementById('sup-phone').value.trim();
    if (!name) { alert('Informe o nome do fornecedor'); return; }
    try {
        const res = await fetch(API_BASE + '/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, contactName, phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Fornecedor criado! ID: ' + data.supplier.id);
        document.getElementById('sup-name').value = '';
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function linkProductSupplier() {
    const productId = document.getElementById('link-product-id').value.trim();
    const supplierId = document.getElementById('link-supplier-id').value.trim();
    const costPrice = parseFloat(document.getElementById('link-cost').value);
    if (!productId || !supplierId || !costPrice) { alert('Preencha todos os campos'); return; }
    try {
        const res = await fetch(API_BASE + '/suppliers/product-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, supplierId, costPrice, minQuantity: 1, leadTimeDays: 7 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Vinculo criado! Margem recalculada.');
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function generatePurchaseReport() {
    const target = document.getElementById('target-sales').value;
    const resultDiv = document.getElementById('purchase-report-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>Analisando margens...</p>';
    try {
        const res = await fetch(API_BASE + '/suppliers/purchase-report?target=' + target);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        if (data.report.length === 0) {
            resultDiv.innerHTML = '<p>Nenhuma sugestao. Cadastre fornecedores e precos de custo primeiro.</p>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>Produto</th><th>Melhor Fornecedor</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Qtd</th><th>Investimento</th></tr></thead><tbody>';
        data.report.forEach(r => {
            html += '<tr><td><strong>' + r.productName + '</strong></td><td>' + r.supplierName + '</td><td>R$ ' + r.bestCostPrice.toFixed(2) + '</td><td>R$ ' + r.currentSalePrice.toFixed(2) + '</td><td style="color: green; font-weight: bold;">' + r.marginPercent + '%</td><td>' + r.suggestedQuantityToBuy + '</td><td>R$ ' + r.estimatedInvestment + '</td></tr>';
        });
        html += '</tbody></table>';
        resultDiv.innerHTML = html;
    } catch (err) {
        resultDiv.innerHTML = '<p style="color: red;">Erro: ' + err.message + '</p>';
    }
}

async function sendOutreachCampaign() {
    const text = document.getElementById('outreach-text').value.trim();
    const channel = document.getElementById('outreach-channel').value;
    const leadsStr = document.getElementById('outreach-leads').value.trim();
    if (!text) { alert('Cole o texto do criativo'); return; }
    if (!leadsStr) { alert('Informe os IDs dos leads'); return; }
    const leadIds = leadsStr.split(',').map(id => id.trim()).filter(id => id.length > 0);
    if (!confirm('Disparar campanha para ' + leadIds.length + ' leads via ' + channel + '?')) return;

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + '/outreach/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadIds, creativeText: text, channel })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Campanha concluida!\nEnviados: ' + data.results.sent + '\nPulados: ' + data.results.skipped + '\nErros: ' + data.results.errors);
        document.getElementById('outreach-leads').value = '';
        loadOutreachStats();
    } catch (err) {
        alert('Erro: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function loadOutreachStats() {
    try {
        const res = await fetch(API_BASE + '/outreach/stats');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const s = data.stats || {};
        document.getElementById('out-total').textContent = s.total || 0;
        document.getElementById('out-sent').textContent = s.sent || 0;
        document.getElementById('out-failed').textContent = s.failed || 0;
    } catch (err) {
        console.error('Outreach stats error:', err);
    }
}

async function runFollowUpJob() {
    if (!confirm('Executar job de follow-up agora?')) return;
    try {
        const res = await fetch(API_BASE + '/followup/run-job', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Job concluido!\nExecutados: ' + data.result.executed + '\nPulados: ' + data.result.skipped);
        loadFollowUpStats();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function loadFollowUpStats() {
    try {
        const res = await fetch(API_BASE + '/followup/stats');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const s = data.stats || {};
        document.getElementById('fu-pending').textContent = s.pending || 0;
        document.getElementById('fu-sent').textContent = s.sent || 0;
        document.getElementById('fu-skipped').textContent = s.skipped || 0;
    } catch (err) {
        console.error('FollowUp stats error:', err);
    }
}

async function analyzeResponse() {
    const text = document.getElementById('response-text').value.trim();
    if (!text) { alert('Digite uma mensagem para analisar'); return; }
    try {
        const res = await fetch(API_BASE + '/followup/analyze-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        const resultDiv = document.getElementById('response-result');
        let color = 'gray';
        if (data.classification === 'INTERESTED') color = 'green';
        if (data.classification === 'NOT_INTERESTED') color = 'red';
        if (data.classification === 'QUESTION') color = 'blue';
        resultDiv.innerHTML = 'Classificacao da IA: <span style="color: ' + color + '; font-size: 18px;">' + data.classification + '</span>';
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

// ==========================================================
// FUNÃ‡Ã•ES DE SEGMENTOS (COM EDITAR E EXCLUIR)
// ==========================================================
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
            const emoji = seg.icon || 'ðŸ“¦';
            const color = seg.color || '#2563eb';
            // Escapar aspas simples para nÃ£o quebrar o onclick
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
            html += '<button onclick="editSegment(\'' + seg.id + '\', \'' + safeName + '\', \'' + safeDesc + '\', \'' + color + '\', \'' + safeIcon + '\')" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Editar</button>';
            html += '<button onclick="deleteSegment(\'' + seg.id + '\')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Excluir</button>';
            html += '</div></div></div>';
            
            const option = document.createElement('option');
            option.value = seg.id;
            option.textContent = emoji + ' ' + seg.name + ' (' + seg._count.products + ')';
            filterSelect.appendChild(option);
        });
        listDiv.innerHTML = html;
    } catch (err) {
        console.error('Erro ao carregar segmentos:', err);
        document.getElementById('segments-list').innerHTML = '<p style="color: red;">Erro: ' + err.message + '</p>';
    }
}

async function createSegment() {
    const name = document.getElementById('seg-name').value.trim();
    const description = document.getElementById('seg-desc').value.trim();
    const color = document.getElementById('seg-color').value;
    const icon = document.getElementById('seg-icon').value.trim();
    
    if (!name) { alert('Informe o nome do segmento'); return; }
    
    try {
        const res = await fetch(API_BASE + '/segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, color, icon })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Segmento criado!');
        document.getElementById('seg-name').value = '';
        document.getElementById('seg-desc').value = '';
        loadSegments();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function editSegment(id, name, desc, color, icon) {
    const newName = prompt('Nome do segmento:', name);
    if (!newName) return;
    const newDesc = prompt('Descricao:', desc);
    const newColor = prompt('Cor (ex: #7c3aed):', color);
    const newIcon = prompt('Icone (emoji):', icon);
    
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
    if (!confirm('Tem certeza que deseja excluir este segmento?\n\nIsso NAO apagara os produtos vinculados.')) return;
    try {
        const res = await fetch(API_BASE + '/segments/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        alert('Segmento excluido!');
        loadSegments();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function loadProductsBySegment(segmentId) {
    const listDiv = document.getElementById('segment-products-list');
    if (!listDiv) return;
    
    listDiv.innerHTML = '<p>Carregando produtos...</p>';
    
    try {
        const url = segmentId ? API_BASE + '/segments/' + segmentId + '/products' : API_BASE + '/products';
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        const products = data.products || (Array.isArray(data) ? data : []);
        
        if (products.length === 0) {
            listDiv.innerHTML = '<p>Nenhum produto encontrado.</p>';
            return;
        }
        
        let html = '<table class="data-table"><thead><tr><th>Nome</th><th>Segmento</th><th>Preco Venda</th><th>Preco Custo</th><th>Margem</th><th>Estoque</th></tr></thead><tbody>';
        products.forEach(p => {
            const margin = p.salePrice > 0 ? (((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(0) : 0;
            html += '<tr><td><strong>' + p.name + '</strong></td>';
            html += '<td>' + (p.segment ? p.segment.name : (p.niche || '-')) + '</td>';
            html += '<td>R$ ' + p.salePrice.toFixed(2) + '</td>';
            html += '<td>R$ ' + p.costPrice.toFixed(2) + '</td>';
            html += '<td>' + margin + '%</td>';
            html += '<td>' + p.stock + '</td></tr>';
        });
        html += '</tbody></table>';
        listDiv.innerHTML = html;
    } catch (err) {
        listDiv.innerHTML = '<p style="color: red;">Erro: ' + err.message + '</p>';
    }
}

async function loadAutomationData() {
    console.log('Loading automation...');
}

async function createCampaign() {
    const name = document.getElementById('campaign-name').value.trim();
    if (!name) { alert('Informe o nome da campanha'); return; }
    alert('Campanha criada: ' + name);
}

async function importCSV() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    if (!file) { alert('Selecione um arquivo CSV'); return; }
    alert('Funcionalidade de importacao pronta. Selecione um CSV valido.');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('SALE-IA-V2 initialized');
    loadDashboard();
});
// DASHBOARD FINANCEIRO
async function loadFinancialData() {
    try {
        // Carregar dados por segmento
        const res = await fetch(API_BASE + '/financial/by-segment');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        // Atualizar cards principais
        document.getElementById('fin-total-revenue').textContent = 'R$ ' + parseFloat(data.grandTotal.totalRevenue).toFixed(2).replace('.', ',');
        document.getElementById('fin-total-profit').textContent = 'R$ ' + parseFloat(data.grandTotal.totalProfit).toFixed(2).replace('.', ',');
        document.getElementById('fin-avg-margin').textContent = data.grandTotal.avgMargin + '%';
        document.getElementById('fin-total-segments').textContent = data.grandTotal.totalSegments;
        
        // Listar segmentos
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
        
        // Carregar top produtos
        const topRes = await fetch(API_BASE + '/financial/top-products');
        if (topRes.ok) {
            const topData = await topRes.json();
            const topDiv = document.getElementById('financial-top-products');
            let topHtml = '<table class="data-table"><thead><tr><th>#</th><th>Produto</th><th>Segmento</th><th>Vendas</th><th>Receita</th><th>Estoque</th></tr></thead><tbody>';
            
            topData.ranking.forEach((p, index) => {
                topHtml += '<tr>';
                topHtml += '<td style="font-weight: bold; font-size: 18px;">' + (index + 1) + '</td>';
                topHtml += '<td><strong>' + p.name + '</strong></td>';
                topHtml += '<td>' + p.segmentIcon + ' ' + p.segment + '</td>';
                topHtml += '<td>' + p.totalSales + ' un</td>';
                topHtml += '<td style="color: green; font-weight: bold;">R$ ' + parseFloat(p.totalRevenue).toFixed(2).replace('.', ',') + '</td>';
                topHtml += '<td>' + p.stock + ' un</td>';
                topHtml += '</tr>';
            });
            topHtml += '</tbody></table>';
            topDiv.innerHTML = topHtml;
        }
    } catch (err) {
        console.error('Erro ao carregar dados financeiros:', err);
        alert('Erro: ' + err.message);
    }
}
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



async function loadScheduler() {
    try {
        const res = await fetch(API_BASE + '/scheduler');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const listDiv = document.getElementById('scheduler-list');
        
        if (!data.posts || data.posts.length === 0) {
            listDiv.innerHTML = '<p>Nenhum post agendado.</p>';
            return;
        }
        
        let html = '<table class="data-table"><thead><tr><th>Plataforma</th><th>Agendado Para</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        data.posts.forEach(p => {
            const date = new Date(p.scheduledFor).toLocaleString('pt-BR');
            const statusColor = p.status === 'PUBLISHED' ? 'green' : (p.status === 'PENDING' ? 'orange' : 'red');
            const statusText = p.status === 'PENDING' ? 'Pendente' : 'Publicado';
            
            html += '<tr>';
            html += '<td><strong>' + p.platform + '</strong></td>';
            html += '<td>' + date + '</td>';
            html += '<td style="color: ' + statusColor + '; font-weight: bold;">' + statusText + '</td>';
            html += '<td><button onclick="deletePost(\'' + p.id + '\')" style="padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button></td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        listDiv.innerHTML = html;
    } catch (err) {
        console.error('Erro scheduler:', err);
    }
}

async function createScheduledPost() {
    const platform = document.getElementById('sched-platform').value;
    const scheduledFor = document.getElementById('sched-date').value;
    const content = document.getElementById('sched-content').value;
    const hashtags = document.getElementById('sched-tags').value;
    
    if (!scheduledFor || !content) { alert('Preencha data e conteúdo'); return; }
    
    try {
        const res = await fetch(API_BASE + '/scheduler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, scheduledFor, content, hashtags })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('Post agendado com sucesso!');
        document.getElementById('sched-content').value = '';
        loadScheduler();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function runSchedulerJob() {
    if (!confirm('Isso vai simular a publicação de todos os posts pendentes cujo horário já chegou. Continuar?')) return;
    try {
        const res = await fetch(API_BASE + '/scheduler/run-job', { method: 'POST' });
        const data = await res.json();
        alert('Job executado! ' + data.published + ' post(s) publicado(s).');
        loadScheduler();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function deletePost(id) {
    if (!confirm('Excluir este post agendado?')) return;
    try {
        const res = await fetch(API_BASE + '/scheduler/' + id, { method: 'DELETE' });
        if (res.ok) loadScheduler();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

// Adicionar ao showSection

let currentOrderId = null;
let pixInterval = null;

async function generatePix() {
    const amount = parseFloat(document.getElementById('pix-amount').value);
    const productId = document.getElementById('pix-product-id').value.trim();
    
    if (!amount || amount <= 0) { 
        alert('Informe um valor válido'); 
        return; 
    }
    
    try {
        console.log('Gerando PIX para valor:', amount);
        const res = await fetch(API_BASE + '/checkout/generate-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalValue: amount })
        });
        
        console.log('Resposta da API:', res.status);
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao gerar PIX');
        }
        
        currentOrderId = data.order.id;
        document.getElementById('pix-qr-img').src = data.pix.qrCodeUrl;
        document.getElementById('pix-code-text').textContent = data.pix.pixCode;
        document.getElementById('pix-display').style.display = 'block';
        document.getElementById('pix-status-text').textContent = 'Aguardando pagamento...';
        document.getElementById('pix-status-text').style.color = '#f59e0b';
        
        // Iniciar polling de status
        if (pixInterval) clearInterval(pixInterval);
        pixInterval = setInterval(checkPixStatus, 5000);
        
        console.log('✅ PIX gerado com sucesso! Order ID:', currentOrderId);
    } catch (err) {
        console.error('Erro ao gerar PIX:', err);
        alert('Erro: ' + err.message);
    }
}

async function checkPixStatus() {
    if (!currentOrderId) return;
    try {
        const res = await fetch(API_BASE + '/checkout/pix/' + currentOrderId + '/status');
        const data = await res.json();
        
        if (data.status === 'PAID') {
            clearInterval(pixInterval);
            document.getElementById('pix-status-text').textContent = 'Pagamento Confirmado! ✅';
            document.getElementById('pix-status-text').style.color = '#10b981';
            alert('Pagamento confirmado com sucesso!');
        } else if (data.status === 'EXPIRED') {
            clearInterval(pixInterval);
            document.getElementById('pix-status-text').textContent = 'PIX Expirado ❌';
            document.getElementById('pix-status-text').style.color = '#ef4444';
        }
    } catch (err) {
        console.error('Erro ao checar status:', err);
    }
}

function copyPixCode() {
    const code = document.getElementById('pix-code-text').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Código PIX copiado!');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar código');
    });
}

async function simulatePayment() {
    if (!currentOrderId) {
        alert('Nenhum PIX gerado ainda');
        return;
    }
    try {
        const res = await fetch(API_BASE + '/checkout/pix/' + currentOrderId + '/simulate-payment', { 
            method: 'POST' 
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('pix-status-text').textContent = 'Pagamento Confirmado (Simulado)! ✅';
            document.getElementById('pix-status-text').style.color = '#10b981';
            clearInterval(pixInterval);
            alert('Pagamento simulado com sucesso!');
        } else {
            throw new Error(data.error || 'Erro ao simular pagamento');
        }
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

// Garantir que showSection limpe o display de PIX

// === OVERRIDE FINAL E ÚNICO DO SHOWSECTION ===
const _safeOriginalShowSection_v2 = showSection;
showSection = function(id) {
    // Chama a função original primeiro
    _safeOriginalShowSection_v2(id);
    
    // Lógica específica do Agendador
    if (id === 'scheduler' && typeof loadScheduler === 'function') {
        loadScheduler();
    }
    
    // Lógica específica do Checkout (limpar intervalo e esconder display)
    if (id === 'checkout') {
        const pixDisplay = document.getElementById('pix-display');
        if (pixDisplay) pixDisplay.style.display = 'none';
        
        if (typeof window.pixInterval !== 'undefined' && window.pixInterval) {
            clearInterval(window.pixInterval);
            window.pixInterval = null;
        }
    }
};

async function addSiteProspect() {
    const data = {
        companyName: document.getElementById('ss-company').value,
        segment: document.getElementById('ss-segment').value,
        city: document.getElementById('ss-city').value,
        phone: document.getElementById('ss-phone').value,
        website: document.getElementById('ss-website').value || null
    };
    if (!data.companyName || !data.phone) { alert('Preencha nome e telefone'); return; }
    
    try {
        const res = await fetch(API_BASE + '/site-sales/prospects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('Empresa adicionada! Analisando...');
            await analyzeSite(result.prospect.id);
            loadSiteProspects();
            document.getElementById('ss-company').value = '';
            document.getElementById('ss-website').value = '';
        } else {
            alert(result.error || 'Erro ao adicionar');
        }
    } catch (e) { alert('Erro: ' + e.message); }
}

async function analyzeSite(id) {
    try {
        const res = await fetch(API_BASE + '/site-sales/prospects/' + id + '/audit', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            alert('Análise concluída! Score: ' + result.opportunityScore + '/100. Status: ' + result.prospect.websiteStatus);
            if (result.prospect.websiteStatus === 'NO_WEBSITE' || result.prospect.websiteStatus === 'WEBSITE_POOR') {
                if (confirm('Deseja gerar um Site Demo agora?')) await generateDemo(id);
            }
        }
    } catch (e) { alert('Erro na análise: ' + e.message); }
}

async function generateDemo(id) {
    try {
        const res = await fetch(API_BASE + '/site-sales/prospects/' + id + '/demo', { method: 'POST' });
        const result = await res.json();
        if (result.success) alert('Demo gerado com sucesso! Versão: ' + result.demo.version);
    } catch (e) { alert('Erro: ' + e.message); }
}

async function convertToLead(id) {
    if (!confirm('Converter este prospect em Lead no CRM?')) return;
    try {
        const res = await fetch(API_BASE + '/site-sales/prospects/' + id + '/convert-lead', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            alert('Convertido com sucesso! Lead ID: ' + result.lead.id);
            loadSiteProspects();
        }
    } catch (e) { alert('Erro: ' + e.message); }
}

async function loadSiteProspects() {
    try {
        const res = await fetch(API_BASE + '/site-sales/prospects');
        const data = await res.json();
        const listDiv = document.getElementById('ss-list');
        if (!data.prospects || data.prospects.length === 0) {
            listDiv.innerHTML = '<p>Nenhuma empresa prospectada ainda.</p>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>Empresa</th><th>Cidade</th><th>Website</th><th>Score</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        data.prospects.forEach(p => {
            const statusColor = p.websiteStatus === 'NO_WEBSITE' ? 'red' : (p.websiteStatus === 'WEBSITE_POOR' ? 'orange' : 'green');
            html += '<tr>';
            html += '<td><strong>' + p.companyName + '</strong><br><small>' + p.segment + '</small></td>';
            html += '<td>' + (p.city || '-') + '</td>';
            html += '<td>' + (p.website ? '<a href="' + p.website + '" target="_blank">Link</a>' : '<span style="color:red">Sem site</span>') + '</td>';
            html += '<td><strong>' + p.score + '/100</strong> (' + (p.scoreGrade || 'N/A') + ')</td>';
            html += '<td style="color:' + statusColor + '; font-weight:bold;">' + (p.websiteStatus || 'UNKNOWN') + '</td>';
            html += '<td>';
            if (p.websiteStatus === 'UNKNOWN') html += '<button onclick="analyzeSite(\'' + p.id + '\')" style="padding:4px 8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:4px;">Analisar</button>';
            if (p.websiteStatus === 'NO_WEBSITE' || p.websiteStatus === 'WEBSITE_POOR') html += '<button onclick="generateDemo(\'' + p.id + '\')" style="padding:4px 8px; background:#8b5cf6; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:4px;">Gerar Demo</button>';
            html += '<button onclick="convertToLead(\'' + p.id + '\')" style="padding:4px 8px; background:#16a34a; color:white; border:none; border-radius:4px; cursor:pointer;">Virar Lead</button>';
            html += '</td></tr>';
        });
        html += '</tbody></table>';
        listDiv.innerHTML = html;
    } catch (e) { console.error('Erro:', e); }
}

const _origShowSection = window.showSection;
window.showSection = function(id) {
    if (_origShowSection) _origShowSection(id);
    if (id === 'site-sales') loadSiteProspects();
};
