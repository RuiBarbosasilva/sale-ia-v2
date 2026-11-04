CREATE TABLE "DropshippingTrendRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteId" TEXT NOT NULL DEFAULT 'MLB',
  "categoryId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errorCode" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "DropshippingTrendRun_siteId_categoryId_createdAt_idx"
  ON "DropshippingTrendRun"("siteId", "categoryId", "createdAt");
CREATE INDEX "DropshippingTrendRun_status_createdAt_idx"
  ON "DropshippingTrendRun"("status", "createdAt");

CREATE TABLE "DropshippingTrendSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "url" TEXT,
  "position" INTEGER NOT NULL,
  "trendGroup" TEXT NOT NULL,
  "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropshippingTrendSnapshot_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "DropshippingTrendRun" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DropshippingTrendSnapshot_runId_position_key"
  ON "DropshippingTrendSnapshot"("runId", "position");
CREATE INDEX "DropshippingTrendSnapshot_keyword_observedAt_idx"
  ON "DropshippingTrendSnapshot"("keyword", "observedAt");
CREATE INDEX "DropshippingTrendSnapshot_trendGroup_observedAt_idx"
  ON "DropshippingTrendSnapshot"("trendGroup", "observedAt");
