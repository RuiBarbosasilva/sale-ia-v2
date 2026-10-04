-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN "referer" TEXT;

-- CreateTable
CREATE TABLE "AffiliateOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "network" TEXT,
    "externalId" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "category" TEXT,
    "commissionRate" REAL NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AffiliateNetwork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'AFFILIATE_NETWORK',
    "baseUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
    "apiBaseUrl" TEXT,
    "credentialStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "credentialsEncrypted" TEXT,
    "metadata" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastScanAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AffiliateProductScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "demand" REAL,
    "competition" REAL,
    "commission" REAL,
    "contentFit" REAL,
    "trend" REAL,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateProductScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AffiliateProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "recommendation" TEXT,
    "strategy" TEXT,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "actionType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateOpportunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AffiliateProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT 'SALES',
    "strategy" TEXT,
    "targetAudience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "budget" REAL,
    "landingPageUrl" TEXT,
    "trackingCode" TEXT,
    "metrics" TEXT,
    "startedAt" DATETIME,
    "pausedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AffiliateProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "angle" TEXT,
    "hook" TEXT,
    "title" TEXT,
    "body" TEXT,
    "cta" TEXT,
    "hashtags" TEXT,
    "mediaPrompt" TEXT,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" DATETIME,
    "publishedAt" DATETIME,
    "metrics" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateContent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AffiliateCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "networkId" TEXT,
    "campaignId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "payload" TEXT,
    "result" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateAction_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AffiliateAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AffiliateCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AffiliateLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "affiliateId" TEXT NOT NULL,
    "offerId" TEXT,
    "code" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "campaign" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateLink_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AffiliateLink_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "AffiliateOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AffiliateLink" ("active", "affiliateId", "campaign", "clickCount", "code", "createdAt", "destinationUrl", "id", "offerId", "updatedAt") SELECT "active", "affiliateId", "campaign", "clickCount", "code", "createdAt", "destinationUrl", "id", "offerId", "updatedAt" FROM "AffiliateLink";
DROP TABLE "AffiliateLink";
ALTER TABLE "new_AffiliateLink" RENAME TO "AffiliateLink";
CREATE UNIQUE INDEX "AffiliateLink_code_key" ON "AffiliateLink"("code");
CREATE INDEX "AffiliateLink_affiliateId_idx" ON "AffiliateLink"("affiliateId");
CREATE INDEX "AffiliateLink_active_idx" ON "AffiliateLink"("active");
CREATE TABLE "new_AffiliateProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "networkId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "affiliateUrl" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "price" REAL,
    "commissionRate" REAL,
    "commissionAmount" REAL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "gravity" REAL,
    "popularityScore" REAL,
    "demandScore" REAL,
    "competitionScore" REAL,
    "contentScore" REAL,
    "conversionScore" REAL,
    "saturationScore" REAL,
    "opportunityScore" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "affiliationStatus" TEXT NOT NULL DEFAULT 'NOT_AFFILIATED',
    "affiliationMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "description" TEXT,
    "salesPageUrl" TEXT,
    "metadata" TEXT,
    "lastScannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateProduct_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AffiliateProduct" ("createdAt", "id", "status", "updatedAt") SELECT "createdAt", "id", "status", "updatedAt" FROM "AffiliateProduct";
