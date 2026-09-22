-- RB Factory: real hosting metadata for published sites
ALTER TABLE "WebsiteProject" ADD COLUMN "publicUrl" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "hostingSiteId" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "hostingDeployId" TEXT;

CREATE INDEX "WebsiteProject_publicUrl_idx" ON "WebsiteProject"("publicUrl");
CREATE INDEX "WebsiteProject_hostingSiteId_idx" ON "WebsiteProject"("hostingSiteId");
