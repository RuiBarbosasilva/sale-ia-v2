-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SupplierProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "costPrice" REAL NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SupplierProduct" ("costPrice", "createdAt", "id", "isPreferred", "leadTimeDays", "minQuantity", "productId", "supplierId", "updatedAt") SELECT "costPrice", "createdAt", "id", "isPreferred", "leadTimeDays", "minQuantity", "productId", "supplierId", "updatedAt" FROM "SupplierProduct";
DROP TABLE "SupplierProduct";
ALTER TABLE "new_SupplierProduct" RENAME TO "SupplierProduct";
CREATE INDEX "SupplierProduct_productId_idx" ON "SupplierProduct"("productId");
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productId_key" ON "SupplierProduct"("supplierId", "productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
