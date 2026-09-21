-- RB Factory Sites: database-level idempotency guards

-- Keep one project per prospect. Published projects are preferred;
-- otherwise retain the most recently updated project.
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

CREATE UNIQUE INDEX "WebsiteProject_prospectId_unique"
ON "WebsiteProject"("prospectId");

-- Allow historical subscription rows, but never two live rows
-- for the same prospect and plan.
CREATE UNIQUE INDEX "WebsiteSubscription_live_prospect_plan_unique"
ON "WebsiteSubscription"("prospectId", "planId")
WHERE "status" IN ('PENDING', 'ACTIVE');
