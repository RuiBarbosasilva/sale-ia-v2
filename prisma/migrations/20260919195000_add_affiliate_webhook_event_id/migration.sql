-- Prevent replaying the same affiliate webhook event into multiple sales.
CREATE UNIQUE INDEX "AffiliateSale_webhookEventId_key" ON "AffiliateSale"("webhookEventId");
