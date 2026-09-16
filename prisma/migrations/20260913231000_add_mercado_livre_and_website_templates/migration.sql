-- CreateTable
CREATE TABLE "WebsiteCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebsiteTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "demoUrl" TEXT,
    "repositoryUrl" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'LOCAL',
    "price" REAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebsiteTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WebsiteCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mercado_livre_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mlUserId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "siteId" TEXT NOT NULL DEFAULT 'MLB',
    "permalink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mercado_livre_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mercado_livre_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "mercado_livre_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mercado_livre_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "mlItemId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "stock" INTEGER NOT NULL,
    "permalink" TEXT NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mercado_livre_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "mercado_livre_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mercado_livre_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "mlOrderId" TEXT NOT NULL,
    "coreOrderId" TEXT,
    "status" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "dateCreated" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mercado_livre_orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "mercado_livre_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mercado_livre_shipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "mlShipmentId" TEXT NOT NULL,
    "mlOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "labelUrl" TEXT,
    "dateFirstPrinted" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mercado_livre_shipments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "mercado_livre_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mercado_livre_webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mercado_livre_audits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "result" TEXT NOT NULL,
    "errorMessage" TEXT,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mercado_livre_audits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "mercado_livre_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WebsiteDemo" (
    "templateId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceCode" TEXT,
    "previewData" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteDemo_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WebsiteTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WebsiteDemo_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "WebsiteProspect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WebsiteDemo" ("generatedAt", "id", "previewData", "prospectId", "sourceCode", "status", "version") SELECT "generatedAt", "id", "previewData", "prospectId", "sourceCode", "status", "version" FROM "WebsiteDemo";
DROP TABLE "WebsiteDemo";
ALTER TABLE "new_WebsiteDemo" RENAME TO "WebsiteDemo";
CREATE INDEX "WebsiteDemo_status_idx" ON "WebsiteDemo"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteCategory_name_key" ON "WebsiteCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteCategory_slug_key" ON "WebsiteCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteTemplate_slug_key" ON "WebsiteTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "mercado_livre_accounts_mlUserId_key" ON "mercado_livre_accounts"("mlUserId");

-- CreateIndex
CREATE INDEX "mercado_livre_tokens_accountId_idx" ON "mercado_livre_tokens"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "mercado_livre_items_mlItemId_key" ON "mercado_livre_items"("mlItemId");

-- CreateIndex
CREATE INDEX "mercado_livre_items_accountId_idx" ON "mercado_livre_items"("accountId");

-- CreateIndex
CREATE INDEX "mercado_livre_items_productId_idx" ON "mercado_livre_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "mercado_livre_orders_mlOrderId_key" ON "mercado_livre_orders"("mlOrderId");

-- CreateIndex
CREATE INDEX "mercado_livre_orders_accountId_idx" ON "mercado_livre_orders"("accountId");

-- CreateIndex
CREATE INDEX "mercado_livre_orders_coreOrderId_idx" ON "mercado_livre_orders"("coreOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "mercado_livre_shipments_mlShipmentId_key" ON "mercado_livre_shipments"("mlShipmentId");

-- CreateIndex
CREATE INDEX "mercado_livre_shipments_accountId_idx" ON "mercado_livre_shipments"("accountId");

-- CreateIndex
CREATE INDEX "mercado_livre_shipments_mlOrderId_idx" ON "mercado_livre_shipments"("mlOrderId");

-- CreateIndex
CREATE INDEX "mercado_livre_webhook_events_topic_resourceId_idx" ON "mercado_livre_webhook_events"("topic", "resourceId");

-- CreateIndex
CREATE INDEX "mercado_livre_audits_accountId_createdAt_idx" ON "mercado_livre_audits"("accountId", "createdAt");
