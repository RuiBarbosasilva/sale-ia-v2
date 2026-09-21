import { Router } from "express";
import pricingService from "../services/pricingService";
import { adminAuthorization } from "../middlewares/security";

const router = Router();

/**
 * POST /quote
 *
 * Endpoint comercial principal.
 */
router.post("/quote", async (req, res) => {
  try {
    const {
      leadId,
      productId,
      productName,
      quantity,
      targetDiscountPercent
    } = req.body;

    const result = await pricingService.calculateQuote(
      {
        leadId,
        productName,
        quantity
      },
      productId,
      quantity,
      Number(targetDiscountPercent || 0)
    );

    return res.status(200).json({
      quoteId: result.quoteId,
      unitPrice: result.unitPrice,
      minimumUnitPrice: result.minimumUnitPrice,
      total: result.finalTotal,
      grossTotal: result.grossTotal,
      discountAmount: result.discountAmount
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.message
    });
  }
});

/**
 * Alias legado.
 */
router.post("/calculate", async (req, res) => {
  try {
    const {
      leadId,
      productId,
      productName,
      quantity,
      targetDiscountPercent
    } = req.body;

    const result = await pricingService.calculateQuote(
      {
        leadId,
        productName,
        quantity
      },
      productId,
      quantity,
      Number(targetDiscountPercent || 0)
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message
    });
  }
});

/**
 * GET /:id
 */
router.get("/:id", async (req, res) => {
  try {
    const quote = await pricingService.getQuoteById(
      req.params.id
    );

    return res.status(200).json(quote);
  } catch (error: any) {
    return res.status(404).json({
      error: error.message
    });
  }
});

/**
 * POST /negotiate
 */
router.post("/negotiate", adminAuthorization, async (req, res) => {
  try {
    const result =
      await pricingService.negotiateQuote({
        quoteId: req.body.quoteId,
        targetDiscountPercent:
          req.body.requestedDiscountPct ??
          req.body.targetDiscountPercent,
        proposedTotal: req.body.proposedTotal,
        requestedPrice: req.body.requestedPrice
      });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message
    });
  }
});

export default router;
