import { Router, Request, Response } from "express";
import { resetLeadHumanMode, getLeads } from "../services/leadService";
import { adminAuthorization } from '../middlewares/security';

const router = Router();
// Listar leads (CRM)
router.get('/', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { status, stage, search } = req.query;
    const leads = await getLeads({
      status: status as string,
      stage: stage as string,
      search: search as string
    });
    return res.json({ success: true, leads });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});


router.post("/reset-human-mode", adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: "error", message: "O campo 'phone' é obrigatório." });
    const result = await resetLeadHumanMode(phone);
    if (!result.success) return res.status(404).json({ status: "error", message: result.message });
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Erro interno no servidor." });
  }
});

export default router;