const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
console.log('🎨 Modernizando frontend do SALE-IA-V2...\n');

// 1. NOVO CSS MODERNO
const modernCSS = `/* SALE-IA-V2 - Design System Moderno */
:root {
  /* Cores Primárias */
  --primary-50: #f0f9ff;
  --primary-100: #e0f2fe;
  --primary-200: #bae6fd;
  --primary-300: #7dd3fc;
  --primary-400: #38bdf8;
  --primary-500: #0ea5e9;
  --primary-600: #0284c7;
  --primary-700: #0369a1;
  --primary-800: #075985;
  --primary-900: #0c4a6e;
  
  /* Cores Secundárias */
  --secondary-500: #8b5cf6;
  --secondary-600: #7c3aed;
  --secondary-700: #6d28d9;
  
  /* Cores de Status */
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --danger-500: #ef4444;
  --info-500: #3b82f6;
  
  /* Neutros */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* Bordas */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  
  /* Transições */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, var(--primary-50) 0%, var(--gray-100) 100%);
  color: var(--gray-800);
  line-height: 1.6;
  min-height: 100vh;
}

/* Header Moderno */
.app-header {
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--secondary-600) 100%);
  color: white;
  padding: 0;
  box-shadow: var(--shadow-lg);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  width: 45px;
  height: 45px;
  background: white;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: var(--shadow-md);
}

.brand h1 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.brand p {
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 400;
}

/* Navegação Moderna */
.nav-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
}

.nav-btn {
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: none;
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-btn.active {
  background: white;
  color: var(--primary-600);
  box-shadow: var(--shadow-md);
}

/* Container Principal */
.main-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Cards Modernos */
.card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-200);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--gray-100);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-800);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-title-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
}

/* Grid de Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-600) 100%);
  color: white;
  padding: 1.5rem;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  letter-spacing: -0.025em;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 500;
}

/* Botões Modernos */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--secondary-600) 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-secondary:hover {
  background: var(--gray-200);
}

.btn-success {
  background: var(--success-500);
  color: white;
}

.btn-warning {
  background: var(--warning-500);
  color: white;
}

.btn-danger {
  background: var(--danger-500);
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1rem;
}

/* Formulários Modernos */
.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--gray-700);
  font-size: 0.875rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

/* Tabelas Modernas */
.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 1rem;
}

.data-table th,
.data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--gray-200);
}

.data-table th {
  background: var(--gray-50);
  font-weight: 600;
  color: var(--gray-700);
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table tr:hover td {
  background: var(--gray-50);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.badge-info {
  background: #dbeafe;
  color: #1e40af;
}

/* Seções */
.section {
  display: none;
  animation: fadeIn 0.3s ease-in-out;
}

.section.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--gray-500);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--gray-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsivo */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .nav-tabs {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  
  .main-container {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .card {
    padding: 1.5rem;
  }
}

/* Utilitários */
.text-gradient {
  background: linear-gradient(135deg, var(--primary-600), var(--secondary-600));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }
.flex { display: flex; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
`;

fs.writeFileSync(path.join(ROOT, 'public/styles.css'), modernCSS, 'utf8');
console.log('✅ styles.css modernizado');

