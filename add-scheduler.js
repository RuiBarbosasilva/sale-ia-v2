const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Iniciando implementação do Agendamento de Posts...\n');

// 1. ATUALIZAR SCHEMA PRISMA
console.log('[1/5] Atualizando schema.prisma...');
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModel = `

model ScheduledPost {
  id           String   @id @default(uuid())
  segmentId    String?
  platform     String   @default("INSTAGRAM")
  content      String
  hashtags     String
  scheduledFor DateTime
  status       String   @default("PENDING")
  publishedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}`;

if (!schema.includes('model ScheduledPost')) {
    schema += newModel;
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('  ✅ Modelo ScheduledPost adicionado.');
} else {
    console.log('  ℹ️ Modelo já existe.');
}

// 2. CRIAR SERVIÇO E ROTAS
console.log('[2/5] Criando rotas e serviço...');
const routesContent = `
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Agendar novo post
router.post('/', async (req: Request, res: Response) => {
  try {
    const { segmentId, platform, content, hashtags, scheduledFor } = req.body;
    const post = await prisma.scheduledPost.create({
      data: {
        segmentId,
        platform,
        content,
        hashtags,
        scheduledFor: new Date(scheduledFor)
      }
    });
    return res.json({ success: true, post });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Listar posts agendados
router.get('/', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.scheduledPost.findMany({
      orderBy: { scheduledFor: 'asc' }
    });
    return res.json({ success: true, posts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Simular Job de Publicação (Verifica posts pendentes e "publica")
router.post('/run-job', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const pendingPosts = await prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now }
      }
    });

    let publishedCount = 0;
    for (const post of pendingPosts) {
      // AQUI entraria a chamada real para a API do Instagram/Facebook
      console.log(\`[PUBLICADO] Post para \${post.platform} agendado para \${post.scheduledFor}\`);
      
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() }
      });
      publishedCount++;
    }

    return res.json({ success: true, published: publishedCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Deletar post
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.scheduledPost.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
`;

fs.writeFileSync('src/routes/schedulerRoutes.ts', routesContent, 'utf8');
console.log('  ✅ schedulerRoutes.ts criado.');

// 3. REGISTRAR ROTA NO APIROUTES
console.log('[3/5] Registrando rota no apiRoutes.ts...');
const apiRoutesPath = 'src/routes/apiRoutes.ts';
let apiRoutes = fs.readFileSync(apiRoutesPath, 'utf8');

if (!apiRoutes.includes('schedulerRoutes')) {
    apiRoutes = "import schedulerRoutes from './schedulerRoutes';\n" + apiRoutes;
    apiRoutes = apiRoutes.replace('export default router;', "router.use('/scheduler', schedulerRoutes);\n\nexport default router;");
    fs.writeFileSync(apiRoutesPath, apiRoutes, 'utf8');
    console.log('  ✅ Rota registrada.');
}

// 4. ATUALIZAR FRONTEND (HTML)
console.log('[4/5] Atualizando index.html...');
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const schedulerButton = '<button class="nav-btn" onclick="showSection(\'scheduler\')">Agendamento</button>';
if (!html.includes("showSection('scheduler')")) {
    const lastNav = html.lastIndexOf('</nav>');
    html = html.slice(0, lastNav) + '\n            ' + schedulerButton + '\n        ' + html.slice(lastNav);
}

const schedulerSection = `
        <!-- AGENDAMENTO -->
        <section id="scheduler" class="section">
            <h2>Agendamento de Posts em Redes Sociais</h2>
            
            <div class="form-grid" style="background: #fdf4ff; border: 1px solid #d8b4fe;">
                <div class="input-group">
                    <label>Plataforma</label>
                    <select id="sched-platform">
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="LINKEDIN">LinkedIn</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Data e Hora da Publicação</label>
                    <input type="datetime-local" id="sched-date">
                </div>
                <div class="input-group" style="grid-column: 1 / -1;">
                    <label>Conteúdo do Post (Use a IA da aba Criativos para gerar)</label>
                    <textarea id="sched-content" rows="4" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;"></textarea>
                </div>
                <div class="input-group" style="grid-column: 1 / -1;">
                    <label>Hashtags (separadas por espaço)</label>
                    <input type="text" id="sched-tags" placeholder="#perfume #luxo #importados">
                </div>
                <button class="action-btn" onclick="createScheduledPost()" style="background: #9333ea; grid-column: 1 / -1;">Agendar Post</button>
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: center;">
                <h3>Posts Agendados</h3>
                <button class="action-btn" onclick="runSchedulerJob()" style="background: #10b981; padding: 8px 15px; font-size: 14px;">Simular Publicação (Job)</button>
            </div>
            <div id="scheduler-list" class="result-box" style="margin-top: 15px;">
                <p>Carregando posts...</p>
            </div>
        </section>
`;

if (!html.includes('id="scheduler"')) {
    const lastMain = html.lastIndexOf('</main>');
    html = html.slice(0, lastMain) + schedulerSection + '\n    ' + html.slice(lastMain);
}
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('  ✅ HTML atualizado.');

// 5. ATUALIZAR JAVASCRIPT
console.log('[5/5] Atualizando app-v3.js...');
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

const schedulerJs = `
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
            html += '<td><button onclick="deletePost(\\'' + p.id + '\\')" style="padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button></td>';
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
const originalShow = showSection;
showSection = function(id) {
    originalShow(id);
    if (id === 'scheduler') loadScheduler();
}
`;

if (!js.includes('async function loadScheduler()')) {
    js += schedulerJs;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('  ✅ JavaScript atualizado.');
}

console.log('\n🎉 IMPLEMENTAÇÃO CONCLUÍDA!');
console.log('Agora execute os seguintes comandos no PowerShell:');
console.log('1. npx prisma migrate dev --name add_scheduler');
console.log('2. npm run build');
console.log('3. Ctrl+C (para parar o servidor) e depois npm start');