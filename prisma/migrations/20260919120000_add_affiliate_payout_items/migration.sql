-- CreateTable
CREATE TABLE "AffiliatePayoutItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payoutId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliatePayoutItem_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "AffiliatePayout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AffiliatePayoutItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "AffiliateSale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliatePayoutItem_payoutId_saleId_key" ON "AffiliatePayoutItem"("payoutId", "saleId");

-- CreateIndex
CREATE INDEX "AffiliatePayoutItem_saleId_idx" ON "AffiliatePayoutItem"("saleId");

-- CreateIndex
CREATE INDEX "AffiliatePayoutItem_payoutId_idx" ON "AffiliatePayoutItem"("payoutId");
