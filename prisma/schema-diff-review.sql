-- CreateTable
CREATE TABLE "DropshippingResearchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DropshippingCatalogSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "availableQuantity" INTEGER,
    "soldQuantity" INTEGER,
    "condition" TEXT,
    "url" TEXT NOT NULL,
    "categoryId" TEXT,
    "freeShipping" BOOLEAN,
    "sellerId" INTEGER,
    "evidenceConfidencePct" INTEGER NOT NULL DEFAULT 0,
    "warnings" TEXT,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DropshippingCatalogSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DropshippingResearchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DropshippingSupplierCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "website" TEXT,
    "contactUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "shipsFromBrazil" BOOLEAN NOT NULL DEFAULT false,
    "offersDropshipping" BOOLEAN NOT NULL DEFAULT false,
    "issuesInvoice" BOOLEAN,
    "stockFeedAvailable" BOOLEAN,
    "trackingAvailable" BOOLEAN,
    "returnPolicyUrl" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING_VALIDATION',
    "reliabilityScore" REAL NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL,
    "blockers" TEXT,
    "lastVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DropshippingSupplierOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productCandidateId" TEXT NOT NULL,
    "supplierCandidateId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "supplierTitle" TEXT NOT NULL,
    "supplierUrl" TEXT NOT NULL,
    "unitCost" REAL NOT NULL,
    "supplierShippingCost" REAL NOT NULL DEFAULT 0,
    "landedCost" REAL NOT NULL,
    "availableQuantity" INTEGER,
    "stockObservedAt" DATETIME,
    "evidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DropshippingSupplierOffer_productCandidateId_fkey" FOREIGN KEY ("productCandidateId") REFERENCES "DropshippingProductCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DropshippingSupplierOffer_supplierCandidateId_fkey" FOREIGN KEY ("supplierCandidateId") REFERENCES "DropshippingSupplierCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DropshippingSupplierValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierCandidateId" TEXT NOT NULL,
    "validationStatus" TEXT NOT NULL,
    "reliabilityScore" REAL NOT NULL,
    "signals" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "blockers" TEXT NOT NULL,
    "passedChecks" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DropshippingSupplierValidation_supplierCandidateId_fkey" FOREIGN KEY ("supplierCandidateId") REFERENCES "DropshippingSupplierCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DropshippingAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "DropshippingProductCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "externalId" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "supplierCandidateId" TEXT,
    "observedPrice" REAL,
    "salePrice" REAL,
    "supplierCost" REAL,
    "marketplaceFeeRatePct" REAL,
    "fixedMarketplaceFee" REAL,
    "shippingCost" REAL,
    "taxRatePct" REAL,
    "packagingCost" REAL,
    "returnReserveRatePct" REAL,
    "otherVariableCosts" REAL,
    "estimatedProfit" REAL,
    "marginPct" REAL,
    "breakEvenPrice" REAL,
    "observedSales" INTEGER,
    "observedReviews" INTEGER,
    "observedStock" INTEGER,
    "shippingWeightGrams" INTEGER,
    "fragile" BOOLEAN,
    "hasSizeVariants" BOOLEAN,
    "evidence" TEXT NOT NULL,
    "suitabilityScore" REAL NOT NULL DEFAULT 0,
    "candidateForTesting" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'WATCH',
    "blockers" TEXT,
    "warnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DropshippingProductCandidate_supplierCandidateId_fkey" FOREIGN KEY ("supplierCandidateId") REFERENCES "DropshippingSupplierCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DropshippingResearchWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "lastStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SocialWorkspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "niche" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountName" TEXT,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "credentialsRef" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" DATETIME,
    "scopes" TEXT,
    "platformMetadata" TEXT,
    "lastCheckedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SocialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SocialWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'IMAGE',
    "title" TEXT,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT,
    "mediaUrls" TEXT,
    "linkUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" DATETIME,
    "publishedAt" DATETIME,
    "externalPostId" TEXT,
    "publishedUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SocialPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SocialWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialPublishLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "message" TEXT,
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialPublishLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialOAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialOAuthState_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialAutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "runDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialAutomationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "SocialWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DropshippingResearchRun_query_createdAt_idx" ON "DropshippingResearchRun"("query", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingResearchRun_source_createdAt_idx" ON "DropshippingResearchRun"("source", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingResearchRun_status_idx" ON "DropshippingResearchRun"("status");

-- CreateIndex
CREATE INDEX "DropshippingCatalogSnapshot_itemId_observedAt_idx" ON "DropshippingCatalogSnapshot"("itemId", "observedAt");

-- CreateIndex
CREATE INDEX "DropshippingCatalogSnapshot_title_idx" ON "DropshippingCatalogSnapshot"("title");

-- CreateIndex
CREATE INDEX "DropshippingCatalogSnapshot_price_idx" ON "DropshippingCatalogSnapshot"("price");

-- CreateIndex
CREATE UNIQUE INDEX "DropshippingCatalogSnapshot_runId_itemId_key" ON "DropshippingCatalogSnapshot"("runId", "itemId");

-- CreateIndex
CREATE INDEX "DropshippingSupplierCandidate_validationStatus_idx" ON "DropshippingSupplierCandidate"("validationStatus");

-- CreateIndex
CREATE INDEX "DropshippingSupplierCandidate_reliabilityScore_idx" ON "DropshippingSupplierCandidate"("reliabilityScore");

-- CreateIndex
CREATE INDEX "DropshippingSupplierCandidate_name_idx" ON "DropshippingSupplierCandidate"("name");

-- CreateIndex
CREATE INDEX "DropshippingSupplierOffer_productCandidateId_supplierCandidateId_createdAt_idx" ON "DropshippingSupplierOffer"("productCandidateId", "supplierCandidateId", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingSupplierOffer_supplierCandidateId_status_idx" ON "DropshippingSupplierOffer"("supplierCandidateId", "status");

-- CreateIndex
CREATE INDEX "DropshippingSupplierOffer_status_updatedAt_idx" ON "DropshippingSupplierOffer"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "DropshippingSupplierValidation_supplierCandidateId_createdAt_idx" ON "DropshippingSupplierValidation"("supplierCandidateId", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingSupplierValidation_validationStatus_createdAt_idx" ON "DropshippingSupplierValidation"("validationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingAlert_status_createdAt_idx" ON "DropshippingAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingAlert_type_severity_idx" ON "DropshippingAlert"("type", "severity");

-- CreateIndex
CREATE INDEX "DropshippingProductCandidate_marketplace_createdAt_idx" ON "DropshippingProductCandidate"("marketplace", "createdAt");

-- CreateIndex
CREATE INDEX "DropshippingProductCandidate_suitabilityScore_idx" ON "DropshippingProductCandidate"("suitabilityScore");

-- CreateIndex
CREATE INDEX "DropshippingProductCandidate_status_idx" ON "DropshippingProductCandidate"("status");

-- CreateIndex
CREATE INDEX "DropshippingProductCandidate_externalId_idx" ON "DropshippingProductCandidate"("externalId");

-- CreateIndex
CREATE INDEX "DropshippingProductCandidate_supplierCandidateId_idx" ON "DropshippingProductCandidate"("supplierCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "DropshippingResearchWatch_query_key" ON "DropshippingResearchWatch"("query");

-- CreateIndex
CREATE INDEX "DropshippingResearchWatch_enabled_nextRunAt_idx" ON "DropshippingResearchWatch"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "DropshippingResearchWatch_lastStatus_updatedAt_idx" ON "DropshippingResearchWatch"("lastStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialWorkspace_slug_key" ON "SocialWorkspace"("slug");

-- CreateIndex
CREATE INDEX "SocialWorkspace_active_updatedAt_idx" ON "SocialWorkspace"("active", "updatedAt");

-- CreateIndex
CREATE INDEX "SocialAccount_workspaceId_platform_status_idx" ON "SocialAccount"("workspaceId", "platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_workspaceId_platform_externalId_key" ON "SocialAccount"("workspaceId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "SocialPost_workspaceId_status_scheduledFor_idx" ON "SocialPost"("workspaceId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SocialPost_platform_status_scheduledFor_idx" ON "SocialPost"("platform", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SocialPost_createdAt_idx" ON "SocialPost"("createdAt");

-- CreateIndex
CREATE INDEX "SocialPublishLog_postId_createdAt_idx" ON "SocialPublishLog"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPublishLog_platform_outcome_createdAt_idx" ON "SocialPublishLog"("platform", "outcome", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialOAuthState_state_key" ON "SocialOAuthState"("state");

-- CreateIndex
CREATE INDEX "SocialOAuthState_expiresAt_idx" ON "SocialOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "SocialOAuthState_accountId_createdAt_idx" ON "SocialOAuthState"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialAutomationRun_status_startedAt_idx" ON "SocialAutomationRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAutomationRun_workspaceId_runDate_key" ON "SocialAutomationRun"("workspaceId", "runDate");
