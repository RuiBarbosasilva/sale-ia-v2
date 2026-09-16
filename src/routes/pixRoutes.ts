import { Router, Request, Response } from "express";
import { generatePixPayload, generatePixImageBase64 } from "../services/pixService";

const router = Router();

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { amount, txId, key, name, city } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ status: "error", message: "Informe um valor válido em 'amount'." });
    }

    const pixKey = key || process.env.PIX_KEY || "seu-email@dominio.com";
    const merchantName = name || process.env.PIX_NAME || "SUA EMPRESA";
    const merchantCity = city || process.env.PIX_CITY || "SAO PAULO";

    const pixPayload = generatePixPayload({
      key: pixKey,
      name: merchantName,
      city: merchantCity,
      amount: Number(amount),
      txId: txId || "ORC" + Date.now().toString().slice(-6),
    });

    const qrCodeBase64 = await generatePixImageBase64(pixPayload);

    return res.status(200).json({
      status: "success",
      data: {
        amount: Number(amount),
        txId,
        pixCode: pixPayload,
        qrCodeBase64,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Erro ao gerar código PIX." });
  }
});

export default router;