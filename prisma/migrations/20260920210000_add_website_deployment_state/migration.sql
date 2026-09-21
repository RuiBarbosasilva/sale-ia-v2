-- RB Factory Sites: deployment state for real publication
ALTER TABLE "WebsiteProject" ADD COLUMN "publishedUrl" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "deploymentId" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "deploymentStatus" TEXT;
UPDATE "WebsiteProject" SET "deploymentStatus" = 'NOT_DEPLOYED' WHERE "deploymentStatus" IS NULL;
CREATE INDEX "WebsiteProject_deploymentStatus_idx" ON "WebsiteProject"("deploymentStatus");


-- RB Factory Sites: database-level idempotency guards
-- Keep the most relevant project when legacy duplicate rows exist:
-- published projects first, then newest update.
DELETE FROM "WebsiteProject"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "prospectId"
        ORDER BY
          CASE WHEN "status" = 'PUBLISHED' THEN 0 ELSE 1 END,
          "updatedAt" DESC,
          "id" DESC
      ) AS rn
    FROM "WebsiteProject"
  )
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteProject_prospectId_unique"
ON "WebsiteProject"("prospectId");

-- Only one live subscription may exist for a prospect/plan.
-- Historical CANCELLED/PAUSED/OVERDUE rows remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteSubscription_live_prospect_plan_unique"
ON "WebsiteSubscription"("prospectId", "planId")
WHERE "status" IN ('PENDING', 'ACTIVE');
