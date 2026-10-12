CREATE TABLE "DropshippingResearchWatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "query" TEXT NOT NULL,
  "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" DATETIME,
  "nextRunAt" DATETIME,
  "lastStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DropshippingResearchWatch_query_key" ON "DropshippingResearchWatch"("query");
CREATE INDEX "DropshippingResearchWatch_enabled_nextRunAt_idx" ON "DropshippingResearchWatch"("enabled", "nextRunAt");
CREATE INDEX "DropshippingResearchWatch_lastStatus_updatedAt_idx" ON "DropshippingResearchWatch"("lastStatus", "updatedAt");