// 2. NOVO HTML PRINCIPAL
const modernHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SALE-IA-V2 - Sistema de Vendas Inteligente</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo"></div>
        <div class="brand">
          <h1>SALE-IA-V2</h1>
          <p>Sistema de Vendas Inteligente</p>
        </div>
      </div>
      <nav class="nav-tabs" id="mainNav">
        <button class="nav-btn active" onclick="showSection('dashboard')">📊 Dashboard</button>
        <button class="nav-btn" onclick="showSection('leads')">👥 Leads</button>
        <button class="nav-btn" onclick="showSection('cotacao')">💰 Cotação</button>
        <button class="nav-btn" onclick="showSection('pix')">💳 PIX</button>
        <button class="nav-btn" onclick="showSection('vendas')">🛒 Vendas</button>
        <button class="nav-btn" onclick="showSection('catalogo')"> Catálogo</button>
        <button class="nav-btn" onclick="showSection('campanhas')">📢 Campanhas</button>
        <button class="nav-btn" onclick="showSection('site-sales')">🌐 Sites</button>
        <button class="nav-btn" onclick="showSection('followup')">🔄 Follow-up</button>
      </nav>
    </div>
  </header>

  <main class="main-container">
    <!-- Dashboard -->
    <section id="dashboard" class="section active">
      <div class="stats-grid" id="dashboardStats">
        <div class="stat-card">
          <div class="stat-value" id="statTotalLeads">0</div>
          <div class="stat-label">Total de Leads</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <div class="stat-value" id="statNewLeads">0</div>
          <div class="stat-label">Novos Leads</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <div class="stat-value" id="statPixGenerated">0</div>
          <div class="stat-label">PIX Gerados</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
          <div class="stat-value" id="statRevenue">R$0</div>
          <div class="stat-label">Receita do Mês</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon">📈</span>
            Métricas de Vendas
          </h2>
        </div>
        <div id="salesMetrics">
          <div class="loading">
            <div class="spinner"></div>
            <p>Carregando métricas...</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Leads -->
    <section id="leads" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon">👥</span>
            Gestão de Leads
          </h2>
          <button class="btn btn-primary" onclick="importLeads()">📥 Importar</button>
        </div>
        <div id="leadsList">
          <div class="loading">
            <div class="spinner"></div>
            <p>Carregando leads...</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Cotação -->
    <section id="cotacao" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon">💰</span>
            Gerar Cotação
          </h2>
        </div>
        <form id="quoteForm" onsubmit="generateQuote(event)">
          <div class="form-group">
            <label class="form-label">Telefone do Cliente</label>
            <input type="text" class="form-input" id="quotePhone" placeholder="(00) 00000-0000" required>
          </div>
          <div class="form-group">
            <label class="form-label">Produto</label>
            <select class="form-select" id="quoteProduct" required>
              <option value="">Selecione...</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Quantidade</label>
            <input type="number" class="form-input" id="quoteQuantity" value="1" min="1" required>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            💰 Gerar Cotação
          </button>
        </form>
        <div id="quoteResult" style="margin-top: 2rem;"></div>
      </div>
    </section>

    <!-- PIX -->
    <section id="pix" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon">💳</span>
            Gerar PIX
          </h2>
        </div>
        <div id="pixContent">
          <p style="color: var(--gray-600);">Selecione um pedido para gerar o PIX.</p>
        </div>
      </div>
    </section>

    <!-- Outras seções serão carregadas dinamicamente -->
    <section id="vendas" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon">🛒</span>
            Vendas
          </h2>
        </div>
        <p>Em desenvolvimento...</p>
      </div>
    </section>

    <section id="catalogo" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon"></span>
            Catálogo de Produtos
          </h2>
        </div>
        <p>Em desenvolvimento...</p>
      </div>
    </section>

    <section id="campanhas" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon"></span>
            Campanhas
          </h2>
        </div>
        <p>Em desenvolvimento...</p>
      </div>
    </section>

    <section id="site-sales" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon"></span>
            Website AI Factory
          </h2>
        </div>
        <p>Redirecionando...</p>
      </div>
    </section>

    <section id="followup" class="section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">
            <span class="card-title-icon">🔄</span>
            Follow-up
          </h2>
        </div>
        <p>Em desenvolvimento...</p>
      </div>
    </section>
  </main>

  <script src="/app.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'public/index.html'), modernHTML, 'utf8');
console.log('✅ index.html modernizado');

