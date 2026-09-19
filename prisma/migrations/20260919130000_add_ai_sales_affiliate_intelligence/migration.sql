-- AI Sales / Affiliate Intelligence
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
CREATE UNIQUE INDEX "AffiliateNetwork_name_key" ON "AffiliateNetwork"("name");
CREATE UNIQUE INDEX "AffiliateNetwork_slug_key" ON "AffiliateNetwork"("slug");
CREATE INDEX "AffiliateNetwork_active_idx" ON "AffiliateNetwork"("active");
CREATE INDEX "AffiliateNetwork_status_idx" ON "AffiliateNetwork"("status");

CREATE TABLE "AffiliateProduct" (
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
 CONSTRAINT "AffiliateProduct_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AffiliateProduct_networkId_externalId_key" ON "AffiliateProduct"("networkId","externalId");
CREATE INDEX "AffiliateProduct_networkId_idx" ON "AffiliateProduct"("networkId");
CREATE INDEX "AffiliateProduct_status_idx" ON "AffiliateProduct"("status");
CREATE INDEX "AffiliateProduct_opportunityScore_idx" ON "AffiliateProduct"("opportunityScore");
CREATE INDEX "AffiliateProduct_category_idx" ON "AffiliateProduct"("category");

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
 CONSTRAINT "AffiliateProductScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AffiliateProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliateProductScore_productId_createdAt_idx" ON "AffiliateProductScore"("productId","createdAt");

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
 CONSTRAINT "AffiliateOpportunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AffiliateProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliateOpportunity_status_idx" ON "AffiliateOpportunity"("status");
CREATE INDEX "AffiliateOpportunity_score_idx" ON "AffiliateOpportunity"("score");

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
 CONSTRAINT "AffiliateCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AffiliateProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliateCampaign_productId_idx" ON "AffiliateCampaign"("productId");
CREATE INDEX "AffiliateCampaign_status_idx" ON "AffiliateCampaign"("status");

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
 CONSTRAINT "AffiliateContent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AffiliateCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliateContent_campaignId_idx" ON "AffiliateContent"("campaignId");
CREATE INDEX "AffiliateContent_platform_status_idx" ON "AffiliateContent"("platform","status");

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
 CONSTRAINT "AffiliateAction_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "AffiliateAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AffiliateCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliateAction_status_idx" ON "AffiliateAction"("status");
CREATE INDEX "AffiliateAction_type_idx" ON "AffiliateAction"("type");
