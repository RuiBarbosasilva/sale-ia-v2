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
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DropshippingSupplierOffer_productCandidateId_fkey"
    FOREIGN KEY ("productCandidateId") REFERENCES "DropshippingProductCandidate" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DropshippingSupplierOffer_supplierCandidateId_fkey"
    FOREIGN KEY ("supplierCandidateId") REFERENCES "DropshippingSupplierCandidate" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DropshippingSupplierOffer_productCandidateId_supplierCandidateId_createdAt_idx"
  ON "DropshippingSupplierOffer"("productCandidateId", "supplierCandidateId", "createdAt");
CREATE INDEX "DropshippingSupplierOffer_supplierCandidateId_status_idx"
  ON "DropshippingSupplierOffer"("supplierCandidateId", "status");
CREATE INDEX "DropshippingSupplierOffer_status_updatedAt_idx"
  ON "DropshippingSupplierOffer"("status", "updatedAt");
