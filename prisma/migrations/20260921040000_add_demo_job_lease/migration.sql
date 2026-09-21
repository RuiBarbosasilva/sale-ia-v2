-- RB Factory Sites: persist demo jobs in migrations so fresh databases can deploy
-- the worker lease safely before the application starts.

CREATE TABLE IF NOT EXISTS "WebsiteDemoJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "prospectId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "priority" INTEGER NOT NULL DEFAULT 5,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "currentStage" TEXT,
  "error" TEXT,
  "demoId" TEXT,
  "startedAt" DATETIME,
  "leaseUntil" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WebsiteDemoJob_status_idx"
ON "WebsiteDemoJob"("status");

CREATE INDEX IF NOT EXISTS "WebsiteDemoJob_prospectId_idx"
ON "WebsiteDemoJob"("prospectId");

CREATE INDEX IF NOT EXISTS "WebsiteDemoJob_leaseUntil_idx"
ON "WebsiteDemoJob"("leaseUntil");
