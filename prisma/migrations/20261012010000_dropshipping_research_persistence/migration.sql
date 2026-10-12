CREATE TABLE "DropshippingResearchRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "query" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "totalResults" INTEGER NOT NULL DEFAULT 0,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resultSummary" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DropshippingResearchRun_query_createdAt_idx" ON "DropshippingResearchRun"("query", "createdAt");
CREATE INDEX "DropshippingResearchRun_source_createdAt_idx" ON "DropshippingResearchRun"("source", "createdAt");
CREATE INDEX "DropshippingResearchRun_status_idx" ON "DropshippingResearchRun"("status");

CREATE TABLE "DropshippingCatalogSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "price" REAL NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "availableQuantity" INTEGER,
  "soldQuantity" INTEGER,
  "condition" TEXT,
  "url" TEXT NOT NULL,
  "categoryId" TEXT,
  "freeShipping" BOOLEAN,
  "sellerId" INTEGER,
  "evidenceConfidencePct" INTEGER NOT NULL DEFAULT 0,
  "warnings" TEXT,
  "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropshippingCatalogSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DropshippingResearchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DropshippingCatalogSnapshot_runId_itemId_key" ON "DropshippingCatalogSnapshot"("runId", "itemId");
CREATE INDEX "DropshippingCatalogSnapshot_itemId_observedAt_idx" ON "DropshippingCatalogSnapshot"("itemId", "observedAt");
CREATE INDEX "DropshippingCatalogSnapshot_title_idx" ON "DropshippingCatalogSnapshot"("title");
CREATE INDEX "DropshippingCatalogSnapshot_price_idx" ON "DropshippingCatalogSnapshot"("price");

CREATE TABLE "DropshippingSupplierCandidate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "website" TEXT,
  "contactUrl" TEXT,
  "country" TEXT NOT NULL DEFAULT 'BR',
  "shipsFromBrazil" BOOLEAN NOT NULL DEFAULT false,
  "offersDropshipping" BOOLEAN NOT NULL DEFAULT false,
  "issuesInvoice" BOOLEAN,
  "stockFeedAvailable" BOOLEAN,
  "trackingAvailable" BOOLEAN,
  "returnPolicyUrl" TEXT,
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING_VALIDATION',
  "reliabilityScore" REAL NOT NULL DEFAULT 0,
  "evidence" TEXT NOT NULL,
  "blockers" TEXT,
  "lastVerifiedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DropshippingSupplierCandidate_validationStatus_idx" ON "DropshippingSupplierCandidate"("validationStatus");
CREATE INDEX "DropshippingSupplierCandidate_reliabilityScore_idx" ON "DropshippingSupplierCandidate"("reliabilityScore");
CREATE INDEX "DropshippingSupplierCandidate_name_idx" ON "DropshippingSupplierCandidate"("name");

CREATE TABLE "DropshippingAlert" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" DATETIME
);
CREATE INDEX "DropshippingAlert_status_createdAt_idx" ON "DropshippingAlert"("status", "createdAt");
CREATE INDEX "DropshippingAlert_type_severity_idx" ON "DropshippingAlert"("type", "severity");
