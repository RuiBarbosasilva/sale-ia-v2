import { Request, Response } from "express";
import { handleIncomingMessage } from "../services/leadService";

export async function handleWhatsAppWebhook(req: Request, res: Response) {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ status: "error", message: "phone e message são obrigatórios" });
    const result = await handleIncomingMessage(phone, message);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Erro no webhook do WhatsApp" });
  }
}