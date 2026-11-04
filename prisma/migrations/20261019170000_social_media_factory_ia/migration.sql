-- Social Media Factory IA
CREATE TABLE "SocialWorkspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "niche" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "settings" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SocialWorkspace_slug_key" ON "SocialWorkspace"("slug");
CREATE INDEX "SocialWorkspace_active_updatedAt_idx" ON "SocialWorkspace"("active", "updatedAt");

CREATE TABLE "SocialAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "accountName" TEXT,
  "externalId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "credentialsRef" TEXT,
  "scopes" TEXT,
  "lastCheckedAt" DATETIME,
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SocialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SocialWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SocialAccount_workspaceId_platform_externalId_key" ON "SocialAccount"("workspaceId", "platform", "externalId");
CREATE INDEX "SocialAccount_workspaceId_platform_status_idx" ON "SocialAccount"("workspaceId", "platform", "status");

CREATE TABLE "SocialPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'IMAGE',
  "title" TEXT,
  "caption" TEXT NOT NULL,
  "hashtags" TEXT,
  "mediaUrls" TEXT,
  "linkUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" DATETIME,
  "publishedAt" DATETIME,
  "externalPostId" TEXT,
  "publishedUrl" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SocialPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SocialWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SocialPost_workspaceId_status_scheduledFor_idx" ON "SocialPost"("workspaceId", "status", "scheduledFor");
CREATE INDEX "SocialPost_platform_status_scheduledFor_idx" ON "SocialPost"("platform", "status", "scheduledFor");
CREATE INDEX "SocialPost_createdAt_idx" ON "SocialPost"("createdAt");

CREATE TABLE "SocialPublishLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "message" TEXT,
  "response" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialPublishLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SocialPublishLog_postId_createdAt_idx" ON "SocialPublishLog"("postId", "createdAt");
CREATE INDEX "SocialPublishLog_platform_outcome_createdAt_idx" ON "SocialPublishLog"("platform", "outcome", "createdAt");
