/*
  Warnings:

  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DemoSite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Outreach` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Proposal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prospect` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Company";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DemoSite";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Outreach";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Proposal";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Prospect";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "WebsiteProspect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "segment" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currentWebsite" TEXT,
    "websiteStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "websiteScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreGrade" TEXT,
    "linkedLeadId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebsiteDemo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceCode" TEXT,
    "previewData" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteDemo_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "WebsiteProspect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsiteProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "content" TEXT,
    "sentAt" DATETIME,
    "acceptedAt" DATETIME,
    CONSTRAINT "WebsiteProposal_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "WebsiteProspect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsiteProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "domainName" TEXT,
    "hostingProvider" TEXT,
    "sourceCodeRepo" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" DATETIME,
    CONSTRAINT "WebsiteProject_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "WebsiteProspect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WebsiteProspect_status_idx" ON "WebsiteProspect"("status");

-- CreateIndex
CREATE INDEX "WebsiteProspect_score_idx" ON "WebsiteProspect"("score");

-- CreateIndex
CREATE INDEX "WebsiteDemo_status_idx" ON "WebsiteDemo"("status");

-- CreateIndex
CREATE INDEX "WebsiteProposal_status_idx" ON "WebsiteProposal"("status");

-- CreateIndex
CREATE INDEX "WebsiteProject_status_idx" ON "WebsiteProject"("status");
