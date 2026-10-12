CREATE TABLE "DropshippingProductCandidate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "externalId" TEXT,
  "canonicalUrl" TEXT NOT NULL,
  "marketplace" TEXT NOT NULL,
  "observedPrice" REAL,
  "observedSales" INTEGER,
  "observedReviews" INTEGER,
  "observedStock" INTEGER,
  "shippingWeightGrams" INTEGER,
  "fragile" BOOLEAN,
  "hasSizeVariants" BOOLEAN,
  "evidence" TEXT NOT NULL,
  "suitabilityScore" REAL NOT NULL DEFAULT 0,
  "candidateForTesting" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'WATCH',
  "blockers" TEXT,
  "warnings" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DropshippingProductCandidate_marketplace_createdAt_idx" ON "DropshippingProductCandidate"("marketplace", "createdAt");
CREATE INDEX "DropshippingProductCandidate_suitabilityScore_idx" ON "DropshippingProductCandidate"("suitabilityScore");
CREATE INDEX "DropshippingProductCandidate_status_idx" ON "DropshippingProductCandidate"("status");
CREATE INDEX "DropshippingProductCandidate_externalId_idx" ON "DropshippingProductCandidate"("externalId");
