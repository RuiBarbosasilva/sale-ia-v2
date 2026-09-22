ALTER TABLE "WebsiteImportedTemplate" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WebsiteImportedTemplate" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "WebsiteImportedTemplate_favorite_idx" ON "WebsiteImportedTemplate"("favorite");
CREATE INDEX "WebsiteImportedTemplate_usageCount_idx" ON "WebsiteImportedTemplate"("usageCount");
