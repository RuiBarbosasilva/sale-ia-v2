CREATE TABLE IF NOT EXISTS "RbFactorySiteClient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "prospectId" TEXT NOT NULL,
  "projectId" TEXT,
  "currentDemoId" TEXT,
  "companyName" TEXT NOT NULL,
  "domainName" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "maintenancePlan" TEXT NOT NULL DEFAULT 'MONITORING',
  "suggestionIntervalDays" INTEGER NOT NULL DEFAULT 30,
  "nextSuggestionAt" DATETIME,
  "lastSuggestionAt" DATETIME,
  "lastChangeAt" DATETIME,
  "currentSourceCode" TEXT,
  "contentSnapshot" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbFactorySiteClient_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "WebsiteProspect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RbFactorySiteClient_status_idx" ON "RbFactorySiteClient"("status");
CREATE INDEX IF NOT EXISTS "RbFactorySiteClient_prospectId_idx" ON "RbFactorySiteClient"("prospectId");
CREATE INDEX IF NOT EXISTS "RbFactorySiteClient_nextSuggestionAt_idx" ON "RbFactorySiteClient"("nextSuggestionAt");

CREATE TABLE IF NOT EXISTS "RbFactorySiteChangeRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CONTENT',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "requestedBy" TEXT,
  "source" TEXT NOT NULL DEFAULT 'CLIENT',
  "appliedDemoId" TEXT,
  "resolutionNotes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbFactorySiteChangeRequest_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "RbFactorySiteClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RbFactorySiteChangeRequest_clientId_idx" ON "RbFactorySiteChangeRequest"("clientId");
CREATE INDEX IF NOT EXISTS "RbFactorySiteChangeRequest_status_idx" ON "RbFactorySiteChangeRequest"("status");

CREATE TABLE IF NOT EXISTS "RbFactorySiteSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "proposal" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" DATETIME,
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbFactorySiteSuggestion_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "RbFactorySiteClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RbFactorySiteSuggestion_clientId_idx" ON "RbFactorySiteSuggestion"("clientId");
CREATE INDEX IF NOT EXISTS "RbFactorySiteSuggestion_status_idx" ON "RbFactorySiteSuggestion"("status");
CREATE INDEX IF NOT EXISTS "RbFactorySiteSuggestion_scheduledFor_idx" ON "RbFactorySiteSuggestion"("scheduledFor");

CREATE TABLE IF NOT EXISTS "RbFactorySiteSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "demoId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceCode" TEXT,
  "contentSnapshot" TEXT,
  "changeRequestId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbFactorySiteSnapshot_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "RbFactorySiteClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RbFactorySiteSnapshot_clientId_idx" ON "RbFactorySiteSnapshot"("clientId");
CREATE INDEX IF NOT EXISTS "RbFactorySiteSnapshot_createdAt_idx" ON "RbFactorySiteSnapshot"("createdAt");
