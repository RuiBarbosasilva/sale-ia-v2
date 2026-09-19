CREATE TABLE "EditorialResearch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "topic" TEXT NOT NULL,
  "market" TEXT NOT NULL DEFAULT 'BR',
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceTitle" TEXT,
  "snippet" TEXT,
  "data" TEXT,
  "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EditorialResearch_topic_idx" ON "EditorialResearch"("topic");
CREATE INDEX "EditorialResearch_market_capturedAt_idx" ON "EditorialResearch"("market","capturedAt");

CREATE TABLE "EditorialOpportunity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "topic" TEXT NOT NULL,
  "productType" TEXT NOT NULL DEFAULT 'EBOOK',
  "market" TEXT NOT NULL DEFAULT 'BR',
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "audience" TEXT,
  "demandScore" REAL NOT NULL DEFAULT 0,
  "trendScore" REAL NOT NULL DEFAULT 0,
  "competitionScore" REAL NOT NULL DEFAULT 0,
  "saturationScore" REAL NOT NULL DEFAULT 0,
  "commercialScore" REAL NOT NULL DEFAULT 0,
  "opportunityScore" REAL NOT NULL DEFAULT 0,
  "reasoning" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "researchIds" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "EditorialOpportunity_opportunityScore_idx" ON "EditorialOpportunity"("opportunityScore");
CREATE INDEX "EditorialOpportunity_status_idx" ON "EditorialOpportunity"("status");
CREATE INDEX "EditorialOpportunity_topic_idx" ON "EditorialOpportunity"("topic");

CREATE TABLE "EditorialProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "opportunityId" TEXT,
  "productType" TEXT NOT NULL DEFAULT 'EBOOK',
  "status" TEXT NOT NULL DEFAULT 'RESEARCHED',
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "market" TEXT NOT NULL DEFAULT 'BR',
  "title" TEXT,
  "subtitle" TEXT,
  "author" TEXT,
  "series" TEXT,
  "volume" INTEGER,
  "audience" TEXT,
  "description" TEXT,
  "manuscript" TEXT,
  "metadata" TEXT,
  "manuscriptPath" TEXT,
  "coverPath" TEXT,
  "interiorPath" TEXT,
  "epubPath" TEXT,
  "pdfPath" TEXT,
  "printPdfPath" TEXT,
  "qualityScore" REAL NOT NULL DEFAULT 0,
  "aiDisclosure" TEXT NOT NULL DEFAULT 'AI_ASSISTED',
  "rightsNotes" TEXT,
  "generationProvider" TEXT,
  "generationModel" TEXT,
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EditorialProject_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "EditorialOpportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EditorialProject_status_idx" ON "EditorialProject"("status");
CREATE INDEX "EditorialProject_productType_idx" ON "EditorialProject"("productType");
CREATE INDEX "EditorialProject_qualityScore_idx" ON "EditorialProject"("qualityScore");

CREATE TABLE "EditorialChapter" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EditorialChapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EditorialChapter_projectId_position_key" ON "EditorialChapter"("projectId","position");
CREATE INDEX "EditorialChapter_projectId_idx" ON "EditorialChapter"("projectId");

CREATE TABLE "EditorialAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "path" TEXT,
  "url" TEXT,
  "prompt" TEXT,
  "altText" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "checksum" TEXT,
  "status" TEXT NOT NULL DEFAULT 'GENERATED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EditorialAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EditorialAsset_projectId_type_idx" ON "EditorialAsset"("projectId","type");

CREATE TABLE "EditorialQualityCheck" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "checkType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "score" REAL NOT NULL DEFAULT 0,
  "details" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EditorialQualityCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EditorialQualityCheck_projectId_status_idx" ON "EditorialQualityCheck"("projectId","status");

CREATE TABLE "EditorialPublication" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'MANUAL_REQUIRED',
  "externalId" TEXT,
  "url" TEXT,
  "payload" TEXT,
  "error" TEXT,
  "publishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EditorialPublication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EditorialPublication_projectId_platform_key" ON "EditorialPublication"("projectId","platform");
CREATE INDEX "EditorialPublication_platform_status_idx" ON "EditorialPublication"("platform","status");

CREATE TABLE "EditorialLandingPage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "ctaText" TEXT NOT NULL,
  "checkoutUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "htmlPath" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EditorialLandingPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EditorialLandingPage_slug_key" ON "EditorialLandingPage"("slug");

CREATE TABLE "EditorialMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "platform" TEXT,
  "value" REAL NOT NULL DEFAULT 0,
  "metadata" TEXT,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EditorialMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "EditorialProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EditorialMetric_projectId_event_idx" ON "EditorialMetric"("projectId","event");
CREATE INDEX "EditorialMetric_occurredAt_idx" ON "EditorialMetric"("occurredAt");