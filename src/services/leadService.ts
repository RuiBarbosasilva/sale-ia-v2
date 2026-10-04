import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getOrCreateLead(phone: string, name?: string) {
  let lead = await prisma.lead.findUnique({ where: { phone } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: { phone, name: name || "Cliente", status: "NEW_LEAD", stage: "NEW" }
    });
  }
  return lead;
}

export async function setHumanMode(leadId: string, status: boolean) {
  try {
    const currentLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!currentLead) return { success: false, message: "Lead nã£Â£o encontrado." };
    
    // PROTEã£â€¡ã£Â£O: Nã£Â£o alterar modo humano de leads jã£Â¡ convertidos ou encerrados
    if (currentLead.stage === "PEDIDO_CONFIRMADO" || currentLead.status === "CLOSED_WON" || currentLead.status === "CLOSED_LOST") {
      return { success: false, message: "Nã£Â£o é possã£Â­vel alterar o modo humano de um lead jã£Â¡ convertido ou encerrado." };
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { status: status ? "HUMAN_HANDOVER" : "NEW_LEAD", stage: status ? "HUMAN_ATTENDANCE" : "NEW" }
    });
    return { success: true, message: "Modo humano atualizado com sucesso.", lead };
  } catch (error: any) {
    return { success: false, message: error.message || "Erro ao atualizar modo humano." };
  }
}

export async function resetLeadHumanMode(leadId: string) { return setHumanMode(leadId, false); }

export async function handleIncomingMessage(phone: string, text: string, name?: string) {
  const lead = await getOrCreateLead(phone, name);
  await prisma.message.create({ data: { lead: { connect: { id: lead.id } }, sender: "LEAD", content: text } });
  const normalizedText = text.toLowerCase();
  const requiresHuman = normalizedText.includes("humano") || normalizedText.includes("atendente");
  if (requiresHuman) await setHumanMode(lead.id, true);
  return {
    phone: lead.phone, lead,
    reply: requiresHuman ? "Transferindo para atendimento humano..." : "Mensagem recebida com sucesso!",
    requiresHuman, intent: requiresHuman ? "HUMAN_ESCALATION" : "GENERAL_INQUIRY",
    status: requiresHuman ? "HUMAN_HANDOVER" : "PROCESSED"
  };
}

export async function getLeadHistory(leadId: string) {
  const messages = await prisma.message.findMany({ where: { leadId }, orderBy: { createdAt: "asc" } });
  return messages.map((msg) => ({ role: msg.sender === "LEAD" ? "user" : "assistant", content: msg.content }));
}

export async function getLeads(filters?: { status?: string; stage?: string; search?: string }) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.stage) where.stage = filters.stage;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { phone: { contains: filters.search } },
      { email: { contains: filters.search } }
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true, quotes: true, orders: true } }
    }
  });

  return leads;
}