const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, 'backups_site_sales');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

function backup(filePath) {
    if (!fs.existsSync(filePath)) return;
    const name = path.basename(filePath) + '.' + Date.now() + '.bak';
    fs.copyFileSync(filePath, path.join(BACKUP_DIR, name));
}

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, content) {
    backup(path.join(ROOT, p));
    fs.writeFileSync(path.join(ROOT, p), content, 'utf8');
}

console.log('🚀 INICIANDO IMPLEMENTAÇÃO DO SITE SALES FACTORY...\n');

// 1. CRIAR siteSalesRoutes.ts (Orquestrador)
console.log('[1/4] Criando siteSalesRoutes.ts...');
const routesContent = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { websiteDetectionService } from '../services/websiteDetectionService';
import { websiteScoringService } from '../services/websiteScoringService';
import { demoGeneratorService } from '../services/demoGeneratorService';
import { proposalGeneratorService } from '../services/proposalGeneratorService';

const router = Router();
const prisma = new PrismaClient();

// 1. Adicionar Prospect
router.post('/prospects', async (req: Request, res: Response) => {
  try {
    const { companyName, segment, city, state, phone, website } = req.body;
    const existing = await prisma.websiteProspect.findFirst({
      where: { companyName: { contains: companyName, mode: 'insensitive' }, city }
    });
    if (existing) return res.status(409).json({ success: false, error: 'Empresa já cadastrada', prospect: existing });

    const prospect = await prisma.websiteProspect.create({
      data: {
        companyName, segment, city, state, phone,
        website: website || null,
        websiteStatus: website ? 'UNKNOWN' : 'NO_WEBSITE',
        source: 'MANUAL'
      }
    });
    res.status(201).json({ success: true, prospect });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Analisar Site (Audit)
router.post('/prospects/:id/audit', async (req: Request, res: Response) => {
  try {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: req.params.id } });
    if (!prospect) return res.status(404).json({ error: 'Prospect não encontrado' });
    if (!prospect.website) {
      const updated = await prisma.websiteProspect.update({
        where: { id: prospect.id },
        data: { websiteStatus: 'NO_WEBSITE', status: 'SEM_SITE', score: 40, scoreGrade: 'C' }
      });
      return res.json({ success: true, prospect: updated, audit: { status: 'NO_WEBSITE', score: 0 }, opportunityScore: 40 });
    }

    const auditResult = await websiteDetectionService.analyzeWebsite(prospect.website);
    const scoreResult = websiteScoringService.calculateScore({
      websiteStatus: auditResult.status,
      websiteScore: auditResult.score,
      phone: prospect.phone,
      email: prospect.email,
      segment: prospect.segment
    });

    const updatedProspect = await prisma.websiteProspect.update({
      where: { id: prospect.id },
      data: {
        websiteStatus: auditResult.status,
        websiteScore: auditResult.score,
        score: scoreResult.score,
        scoreGrade: scoreResult.grade,
        status: auditResult.status === 'NO_WEBSITE' ? 'SEM_SITE' : 'SITE_COM_PROBLEMAS'
      }
    });

    res.json({ success: true, prospect: updatedProspect, audit: auditResult, opportunityScore: scoreResult.score });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Gerar Demo
router.post('/prospects/:id/demo', async (req: Request, res: Response) => {
  try {
    const result = await demoGeneratorService.generateDemo(req.params.id);
    res.json({ success: true, demo: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Gerar Proposta
router.post('/prospects/:id/proposal', async (req: Request, res: Response) => {
  try {
    const result = await proposalGeneratorService.generateProposal(req.params.id);
    res.json({ success: true, proposal: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Converter em Lead (CRM)
router.post('/prospects/:id/convert-lead', async (req: Request, res: Response) => {
  try {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: req.params.id } });
    if (!prospect) return res.status(404).json({ error: 'Prospect não encontrado' });
    if (!prospect.phone) return res.status(400).json({ error: 'Prospect precisa de telefone para virar Lead' });

    const lead = await prisma.lead.create({
      data: {
        name: prospect.companyName,
        phone: prospect.phone,
        email: prospect.email || undefined,
        status: 'NEW_LEAD',
        stage: 'PROSPECTADO',
        score: prospect.score
      }
    });

    await prisma.websiteProspect.update({
      where: { id: prospect.id },
      data: { linkedLeadId: lead.id, status: 'NEGOCIACAO' }
    });

    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Listar Prospects
router.get('/prospects', async (req: Request, res: Response) => {
  try {
    const { city, segment, status } = req.query;
    const where: any = {};
    if (city) where.city = { contains: city as string, mode: 'insensitive' };
    if (segment) where.segment = { contains: segment as string, mode: 'insensitive' };
    if (status) where.status = status;

    const prospects = await prisma.websiteProspect.findMany({
      where,
      orderBy: { score: 'desc' },
      take: 50
    });
    res.json({ success: true, prospects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;`;

write('src/routes/siteSalesRoutes.ts', routesContent);
console.log('  ✅ siteSalesRoutes.ts criado');

// 2. ATUALIZAR apiRoutes.ts
console.log('\n[2/4] Registrando rota em apiRoutes.ts...');
const apiRoutesPath = 'src/routes/apiRoutes.ts';
let apiRoutes = read(apiRoutesPath);
if (!apiRoutes.includes('siteSalesRoutes')) {
    apiRoutes = "import siteSalesRoutes from './siteSalesRoutes';\n" + apiRoutes;
    apiRoutes = apiRoutes.replace(
        'export default router;',
        "router.use('/site-sales', siteSalesRoutes);\n\nexport default router;"
    );
    write(apiRoutesPath, apiRoutes);
    console.log('  ✅ Rota /site-sales registrada');
}

// 3. ATUALIZAR FRONTEND
console.log('\n[3/4] Atualizando frontend...');
const htmlPath = 'public/index.html';
let html = read(htmlPath);

if (!html.includes("showSection('site-sales')")) {
    const btn = '<button class="nav-btn" onclick="showSection(\'site-sales\')">🌐 Prospecção de Sites</button>';
    const lastNav = html.lastIndexOf('</nav>');
    html = html.slice(0, lastNav) + '\n            ' + btn + '\n        ' + html.slice(lastNav);
}

if (!html.includes('id="site-sales"')) {
    const section = `
        <section id="site-sales" class="section">
            <h2>🌐 Site Sales Factory</h2>
            <div class="form-grid" style="background: #f0fdf4; border: 1px solid #86efac;">
                <h3 style="grid-column: 1 / -1;">Adicionar Empresa para Prospecção</h3>
                <div class="input-group"><label>Nome da Empresa</label><input type="text" id="ss-company" placeholder="Ex: Clínica Sorriso"></div>
                <div class="input-group"><label>Segmento</label>
                    <select id="ss-segment">
                        <option value="Clínica">Clínica / Saúde</option><option value="Restaurante">Restaurante</option>
                        <option value="Advocacia">Advocacia</option><option value="Imobiliária">Imobiliária</option>
                        <option value="Academia">Academia</option><option value="Serviços">Prestação de Serviços</option>
                    </select>
                </div>
                <div class="input-group"><label>Cidade</label><input type="text" id="ss-city" placeholder="Ex: São Paulo"></div>
                <div class="input-group"><label>Telefone (WhatsApp)</label><input type="text" id="ss-phone" placeholder="11999999999"></div>
                <div class="input-group"><label>Website Atual (opcional)</label><input type="text" id="ss-website" placeholder="https://..."></div>
                <button class="action-btn" onclick="addSiteProspect()" style="background: #16a34a; grid-column: 1 / -1;">➕ Adicionar e Analisar</button>
            </div>
            <div style="margin-top: 30px;">
                <h3>Empresas Prospectadas</h3>
                <button class="action-btn" onclick="loadSiteProspects()" style="background: #3b82f6; padding: 8px 15px; font-size: 14px; margin-bottom: 10px;">🔄 Atualizar Lista</button>
                <div id="ss-list" class="result-box" style="margin-top: 15px;"><p>Carregando...</p></div>
            </div>
        </section>`;
    const lastMain = html.lastIndexOf('</main>');
    html = html.slice(0, lastMain) + section + '\n    ' + html.slice(lastMain);
}
write(htmlPath, html);

const jsPath = 'public/app-v3.js';
let js = read(jsPath);
if (!js.includes('async function addSiteProspect()')) {
    const jsCode = `
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
            if (p.websiteStatus === 'UNKNOWN') html += '<button onclick="analyzeSite(\\\'' + p.id + '\\\')" style="padding:4px 8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:4px;">Analisar</button>';
            if (p.websiteStatus === 'NO_WEBSITE' || p.websiteStatus === 'WEBSITE_POOR') html += '<button onclick="generateDemo(\\\'' + p.id + '\\\')" style="padding:4px 8px; background:#8b5cf6; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:4px;">Gerar Demo</button>';
            html += '<button onclick="convertToLead(\\\'' + p.id + '\\\')" style="padding:4px 8px; background:#16a34a; color:white; border:none; border-radius:4px; cursor:pointer;">Virar Lead</button>';
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
`;
    js += jsCode;
    write(jsPath, js);
    console.log('  ✅ Frontend atualizado com UI e funções');
}

console.log('\n[4/4] Executando Build...');
const { execSync } = require('child_process');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\n✅ BUILD PASS! Módulo Site Sales Factory integrado com sucesso.');
} catch (e) {
    console.log('\n❌ BUILD FAIL. Verifique os erros acima.');
}