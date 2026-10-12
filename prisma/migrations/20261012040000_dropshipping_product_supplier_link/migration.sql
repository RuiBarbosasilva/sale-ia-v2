ALTER TABLE "DropshippingProductCandidate" ADD COLUMN "supplierCandidateId" TEXT REFERENCES "DropshippingSupplierCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "DropshippingProductCandidate_supplierCandidateId_idx" ON "DropshippingProductCandidate"("supplierCandidateId");
