-- SALE-IA-V2 affiliate module
CREATE TABLE "Affiliate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "slug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "commissionRate" REAL NOT NULL DEFAULT 10,
  "accessTokenHash" TEXT,
  "lastLoginAt" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Affiliate_email_key" ON "Affiliate"("email");
CREATE UNIQUE INDEX "Affiliate_slug_key" ON "Affiliate"("slug");
CREATE UNIQUE INDEX "Affiliate_accessTokenHash_key" ON "Affiliate"("accessTokenHash");

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
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AffiliateOffer_network_idx" ON "AffiliateOffer"("network");
CREATE INDEX "AffiliateOffer_active_idx" ON "AffiliateOffer"("active");

CREATE TABLE "AffiliateLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "affiliateId" TEXT NOT NULL,
  "offerId" TEXT,
  "code" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "campaign" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateLink_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AffiliateLink_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "AffiliateOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AffiliateLink_code_key" ON "AffiliateLink"("code");
CREATE INDEX "AffiliateLink_affiliateId_idx" ON "AffiliateLink"("affiliateId");
CREATE INDEX "AffiliateLink_offerId_idx" ON "AffiliateLink"("offerId");
CREATE INDEX "AffiliateLink_active_idx" ON "AffiliateLink"("active");

CREATE TABLE "AffiliateClick" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "affiliateId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateClick_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AffiliateClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "AffiliateLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliateClick_affiliateId_createdAt_idx" ON "AffiliateClick"("affiliateId","createdAt");
CREATE INDEX "AffiliateClick_linkId_createdAt_idx" ON "AffiliateClick"("linkId","createdAt");

CREATE TABLE "AffiliateSale" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "affiliateId" TEXT NOT NULL,
  "linkId" TEXT,
  "externalOrderId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "customerRef" TEXT,
  "amount" REAL NOT NULL,
  "commissionRate" REAL NOT NULL,
  "commissionAmount" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" DATETIME,
  "paidAt" DATETIME,
  CONSTRAINT "AffiliateSale_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AffiliateSale_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "AffiliateLink" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AffiliateSale_externalOrderId_key" ON "AffiliateSale"("externalOrderId");
CREATE INDEX "AffiliateSale_affiliateId_status_idx" ON "AffiliateSale"("affiliateId","status");
CREATE INDEX "AffiliateSale_createdAt_idx" ON "AffiliateSale"("createdAt");

CREATE TABLE "AffiliatePayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "affiliateId" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "method" TEXT,
  "reference" TEXT,
  "notes" TEXT,
  "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" DATETIME,
  CONSTRAINT "AffiliatePayout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AffiliatePayout_affiliateId_status_idx" ON "AffiliatePayout"("affiliateId","status");
CREATE INDEX "AffiliatePayout_requestedAt_idx" ON "AffiliatePayout"("requestedAt");

PRAGMA foreign_key_check;
