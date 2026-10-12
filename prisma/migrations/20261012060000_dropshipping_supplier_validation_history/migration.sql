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
  CONSTRAINT "DropshippingSupplierValidation_supplierCandidateId_fkey"
    FOREIGN KEY ("supplierCandidateId") REFERENCES "DropshippingSupplierCandidate" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DropshippingSupplierValidation_supplierCandidateId_createdAt_idx"
  ON "DropshippingSupplierValidation"("supplierCandidateId", "createdAt");
CREATE INDEX "DropshippingSupplierValidation_validationStatus_createdAt_idx"
  ON "DropshippingSupplierValidation"("validationStatus", "createdAt");
