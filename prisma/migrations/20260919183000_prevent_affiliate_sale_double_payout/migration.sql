-- Prevent the same affiliate sale from being allocated to more than one payout.
CREATE UNIQUE INDEX "AffiliatePayoutItem_saleId_key" ON "AffiliatePayoutItem"("saleId");