DROP TABLE "AffiliateProduct";
ALTER TABLE "new_AffiliateProduct" RENAME TO "AffiliateProduct";
CREATE INDEX "AffiliateProduct_networkId_idx" ON "AffiliateProduct"("networkId");
CREATE INDEX "AffiliateProduct_status_idx" ON "AffiliateProduct"("status");
CREATE INDEX "AffiliateProduct_opportunityScore_idx" ON "AffiliateProduct"("opportunityScore");
CREATE INDEX "AffiliateProduct_category_idx" ON "AffiliateProduct"("category");
CREATE UNIQUE INDEX "AffiliateProduct_networkId_externalId_key" ON "AffiliateProduct"("networkId", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AffiliateOffer_network_idx" ON "AffiliateOffer"("network");

-- CreateIndex
CREATE INDEX "AffiliateOffer_active_idx" ON "AffiliateOffer"("active");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateNetwork_name_key" ON "AffiliateNetwork"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateNetwork_slug_key" ON "AffiliateNetwork"("slug");

-- CreateIndex
CREATE INDEX "AffiliateNetwork_active_idx" ON "AffiliateNetwork"("active");

-- CreateIndex
CREATE INDEX "AffiliateNetwork_status_idx" ON "AffiliateNetwork"("status");

-- CreateIndex
CREATE INDEX "AffiliateProductScore_productId_createdAt_idx" ON "AffiliateProductScore"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateOpportunity_status_idx" ON "AffiliateOpportunity"("status");

-- CreateIndex
CREATE INDEX "AffiliateOpportunity_score_idx" ON "AffiliateOpportunity"("score");

-- CreateIndex
CREATE INDEX "AffiliateCampaign_productId_idx" ON "AffiliateCampaign"("productId");

-- CreateIndex
CREATE INDEX "AffiliateCampaign_status_idx" ON "AffiliateCampaign"("status");

-- CreateIndex
CREATE INDEX "AffiliateContent_campaignId_idx" ON "AffiliateContent"("campaignId");

-- CreateIndex
CREATE INDEX "AffiliateContent_platform_status_idx" ON "AffiliateContent"("platform", "status");

-- CreateIndex
CREATE INDEX "AffiliateAction_status_idx" ON "AffiliateAction"("status");

-- CreateIndex
CREATE INDEX "AffiliateAction_type_idx" ON "AffiliateAction"("type");

-- CreateIndex
CREATE INDEX "EditorialResearch_topic_idx" ON "EditorialResearch"("topic");

-- CreateIndex
CREATE INDEX "EditorialResearch_market_capturedAt_idx" ON "EditorialResearch"("market", "capturedAt");

-- CreateIndex
CREATE INDEX "EditorialOpportunity_opportunityScore_idx" ON "EditorialOpportunity"("opportunityScore");

-- CreateIndex
CREATE INDEX "EditorialOpportunity_status_idx" ON "EditorialOpportunity"("status");

-- CreateIndex
CREATE INDEX "EditorialOpportunity_topic_idx" ON "EditorialOpportunity"("topic");

-- CreateIndex
CREATE INDEX "EditorialProject_status_idx" ON "EditorialProject"("status");

-- CreateIndex
CREATE INDEX "EditorialProject_productType_idx" ON "EditorialProject"("productType");

-- CreateIndex
CREATE INDEX "EditorialProject_qualityScore_idx" ON "EditorialProject"("qualityScore");

-- CreateIndex
CREATE INDEX "EditorialChapter_projectId_idx" ON "EditorialChapter"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialChapter_projectId_position_key" ON "EditorialChapter"("projectId", "position");

-- CreateIndex
CREATE INDEX "EditorialAsset_projectId_type_idx" ON "EditorialAsset"("projectId", "type");

-- CreateIndex
CREATE INDEX "EditorialQualityCheck_projectId_status_idx" ON "EditorialQualityCheck"("projectId", "status");

-- CreateIndex
CREATE INDEX "EditorialPublication_platform_status_idx" ON "EditorialPublication"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialPublication_projectId_platform_key" ON "EditorialPublication"("projectId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialLandingPage_slug_key" ON "EditorialLandingPage"("slug");

-- CreateIndex
CREATE INDEX "EditorialMetric_projectId_event_idx" ON "EditorialMetric"("projectId", "event");

-- CreateIndex
CREATE INDEX "EditorialMetric_occurredAt_idx" ON "EditorialMetric"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteImportedTemplate_slug_key" ON "WebsiteImportedTemplate"("slug");

-- CreateIndex
CREATE INDEX "WebsiteImportedTemplate_active_idx" ON "WebsiteImportedTemplate"("active");

-- CreateIndex
CREATE INDEX "WebsiteImportedTemplate_segment_idx" ON "WebsiteImportedTemplate"("segment");

-- CreateIndex
CREATE INDEX "WebsiteImportedTemplate_favorite_idx" ON "WebsiteImportedTemplate"("favorite");

-- CreateIndex
CREATE INDEX "WebsiteImportedTemplate_usageCount_idx" ON "WebsiteImportedTemplate"("usageCount");
