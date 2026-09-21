-- RB Factory Sites: database-level idempotency for pending seller work.
-- These tables are initialized by the seller service at runtime, but fresh
-- databases must contain them before this migration creates the guards.

CREATE TABLE IF NOT EXISTS "SalesFollowUp" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conversationId" TEXT NOT NULL,
  "scheduledAt" DATETIME NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "draft" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SalesAction" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "conversationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "payload" TEXT,
  "requiresApproval" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "approvedAt" DATETIME,
  "sentAt" DATETIME,
  "decisionNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM "SalesFollowUp"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "conversationId", "reason"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS rn
    FROM "SalesFollowUp"
    WHERE "status" = 'PENDING'
  )
  WHERE rn > 1
);

CREATE UNIQUE INDEX "SalesFollowUp_pending_conversation_reason_unique"
ON "SalesFollowUp"("conversationId", "reason")
WHERE "status" = 'PENDING';

DELETE FROM "SalesAction"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "conversationId", "type", "title"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS rn
    FROM "SalesAction"
    WHERE "status" IN ('PENDING_APPROVAL', 'APPROVED', 'SENDING', 'SEND_REVIEW')
  )
  WHERE rn > 1
);

CREATE UNIQUE INDEX "SalesAction_open_conversation_type_title_unique"
ON "SalesAction"("conversationId", "type", "title")
WHERE "status" IN ('PENDING_APPROVAL', 'APPROVED', 'SENDING', 'SEND_REVIEW');
