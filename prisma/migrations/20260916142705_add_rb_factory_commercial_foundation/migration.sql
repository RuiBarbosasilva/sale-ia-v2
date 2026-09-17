-- RB FACTORY SITES - SPRINT 1
-- Reconciliacao do estado parcial do SQLite
-- IMPORTANTE: esta migration assume que WebsitePlan e os campos
-- iniciais de WebsiteProspect ja existem no banco.

-- ============================================================
-- 1. WebsiteProspect - campos que ainda nao existem
-- ============================================================

ALTER TABLE "WebsiteProspect" ADD COLUMN "prospectingDate" DATETIME;
ALTER TABLE "WebsiteProspect" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "WebsiteProspect" ADD COLUMN "notes" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "contactedAt" DATETIME;
ALTER TABLE "WebsiteProspect" ADD COLUMN "lastContactAt" DATETIME;
ALTER TABLE "WebsiteProspect" ADD COLUMN "nextFollowUpAt" DATETIME;
ALTER TABLE "WebsiteProspect" ADD COLUMN "lostReason" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "estimatedValue" REAL;
ALTER TABLE "WebsiteProspect" ADD COLUMN "auditData" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "auditPerformedAt" DATETIME;
ALTER TABLE "WebsiteProspect" ADD COLUMN "selectedPlanId" TEXT;

-- Preenche a data dos prospects existentes.
UPDATE "WebsiteProspect"
SET "prospectingDate" = CURRENT_TIMESTAMP
WHERE "prospectingDate" IS NULL;

CREATE INDEX "WebsiteProspect_selectedPlanId_idx"
ON "WebsiteProspect"("selectedPlanId");

-- ============================================================
-- 2. WebsiteProspectEvent
-- ============================================================

CREATE TABLE "WebsiteProspectEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteProspectEvent_prospectId_fkey"
        FOREIGN KEY ("prospectId")
        REFERENCES "WebsiteProspect"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX "WebsiteProspectEvent_prospectId_idx"
ON "WebsiteProspectEvent"("prospectId");

CREATE INDEX "WebsiteProspectEvent_type_idx"
ON "WebsiteProspectEvent"("type");

CREATE INDEX "WebsiteProspectEvent_createdAt_idx"
ON "WebsiteProspectEvent"("createdAt");

-- ============================================================
-- 3. WebsiteSubscription
-- ============================================================

CREATE TABLE "WebsiteSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "planId" TEXT,
    "planCode" TEXT,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextBillingDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebsiteSubscription_prospectId_fkey"
        FOREIGN KEY ("prospectId")
        REFERENCES "WebsiteProspect"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX "WebsiteSubscription_prospectId_idx"
ON "WebsiteSubscription"("prospectId");

CREATE INDEX "WebsiteSubscription_status_idx"
ON "WebsiteSubscription"("status");

CREATE INDEX "WebsiteSubscription_nextBillingDate_idx"
ON "WebsiteSubscription"("nextBillingDate");

-- ============================================================
-- 4. Validacao
-- ============================================================

PRAGMA foreign_key_check;
