-- RB Factory Sites: database-level idempotency for pending seller follow-ups/actions

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
