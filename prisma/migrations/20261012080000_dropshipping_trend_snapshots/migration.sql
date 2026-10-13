CREATE TABLE "DropshippingTrendSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "keyword" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
  "sourceUrl" TEXT,
  "categoryId" TEXT,
  "rank" INTEGER,
  "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rawData" TEXT
);

CREATE INDEX "DropshippingTrendSnapshot_keyword_observedAt_idx" ON "DropshippingTrendSnapshot"("keyword", "observedAt");
CREATE INDEX "DropshippingTrendSnapshot_source_observedAt_idx" ON "DropshippingTrendSnapshot"("source", "observedAt");
CREATE INDEX "DropshippingTrendSnapshot_categoryId_observedAt_idx" ON "DropshippingTrendSnapshot"("categoryId", "observedAt");
