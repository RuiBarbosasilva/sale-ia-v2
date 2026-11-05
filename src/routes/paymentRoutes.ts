import { Router, Request, Response } from "express";
import { paymentService } from "../services/paymentService";
import { timingSafeSecret } from "../middlewares/security";

const router = Router();

function paymentWebhookGuard(req: Request, res: Response, next: import("express").NextFunction) {
  if (!timingSafeSecret(process.env.PAYMENT_WEBHOOK_SECRET, req.header("x-payment-webhook-secret"))) {
    return res.status(401).json({ success: false, error: "PAYMENT_WEBHOOK_UNAUTHORIZED" });
  }
  return next();
}

/**
 * Webhook genérico de confirmação de pagamento.
 *
 * O formato é propositalmente simples para permitir
 * integração posterior com o gateway escolhido.
 */
router.post("/webhook", paymentWebhookGuard, async (req: Request, res: Response) => {
  try {

    const body = req.body || {};

    const orderId = body.orderId;
    const transactionId = body.transactionId;
    const amount = Number(body.amount);
    const provider = body.provider || "MANUAL";

    const payment = await paymentService.confirmPayment({
      orderId,
      transactionId,
      amount,
      provider
    });

    return res.status(200).json({
      success: true,
      idempotent: (new Date().getTime() - new Date(payment.createdAt).getTime()) > 5000,
      payment
    });

  } catch (error: any) {

    console.error("Erro no webhook de pagamento:", error);

    return res.status(400).json({
      success: false,
      error: error?.message || "Erro ao processar pagamento."
    });
  }
});

export default router;