// 3. NOVO JAVASCRIPT MODERNO
const modernJS = `// SALE-IA-V2 - JavaScript Moderno
const API_BASE = '/api';

// Navegação
function showSection(sectionId) {
  // Esconder todas as seções
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Mostrar seção selecionada
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // Atualizar botões de navegação
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(\`[onclick="showSection('\${sectionId}')"]\`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  // Carregar dados específicos da seção
  loadSectionData(sectionId);
}

function loadSectionData(sectionId) {
  switch(sectionId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'leads':
      loadLeads();
      break;
    case 'cotacao':
      loadProducts();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const response = await fetch(\`\${API_BASE}/dashboard/overview\`);
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('statTotalLeads').textContent = data.totalLeads || 0;
      document.getElementById('statNewLeads').textContent = data.newLeads || 0;
      document.getElementById('statPixGenerated').textContent = data.pixGenerated || 0;
      document.getElementById('statRevenue').textContent = \`R$\${(data.revenue || 0).toFixed(2).replace('.', ',')}\`;
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}

// Leads
async function loadLeads() {
  const container = document.getElementById('leadsList');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando leads...</p></div>';
  
  try {
    const response = await fetch(\`\${API_BASE}/leads\`);
    const data = await response.json();
    
    if (data.success && data.leads) {
      renderLeads(data.leads);
    }
  } catch (error) {
    container.innerHTML = '<p style="color: var(--danger-500);">Erro ao carregar leads.</p>';
  }
}

function renderLeads(leads) {
  const container = document.getElementById('leadsList');
  
  if (leads.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 2rem;">Nenhum lead encontrado.</p>';
    return;
  }
  
  let html = \`
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Status</th>
          <th>Stage</th>
          <th>Score</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  \`;
  
  leads.forEach(lead => {
    const statusClass = getStatusClass(lead.status);
    html += \`
      <tr>
        <td><strong>\${lead.name || 'N/A'}</strong></td>
        <td>\${lead.phone || 'N/A'}</td>
        <td><span class="badge \${statusClass}">\${lead.status}</span></td>
        <td>\${lead.stage || 'N/A'}</td>
        <td>\${lead.score || 0}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewLead('\${lead.id}')">Ver</button>
          <button class="btn btn-sm btn-secondary" onclick="contactLead('\${lead.phone}')">Contatar</button>
        </td>
      </tr>
    \`;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
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

// Cotação
async function loadProducts() {
  try {
    const response = await fetch(\`\${API_BASE}/products\`);
    const data = await response.json();
    
    if (data.success && data.products) {
      const select = document.getElementById('quoteProduct');
      select.innerHTML = '<option value="">Selecione...</option>';
      
      data.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = \`\${product.name} - R$\${product.salePrice.toFixed(2)}\`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
}

async function generateQuote(event) {
  event.preventDefault();
  
  const phone = document.getElementById('quotePhone').value;
  const productId = document.getElementById('quoteProduct').value;
  const quantity = parseInt(document.getElementById('quoteQuantity').value);
  
  try {
    const response = await fetch(\`\${API_BASE}/pricing/quote\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: phone,
        productId,
        quantity
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayQuoteResult(data.quote);
    }
  } catch (error) {
    console.error('Erro ao gerar cotação:', error);
  }
}

function displayQuoteResult(quote) {
  const container = document.getElementById('quoteResult');
  container.innerHTML = \`
    <div class="card" style="background: var(--primary-50); border: 2px solid var(--primary-200);">
      <h3 style="margin-bottom: 1rem; color: var(--primary-700);">Cotação Gerada</h3>
      <p><strong>Produto:</strong> \${quote.product?.name || 'N/A'}</p>
      <p><strong>Quantidade:</strong> \${quote.quantity}</p>
      <p><strong>Valor Unitário:</strong> R$\${(quote.unitPrice || 0).toFixed(2).replace('.', ',')}</p>
      <p><strong>Total:</strong> <span style="font-size: 1.5rem; color: var(--success-500); font-weight: 700;">R$\${(quote.totalValue || 0).toFixed(2).replace('.', ',')}</span></p>
      <div style="margin-top: 1rem; display: flex; gap: 1rem;">
        <button class="btn btn-success" onclick="convertToOrder('\${quote.id}')">Converter em Pedido</button>
        <button class="btn btn-primary" onclick="sendWhatsApp('\${quote.id}')">Enviar por WhatsApp</button>
      </div>
    </div>
  \`;
}

// Utilitários
function importLeads() {
  alert('Funcionalidade de importação em desenvolvimento.');
}

function viewLead(leadId) {
  alert(\`Visualizar lead \${leadId}\`);
}

function contactLead(phone) {
  window.open(\`https://wa.me/55\${phone.replace(/\\D/g, '')}\`, '_blank');
}

function convertToOrder(quoteId) {
  alert(\`Converter cotação \${quoteId} em pedido\`);
}

function sendWhatsApp(quoteId) {
  alert(\`Enviar cotação \${quoteId} por WhatsApp\`);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
`;

fs.writeFileSync(path.join(ROOT, 'public/app.js'), modernJS, 'utf8');
console.log('✅ app.js modernizado');

console.log('\n🎉 Frontend modernizado com sucesso!');
console.log('\n📋 Resumo das melhorias:');
console.log('  • Design System completo com variáveis CSS');
console.log('  • Layout moderno e responsivo');
console.log('  • Cards com sombras e efeitos hover');
console.log('  • Gradientes profissionais');
console.log('  • Tipografia Inter (Google Fonts)');
console.log('  • Navegação moderna com tabs');
console.log('  • Cores e status padronizados');
console.log('  • Animações suaves');
console.log('  • Totalmente responsivo');
console.log('\n Acesse: http://localhost:3000');