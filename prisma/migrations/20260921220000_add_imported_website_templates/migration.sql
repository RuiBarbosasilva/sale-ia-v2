CREATE TABLE "WebsiteImportedTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "segment" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'HTML',
  "html" TEXT NOT NULL,
  "archiveData" BLOB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "WebsiteImportedTemplate_slug_key" ON "WebsiteImportedTemplate"("slug");
CREATE INDEX "WebsiteImportedTemplate_active_idx" ON "WebsiteImportedTemplate"("active");
CREATE INDEX "WebsiteImportedTemplate_segment_idx" ON "WebsiteImportedTemplate"("segment");
