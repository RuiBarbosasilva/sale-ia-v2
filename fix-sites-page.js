const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
console.log('🔧 Corrigindo página Sites...\n');

// 1. Atualizar index.html - seção Sites com conteúdo real
const indexPath = path.join(ROOT, 'public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const sitesSection = `    <section id="sites" class="section">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value" id="wf-total">0</div><div class="stat-label">Prospects</div></div>
        <div class="stat-card" style="background:linear-gradient(135deg,#10b981,#059669)"><div class="stat-value" id="wf-demos">0</div><div class="stat-label">Demos Geradas</div></div>
        <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><div class="stat-value" id="wf-proposals">0</div><div class="stat-label">Propostas</div></div>
        <div class="stat-card" style="background:linear-gradient(135deg,#ef4444,#dc2626)"><div class="stat-value" id="wf-converted">0</div><div class="stat-label">Convertidos</div></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><span class="card-title-icon">🌐</span>Website AI Factory</h2>
          <div class="flex gap-2">
            <a href="/site-sales.html" class="btn btn-primary"> Nova Prospecção</a>
            <button class="btn btn-secondary" onclick="loadWebsiteFactory()">🔄 Atualizar</button>
          </div>
        </div>
        <div id="wf-content">
          <div class="loading"><div class="spinner"></div><p>Carregando prospects...</p></div>
        </div>
      </div>
    </section>`;

// Substituir a seção sites existente
html = html.replace(/<section id="sites"[\s\S]*?<\/section>/, sitesSection);
fs.writeFileSync(indexPath, html, 'utf8');
console.log('✅ index.html atualizado');

// 2. Atualizar app.js com funções do Website Factory
const appJsPath = path.join(ROOT, 'public/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const websiteFactoryFunctions = `

// ============ WEBSITE AI FACTORY ============
async function loadWebsiteFactory() {
  const container = document.getElementById('wf-content');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando prospects...</p></div>';
  
  try {
    const [prospectsRes, demosRes] = await Promise.all([
      fetch(API_BASE + '/site-sales/prospects'),
      fetch(API_BASE + '/websites/demos').catch(() => ({ ok: false }))
    ]);
    
    const prospectsData = prospectsRes.ok ? await prospectsRes.json() : { prospects: [] };
    const demosData = demosRes.ok ? await demosRes.json() : { demos: [] };
    
    const prospects = prospectsData.prospects || [];
    const demos = demosData.demos || [];
    
    // Atualizar stats
    const statTotal = document.getElementById('wf-total');
    const statDemos = document.getElementById('wf-demos');
    const statProposals = document.getElementById('wf-proposals');
    const statConverted = document.getElementById('wf-converted');
    
    if (statTotal) statTotal.textContent = prospects.length;
    if (statDemos) statDemos.textContent = demos.filter(d => d.status === 'READY').length;
    if (statProposals) statProposals.textContent = prospects.filter(p => p.status === 'PROPOSAL_SENT').length;
    if (statConverted) statConverted.textContent = prospects.filter(p => p.status === 'NEGOCIACAO').length;
    
    if (prospects.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--gray-500)"><p style="font-size:3rem;margin-bottom:1rem"></p><p style="font-size:1.1rem;margin-bottom:1rem">Nenhum prospect encontrado</p><p>Clique em "Nova Prospecção" para começar</p></div>';
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
      html += '<td class="flex gap-2" style="flex-wrap:wrap">';
      
      if (p.websiteStatus === 'UNKNOWN' || p.websiteStatus === 'NO_WEBSITE' || p.websiteStatus === 'WEBSITE_POOR') {
        html += '<button class="btn btn-sm btn-primary" onclick="generateWebsiteDemo(\\\'' + p.id + '\\\')">Gerar Demo</button>';
      }
      
      if (p.status === 'DEMO_READY' || p.status === 'PROPOSAL_SENT') {
        html += '<button class="btn btn-sm btn-success" onclick="viewWebsiteDemo(\\\'' + p.id + '\\\')">Ver Demo</button>';
      }
      
      if (p.status !== 'NEGOCIACAO') {
        html += '<button class="btn btn-sm btn-secondary" onclick="convertWebsiteToLead(\\\'' + p.id + '\\\')">Virar Lead</button>';
      }
      
      html += '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Erro ao carregar Website Factory:', error);
    container.innerHTML = '<p style="color:var(--danger-500);text-align:center;padding:2rem">Erro ao carregar dados. Verifique se o servidor está rodando.</p>';
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
      alert('✅ Demo gerada com sucesso!\\nVersão: ' + data.version + '\\nClique em "Ver Demo" para visualizar.');
      loadWebsiteFactory();
    } else {
      alert('Erro: ' + (data.error || 'Falha ao gerar demo'));
    }
  } catch (error) {
    alert('Erro ao gerar demo: ' + error.message);
  }
}

async function viewWebsiteDemo(prospectId) {
  try {
    const res = await fetch(API_BASE + '/websites/demos');
    const data = await res.json();
    const demo = (data.demos || []).find(d => d.prospectId === prospectId);
    
    if (demo && demo.sourceCode) {
      const newWindow = window.open('', '_blank');
      newWindow.document.write(demo.sourceCode);
      newWindow.document.close();
    } else {
      alert('Demo não encontrada. Gere uma demo primeiro.');
    }
  } catch (error) {
    alert('Erro ao visualizar demo: ' + error.message);
  }
}

async function convertWebsiteToLead(prospectId) {
  if (!confirm('Converter este prospect em Lead no CRM?')) return;
  
  try {
    const res = await fetch(API_BASE + '/site-sales/prospects/' + prospectId + '/convert-lead', {
      method: 'POST'
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert('✅ Convertido em Lead!\\nID: ' + data.lead.id);
      loadWebsiteFactory();
    } else {
      alert('Erro: ' + (data.error || 'Falha na conversão'));
    }
  } catch (error) {
    alert('Erro ao converter: ' + error.message);
  }
}
`;

if (!appJs.includes('loadWebsiteFactory')) {
  appJs += websiteFactoryFunctions;
  fs.writeFileSync(appJsPath, appJs, 'utf8');
  console.log('✅ Funções Website Factory adicionadas ao app.js');
}

// 3. Garantir que websiteRoutes está registrado
const apiRoutesPath = path.join(ROOT, 'src/routes/apiRoutes.ts');
let apiRoutes = fs.readFileSync(apiRoutesPath, 'utf8');

if (!apiRoutes.includes("websiteRoutes")) {
  apiRoutes = "import websiteRoutes from './websiteRoutes';\n" + apiRoutes;
  apiRoutes = apiRoutes.replace(
    "export default router;",
    "router.use('/websites', websiteRoutes);\n\nexport default router;"
  );
  fs.writeFileSync(apiRoutesPath, apiRoutes, 'utf8');
  console.log('✅ websiteRoutes registrado em apiRoutes.ts');
}

console.log('\n🎉 Página Sites corrigida!');
console.log('\n📋 Próximos passos:');
console.log('1. npm run build');
console.log('2. Reinicie o servidor (Ctrl+C e npm start)');
console.log('3. Acesse http://localhost:3000 e clique em "Sites"');