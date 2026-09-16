import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

/**
 * Função de Recuperação Automã£Â¡tica de Leads.
 * Verifica leads inativos hã£Â¡ mais de 30 minutos em que a IA estava conversando e dispara mensagem de resgate.
 */
export async function runLeadRecoveryEngine() {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const inactiveLeads = await prisma.lead.findMany({
      where: {
        stage: { not: "HUMAN_ATTENDANCE" },
        updatedAt: { lte: thirtyMinutesAgo },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    for (const lead of inactiveLeads) {
      const lastMessage = lead.messages[0];
      
      // Se a última mensagem veio do cliente, enviamos uma mensagem de recuperação
      if (lastMessage && lastMessage.sender === "user") {
        const recoveryText = "Olã£Â¡! Ficou alguma dúvida sobre o nosso produto? Estou aqui para te ajudar a garantir sua vaga com condição especial hoje!";
        
        await prisma.message.create({
          data: {
            leadId: lead.id,
            sender: "AI",
            content: recoveryText
          }
        });

        // Atualiza a data para nã£Â£o enviar em loop
        await prisma.lead.update({
          where: { id: lead.id },
          data: { updatedAt: new Date() }
        });

        const apiUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const instance = process.env.EVOLUTION_INSTANCE_NAME;

        if (apiUrl && apiKey && instance) {
          await axios.post(
            `${apiUrl}/message/sendText/${instance}`,
            { number: lead.phone, text: recoveryText },
            { headers: { apikey: apiKey } }
          ).catch(err => console.error("Erro na recuperação automã£Â¡tica:", err.message));
        }

        console.log(`[RECUPERAã£â€¡ã£Â£O DE VENDAS] Mensagem enviada para o lead: ${lead.phone}`);
      }
    }
  } catch (error) {
    console.error("Erro na execução do motor de recuperação:", error);
  }
}


