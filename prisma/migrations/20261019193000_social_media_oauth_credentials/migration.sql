-- Secure per-account OAuth credentials and one-time OAuth state records.
ALTER TABLE "SocialAccount" ADD COLUMN "accessTokenEncrypted" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "refreshTokenEncrypted" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "tokenExpiresAt" DATETIME;

CREATE TABLE "SocialOAuthState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "state" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialOAuthState_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SocialOAuthState_state_key" ON "SocialOAuthState"("state");
CREATE INDEX "SocialOAuthState_expiresAt_idx" ON "SocialOAuthState"("expiresAt");
CREATE INDEX "SocialOAuthState_accountId_createdAt_idx" ON "SocialOAuthState"("accountId", "createdAt");
