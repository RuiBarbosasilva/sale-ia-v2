-- RB Factory Sites: prevent stale recovery from stealing long-running demo jobs
ALTER TABLE "WebsiteDemoJob" ADD COLUMN "leaseUntil" DATETIME;
CREATE INDEX "WebsiteDemoJob_leaseUntil_idx" ON "WebsiteDemoJob"("leaseUntil");
