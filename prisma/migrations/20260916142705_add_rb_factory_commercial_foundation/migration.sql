-- ==========================================
-- RB FACTORY SITES - SPRINT 1
-- Commercial Foundation Migration
-- Criado manualmente (nao via prisma migrate dev)
-- ==========================================

-- ==========================================
-- PASSO 1: Criar tabela WebsitePlan (nova)
-- (WebsiteProspect ira referenciar esta tabela)
-- ==========================================
CREATE TABLE "WebsitePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectPrice" REAL,
    "monthlyPrice" REAL,
    "features" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Unique constraint em code
CREATE UNIQUE INDEX "WebsitePlan_code_key" ON "WebsitePlan"("code");

-- Indice adicional em code (conforme @@index([code]) do schema)
CREATE INDEX "WebsitePlan_code_idx" ON "WebsitePlan"("code");


-- ==========================================
-- PASSO 2: Adicionar campos comerciais em WebsiteProspect
-- SQLite permite ALTER TABLE ADD COLUMN para campos nullable
-- Todos os novos campos sao nullable ou tem default
-- ==========================================

ALTER TABLE "WebsiteProspect" ADD COLUMN "address" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "instagram" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "facebook" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "description" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "businessHours" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebsiteProspect" ADD COLUMN "rating" REAL DEFAULT 0;
ALTER TABLE "WebsiteProspect" ADD COLUMN "photoCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebsiteProspect" ADD COLUMN "source" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "WebsiteProspect" ADD COLUMN "prospectingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
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

-- selectedPlanId com FK para WebsitePlan
-- SQLite permite ADD COLUMN com REFERENCES inline
ALTER TABLE "WebsiteProspect" ADD COLUMN "selectedPlanId" TEXT REFERENCES "WebsitePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indice em selectedPlanId (FK geralmente indexada)
CREATE INDEX "WebsiteProspect_selectedPlanId_idx" ON "WebsiteProspect"("selectedPlanId");


-- ==========================================
-- PASSO 3: Criar tabela WebsiteProspectEvent (nova)
-- ==========================================
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

CREATE INDEX "WebsiteProspectEvent_prospectId_idx" ON "WebsiteProspectEvent"("prospectId");
CREATE INDEX "WebsiteProspectEvent_type_idx" ON "WebsiteProspectEvent"("type");
CREATE INDEX "WebsiteProspectEvent_createdAt_idx" ON "WebsiteProspectEvent"("createdAt");


-- ==========================================
-- PASSO 4: Criar tabela WebsiteSubscription (nova)
-- ==========================================
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

CREATE INDEX "WebsiteSubscription_prospectId_idx" ON "WebsiteSubscription"("prospectId");
CREATE INDEX "WebsiteSubscription_status_idx" ON "WebsiteSubscription"("status");
CREATE INDEX "WebsiteSubscription_nextBillingDate_idx" ON "WebsiteSubscription"("nextBillingDate");


-- ==========================================
-- PASSO 5: Validacao de integridade referencial
-- ==========================================
PRAGMA foreign_key_check;

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================