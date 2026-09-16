const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
console.log(' Corrigindo app.js...\n');

const appJs = `// SALE-IA-V2 - JavaScript Corrigido
const API_BASE = '/api';

// ============ NAVEGAÇÃO ============
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector('[onclick="showSection(\\'' + sectionId + '\\')"]');
  if (activeBtn) activeBtn.classList.add('active');
  
  loadSectionData(sectionId);
}

function loadSectionData(sectionId) {
  switch(sectionId) {
    case 'dashboard': loadDashboard(); break;
    case 'leads': loadLeads(); break;
    case 'cotacao': loadProducts(); break;
    case 'sites': loadWebsiteFactory(); break;
  }
}

// ============ DASHBOARD ============
async function loadDashboard() {
  const container = document.getElementById('salesMetrics');
  if (container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando métricas...</p></div>';
  }
  
  try {
    const res = await fetch(API_BASE + '/dashboard/overview');
    const data = await res.json();
    
    // Atualizar stats (API retorna direto, sem "success")
    const totalLeads = data.totalLeads || 0;
    const newLeads = data.newLeads || 0;
    const pixGenerated = data.pixGenerated || 0;
    const revenue = data.monthlyRevenue || data.revenue || 0;
    
    const el1 = document.getElementById('statTotalLeads');
    const el2 = document.getElementById('statNewLeads');
    const el3 = document.getElementById('statPixGenerated');
    const el4 = document.getElementById('statRevenue');
    
    if (el1) el1.textContent = totalLeads;
    if (el2) el2.textContent = newLeads;
    if (el3) el3.textContent = pixGenerated;
    if (el4) el4.textContent = 'R$' + Number(revenue).toFixed(2).replace('.', ',');
    
    // Parar spinner e mostrar conteúdo
    if (container) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #10b981; font-weight: 600;">✅ Métricas carregadas com sucesso!</div>';
    }
  } catch (error) {
    console.error('Erro dashboard:', error);
    if (container) {
      container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;"> Erro ao carregar métricas. Verifique se o servidor está rodando.</div>';
    }
  }
}

// ============ LEADS ============
async function loadLeads() {
  const container = document.getElementById('leadsList');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando leads...</p></div>';
  
  try {
    const res = await fetch(API_BASE + '/leads');
    const data = await res.json();
    
    const leads = data.leads || data || [];
    
    if (leads.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">Nenhum lead encontrado.</p>';
      return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Nome</th><th>Telefone</th><th>Status</th><th>Stage</th><th>Score</th><th>Ações</th></tr></thead><tbody>';
    
    leads.forEach(lead => {
      const statusClass = getStatusClass(lead.status);
      html += '<tr>';
      html += '<td><strong>' + (lead.name || 'N/A') + '</strong></td>';
      html += '<td>' + (lead.phone || 'N/A') + '</td>';
      html += '<td><span class="badge ' + statusClass + '">' + (lead.status || 'N/A') + '</span></td>';
      html += '<td>' + (lead.stage || 'N/A') + '</td>';
      html += '<td>' + (lead.score || 0) + '</td>';
      html += '<td>';
      html += '<button class="btn btn-sm btn-primary" onclick="viewLead(\\'' + lead.id + '\\')">Ver</button>';
      if (lead.phone) {
        html += '<button class="btn btn-sm btn-secondary" onclick="contactLead(\\'' + lead.phone + '\\')">Contatar</button>';
      }
      html += '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Erro leads:', error);
    container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">Erro ao carregar leads.</p>';
  }
}

function getStatusClass(status) {
  const map = {
    'NEW_LEAD': 'badge-info',
    'QUALIFICATION': 'badge-warning',
    'NEGOTIATION': 'badge-warning',
    'CLOSED_WON': 'badge-success',
    'CLOSED_LOST': 'badge-danger',
    'HUMAN_HANDOVER': 'badge-danger'
  };
  return map[status] || 'badge-info';
}

function viewLead(id) {
  alert('Visualizar lead: ' + id);
}

function contactLead(phone) {
  const clean = phone.replace(/\\D/g, '');
  window.open('https://wa.me/55' + clean, '_blank');
}

// ============ COTAÇÃO ============
async function loadProducts() {
  try {
    const res = await fetch(API_BASE + '/products');
    const data = await res.json();
    const products = data.products || data || [];
    
    const select = document.getElementById('quoteProduct');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione...</option>';
    products.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + ' - R$' + (p.salePrice || 0).toFixed(2);
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Erro produtos:', error);
  }
}

async function generateQuote(event) {
  event.preventDefault();
  const phone = document.getElementById('quotePhone').value;
  const productId = document.getElementById('quoteProduct').value;
  const quantity = parseInt(document.getElementById('quoteQuantity').value);
  
  try {
    const res = await fetch(API_BASE + '/pricing/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: phone, productId, quantity })
    });
    const data = await res.json();
    
    const container = document.getElementById('quoteResult');
    if (container && data.success) {
      container.innerHTML = '<div class="card" style="background: #f0f9ff; border: 2px solid #bae6fd; padding: 1.5rem; border-radius: 0.75rem;"><h3 style="color: #0369a1; margin-bottom: 1rem;">✅ Cotação Gerada</h3><p><strong>Total:</strong> R$' + ((data.quote?.totalValue || 0).toFixed(2).replace('.', ',')) + '</p></div>';
    }
  } catch (error) {
    console.error('Erro cotação:', error);
  }
}

// ============ WEBSITE AI FACTORY ============
async function loadWebsiteFactory() {
  const container = document.getElementById('wf-content');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando prospects...</p></div>';
  
  try {
    const [prospectsRes, demosRes] = await Promise.all([
      fetch(API_BASE + '/site-sales/prospects').catch(() => ({ ok: false })),
      fetch(API_BASE + '/websites/demos').catch(() => ({ ok: false }))
    ]);
    
    const prospectsData = prospectsRes.ok ? await prospectsRes.json() : { prospects: [] };
    const demosData = demosRes.ok ? await demosRes.json() : { demos: [] };
    
    const prospects = prospectsData.prospects || [];
    const demos = demosData.demos || [];
    
    // Atualizar stats
    const s1 = document.getElementById('wf-total');
    const s2 = document.getElementById('wf-demos');
    const s3 = document.getElementById('wf-proposals');
    const s4 = document.getElementById('wf-converted');
    
    if (s1) s1.textContent = prospects.length;
    if (s2) s2.textContent = demos.filter(d => d.status === 'READY').length;
    if (s3) s3.textContent = prospects.filter(p => p.status === 'PROPOSAL_SENT').length;
    if (s4) s4.textContent = prospects.filter(p => p.status === 'NEGOCIACAO').length;
    
    if (prospects.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:3rem;color:#6b7280"><p style="font-size:3rem;margin-bottom:1rem">🌐</p><p style="font-size:1.1rem;margin-bottom:1rem">Nenhum prospect encontrado</p><p>Clique em "Nova Prospecção" para começar</p></div>';
      return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Empresa</th><th>Segmento</th><th>Cidade</th><th>Site Atual</th><th>Score</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
    
    prospects.forEach(p => {
      const siteStatus = p.websiteStatus === 'NO_WEBSITE' ? '<span class="badge badge-danger">Sem Site</span>' : 
                         p.websiteStatus === 'WEBSITE_POOR' ? '<span class="badge badge-warning">Site Ruim</span>' : 
                         '<span class="badge badge-success">Tem Site</span>';
      
      const statusBadge = p.status === 'DEMO_READY' ? '<span class="badge badge-success">Demo Pronta</span>' :
                          p.status === 'PROPOSAL_SENT' ? '<span class="badge badge-warning">Proposta</span>' :
                          p.status === 'NEGOCIACAO' ? '<span class="badge badge-info">Negociação</span>' :
                          '<span class="badge badge-info">' + (p.status || 'Novo') + '</span>';
      
      html += '<tr>';
      html += '<td><strong>' + (p.companyName || 'N/A') + '</strong></td>';
      html += '<td>' + (p.segment || '-') + '</td>';
      html += '<td>' + (p.city || '-') + '</td>';
      html += '<td>' + siteStatus + '</td>';
      html += '<td><strong>' + (p.score || 0) + '/100</strong></td>';
      html += '<td>' + statusBadge + '</td>';
      html += '<td style="display:flex;gap:0.5rem;flex-wrap:wrap">';
      
      if (p.websiteStatus === 'UNKNOWN' || p.websiteStatus === 'NO_WEBSITE' || p.websiteStatus === 'WEBSITE_POOR') {
        html += '<button class="btn btn-sm btn-primary" onclick="generateWebsiteDemo(\\'' + p.id + '\\')">Gerar Demo</button>';
      }
      
      if (p.status === 'DEMO_READY' || p.status === 'PROPOSAL_SENT') {
        html += '<button class="btn btn-sm btn-success" onclick="viewWebsiteDemo(\\'' + p.id + '\\')">Ver Demo</button>';
      }
      
      if (p.status !== 'NEGOCIACAO') {
        html += '<button class="btn btn-sm btn-secondary" onclick="convertWebsiteToLead(\\'' + p.id + '\\')">Virar Lead</button>';
      }
      
      html += '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Erro Website Factory:', error);
    container.innerHTML = '<p style="color:#ef4444;text-align:center;padding:2rem">Erro ao carregar dados.</p>';
  }
}

async function generateWebsiteDemo(prospectId) {
  try {
    const res = await fetch(API_BASE + '/websites/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectId })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Demo gerada! Versão: ' + data.version);
      loadWebsiteFactory();
    } else {
      alert('Erro: ' + (data.error || 'Falha ao gerar'));
    }
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

async function viewWebsiteDemo(prospectId) {
  try {
    const res = await fetch(API_BASE + '/websites/demos');
    const data = await res.json();
    const demo = (data.demos || []).find(d => d.prospectId === prospectId);
    if (demo && demo.sourceCode) {
      const w = window.open('', '_blank');
      w.document.write(demo.sourceCode);
      w.document.close();
    } else {
      alert('Demo não encontrada. Gere uma demo primeiro.');
    }
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

async function convertWebsiteToLead(prospectId) {
  if (!confirm('Converter este prospect em Lead?')) return;
  try {
    const res = await fetch(API_BASE + '/site-sales/prospects/' + prospectId + '/convert-lead', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('✅ Convertido! Lead ID: ' + data.lead.id);
      loadWebsiteFactory();
    } else {
      alert('Erro: ' + (data.error || 'Falha'));
    }
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
`;

fs.writeFileSync(path.join(ROOT, 'public', 'app.js'), appJs, 'utf8');
console.log('✅ app.js corrigido com sucesso!');
console.log('\n📋 Agora:');
console.log('1. Reinicie o servidor (Ctrl+C e npm start)');
console.log('2. Acesse http://localhost:3000');
console.log('3. Pressione Ctrl+Shift+R para limpar cache');