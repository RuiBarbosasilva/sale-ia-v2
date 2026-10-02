import { randomUUID } from 'crypto';
import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { websiteService } from './websiteService';

type ClientRow = {
  id: string;
  prospectId: string;
  projectId: string | null;
  currentDemoId: string | null;
  companyName: string;
  domainName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  maintenancePlan: string;
  suggestionIntervalDays: number;
  nextSuggestionAt: string | null;
  lastSuggestionAt: string | null;
  lastChangeAt: string | null;
  currentSourceCode: string | null;
  contentSnapshot: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
};

const nowIso = () => new Date().toISOString();
const addDays = (days: number) => new Date(Date.now() + Math.max(1, days) * 86400000).toISOString();

function parseJson(value: string | null): any {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

async function getClient(id: string): Promise<ClientRow | null> {
  const rows = await prisma.$queryRawUnsafe<ClientRow[]>(
    'SELECT * FROM "RbFactorySiteClient" WHERE "id" = ? LIMIT 1', id
  );
  return rows[0] || null;
}

async function getDemo(demoId: string) {
  return prisma.websiteDemo.findUnique({
    where: { id: demoId },
    include: { prospect: true }
  });
}

function buildSuggestions(client: ClientRow) {
  const meta = parseJson(client.metadata) || {};
  const suggestions = [
    {
      category: 'CONTEUDO',
      title: 'Atualizar a mensagem principal do site',
      reason: 'Uma revisão periódica da proposta principal evita que o site fique estático e ajuda a destacar serviços ou diferenciais atuais.',
      proposal: 'Revisar headline, subtítulo e chamada para ação com base nos serviços atuais do cliente.',
      priority: 'NORMAL'
    },
    {
      category: 'CONVERSAO',
      title: 'Revisar chamadas para WhatsApp e contato',
      reason: 'Os canais de contato são uma das áreas mais importantes para transformar visitas em oportunidades.',
      proposal: 'Revisar CTAs, botão de WhatsApp, telefone, formulário e mensagens de conversão.',
      priority: 'HIGH'
    },
    {
      category: 'VISUAL',
      title: 'Atualizar fotos e elementos visuais',
      reason: 'Sites de negócios locais ganham relevância quando apresentam fotos atuais da empresa, equipe, produtos ou serviços.',
      proposal: 'Substituir imagens antigas por fotos recentes ou novas imagens de banco licenciadas e revisar a hierarquia visual.',
      priority: 'NORMAL'
    },
    {
      category: 'SEO_LOCAL',
      title: 'Reforçar presença local no site',
      reason: 'O conteúdo pode ser revisado para deixar mais claros cidade, bairros atendidos, serviços e intenção local.',
      proposal: 'Atualizar títulos, descrições, textos de serviços e sinais locais relacionados ao negócio.',
      priority: 'NORMAL'
    },
    {
      category: 'NOVIDADE',
      title: 'Criar uma nova seção comercial',
      reason: 'Uma nova seção pode comunicar uma oferta, serviço, produto, depoimento ou campanha que ainda não esteja representada.',
      proposal: 'Adicionar uma seção específica escolhida a partir das novidades do cliente e do histórico do site.',
      priority: 'NORMAL'
    }
  ];

  if (meta.lastSuggestionCategory) {
    return suggestions.filter((s) => s.category !== meta.lastSuggestionCategory);
  }
  return suggestions;
}

export const rbFactorySiteMaintenanceService = {
  async createFromProject(projectId: string, options: any = {}) {
    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: { prospect: true }
    });
    if (!project) throw new Error('Projeto do site não encontrado');

    const demo = await prisma.websiteDemo.findFirst({
      where: { prospectId: project.prospectId, status: 'APPROVED' },
      orderBy: { generatedAt: 'desc' }
    }) || await prisma.websiteDemo.findFirst({
      where: { prospectId: project.prospectId },
      orderBy: { generatedAt: 'desc' }
    });
    if (!demo) throw new Error('Nenhuma demo encontrada para este cliente');

    const existing = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM "RbFactorySiteClient" WHERE "projectId" = ? LIMIT 1', projectId
    );
    if (existing[0]) return existing[0];

    const id = randomUUID();
    const interval = Math.max(7, Number(options.suggestionIntervalDays) || 30);
    const contentSnapshot = demo.previewData || JSON.stringify({ businessName: project.prospect.companyName });
    await prisma.$executeRawUnsafe(
      `INSERT INTO "RbFactorySiteClient"
      ("id","prospectId","projectId","currentDemoId","companyName","domainName","contactName","contactPhone","contactEmail","status","maintenancePlan","suggestionIntervalDays","nextSuggestionAt","currentSourceCode","contentSnapshot","metadata","createdAt","updatedAt")
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, project.prospectId, project.id, demo.id, project.prospect.companyName,
      project.domainName || null, project.prospect.contactPerson || null,
      project.prospect.phone || null, project.prospect.email || null,
      'ACTIVE', options.maintenancePlan || 'MONITORING', interval, addDays(interval),
      demo.sourceCode || null, contentSnapshot,
      JSON.stringify({ createdFromDemoId: demo.id, lastSuggestionCategory: null }),
      nowIso(), nowIso()
    );

    await this.createSnapshot(id, demo.id, demo.sourceCode || null, contentSnapshot, null);
    return getClient(id);
  },

  async listClients() {
    return prisma.$queryRawUnsafe<ClientRow[]>(
      'SELECT * FROM "RbFactorySiteClient" ORDER BY "updatedAt" DESC'
    );
  },

  async getDetails(id: string) {
    const client = await getClient(id);
    if (!client) throw new Error('Cliente de site não encontrado');

    const [requests, suggestions, snapshots] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM "RbFactorySiteChangeRequest" WHERE "clientId" = ? ORDER BY "createdAt" DESC', id
      ),
      prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM "RbFactorySiteSuggestion" WHERE "clientId" = ? ORDER BY "createdAt" DESC', id
      ),
      prisma.$queryRawUnsafe<any[]>(
        'SELECT id,demoId,version,changeRequestId,createdAt FROM "RbFactorySiteSnapshot" WHERE "clientId" = ? ORDER BY "createdAt" DESC', id
      )
    ]);
    return { client, requests, suggestions, snapshots };
  },

  async createChangeRequest(clientId: string, input: any) {
    const client = await getClient(clientId);
    if (!client) throw new Error('Cliente de site não encontrado');
    if (!String(input.description || '').trim()) throw new Error('Descrição da alteração é obrigatória');

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "RbFactorySiteChangeRequest"
      ("id","clientId","type","title","description","priority","status","requestedBy","source","createdAt","updatedAt")
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      id, clientId, String(input.type || 'CONTENT'), String(input.title || 'Alteração solicitada'),
      String(input.description).trim(), String(input.priority || 'NORMAL'), 'OPEN',
      input.requestedBy || client.contactName || null, input.source || 'CLIENT', nowIso(), nowIso()
    );
    return this.getDetails(clientId);
  },

  async applyChangeRequest(clientId: string, requestId: string) {
    const client = await getClient(clientId);
    if (!client) throw new Error('Cliente de site não encontrado');

    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM "RbFactorySiteChangeRequest" WHERE "id" = ? AND "clientId" = ? LIMIT 1',
      requestId, clientId
    );
    const request = rows[0];
    if (!request) throw new Error('Solicitação de alteração não encontrada');

    const currentDemo = client.currentDemoId ? await getDemo(client.currentDemoId) : null;
    if (!currentDemo) throw new Error('Versão atual do site não encontrada');

    let briefing: any = {};
    try {
      const pd = JSON.parse(currentDemo.previewData || '{}');
      briefing = pd.briefing || pd || {};
    } catch {}

    const previousAdditional = String(briefing.additionalInfo || '');
    briefing.additionalInfo = [previousAdditional, `ALTERAÇÃO SOLICITADA PELO CLIENTE: ${request.title}. ${request.description}`]
      .filter(Boolean).join('\n\n');

    const result = await websiteService.generateFromBriefing(
      client.prospectId,
      currentDemo.templateId || null,
      briefing,
      true
    );

    await this.createSnapshot(clientId, currentDemo.id, currentDemo.sourceCode || null, currentDemo.previewData || null, requestId);

    await prisma.$executeRawUnsafe(
      `UPDATE "RbFactorySiteClient"
       SET "currentDemoId" = ?, "currentSourceCode" = ?, "contentSnapshot" = ?, "lastChangeAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      result.demo.id, result.demo.sourceCode || null, result.demo.previewData || null, nowIso(), nowIso(), clientId
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "RbFactorySiteChangeRequest"
       SET "status" = 'APPLIED', "appliedDemoId" = ?, "resolutionNotes" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      result.demo.id, 'Nova versão gerada para revisão antes da publicação.', nowIso(), requestId
    );

    return { requestId, demoId: result.demo.id, version: result.demo.version, previewUrl: `/api/websites/studio/demos/${result.demo.id}/html` };
  },

  async createSnapshot(clientId: string, demoId: string | null, sourceCode: string | null, contentSnapshot: string | null, changeRequestId: string | null) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT COALESCE(MAX("version"),0) AS maxVersion FROM "RbFactorySiteSnapshot" WHERE "clientId" = ?', clientId
    );
    const version = Number(rows[0]?.maxVersion || 0) + 1;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "RbFactorySiteSnapshot" ("id","clientId","demoId","version","sourceCode","contentSnapshot","changeRequestId","createdAt") VALUES (?,?,?,?,?,?,?,?)`,
      randomUUID(), clientId, demoId, version, sourceCode, contentSnapshot, changeRequestId, nowIso()
    );
    return version;
  },

  async generateDueSuggestions(limit = 50) {
    const due = await prisma.$queryRawUnsafe<ClientRow[]>(
      `SELECT * FROM "RbFactorySiteClient"
       WHERE "status" = 'ACTIVE'
       AND ("nextSuggestionAt" IS NULL OR datetime("nextSuggestionAt") <= datetime('now'))
       ORDER BY "nextSuggestionAt" ASC LIMIT ?`, Math.max(1, limit)
    );
    const created: any[] = [];

    for (const client of due) {
      const options = buildSuggestions(client);
      const suggestion = options[0];
      if (!suggestion) continue;

      const id = randomUUID();
      const scheduledFor = nowIso();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "RbFactorySiteSuggestion"
        ("id","clientId","category","title","reason","proposal","priority","status","scheduledFor","createdAt")
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        id, client.id, suggestion.category, suggestion.title, suggestion.reason,
        suggestion.proposal, suggestion.priority, 'READY_TO_SEND', scheduledFor, nowIso()
      );

      const meta = parseJson(client.metadata) || {};
      meta.lastSuggestionCategory = suggestion.category;
      await prisma.$executeRawUnsafe(
        `UPDATE "RbFactorySiteClient"
         SET "lastSuggestionAt" = ?, "nextSuggestionAt" = ?, "metadata" = ?, "updatedAt" = ?
         WHERE "id" = ?`,
        nowIso(), addDays(client.suggestionIntervalDays), JSON.stringify(meta), nowIso(), client.id
      );
      created.push({ clientId: client.id, suggestionId: id, ...suggestion });
    }
    return created;
  },

  async markSuggestionSent(id: string) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "RbFactorySiteSuggestion" SET "status"='SENT', "sentAt"=? WHERE "id"=?`, nowIso(), id
    );
    return result;
  }
};
