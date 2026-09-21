-- RB Factory Sites: deployment state for real publication
ALTER TABLE "WebsiteProject" ADD COLUMN "publishedUrl" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "deploymentId" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "deploymentStatus" TEXT;
UPDATE "WebsiteProject" SET "deploymentStatus" = 'NOT_DEPLOYED' WHERE "deploymentStatus" IS NULL;
CREATE INDEX "WebsiteProject_deploymentStatus_idx" ON "WebsiteProject"("deploymentStatus");
