CREATE TABLE "SocialAutomationRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "runDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  "postCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialAutomationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SocialWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SocialAutomationRun_workspaceId_runDate_key" ON "SocialAutomationRun"("workspaceId", "runDate");
CREATE INDEX "SocialAutomationRun_status_startedAt_idx" ON "SocialAutomationRun"("status", "startedAt");
