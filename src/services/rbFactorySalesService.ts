import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { websiteDemoFactoryService } from './prospecting/websiteDemoFactoryService';
import { websiteService } from './website/websiteService';
import { proposalGeneratorService } from './proposalGeneratorService';
import { selectBenchmarkModel } from './rbFactoryTemplateEngine';
import { RB_BENCHMARK_CATALOG } from './rbFactoryBenchmarkCatalog';
import { rbFactorySalesAgentService } from './rbFactorySalesAgentService';
import { websiteCommercialService } from './websiteCommercialService';

let initialized=false;
async function init(){
  if(initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RbFactorySalesPipeline" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "prospectId" TEXT NOT NULL,
      "stage" TEXT NOT NULL DEFAULT 'DISCOVERED',
      "auditScore" REAL NOT NULL DEFAULT 0,
      "priority" INTEGER NOT NULL DEFAULT 0,
      "demoId" TEXT,
      "proposalId" TEXT,
      "nextAction" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Repair legacy duplicates before enforcing the one-pipeline-per-prospect invariant.
  // Keep the most advanced pipeline state; use the newest row as the tiebreaker.
  await (prisma as any).$executeRawUnsafe(`
    DELETE FROM "RbFactorySalesPipeline"
    WHERE "id" IN (
      SELECT "id" FROM (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "prospectId"
            ORDER BY
              CASE "stage"
                WHEN 'WON' THEN 0
                WHEN 'NEGOTIATION' THEN 1
                WHEN 'PROPOSAL_READY' THEN 2
                WHEN 'CONTACTED' THEN 3
                WHEN 'DEMO_READY' THEN 4
                WHEN 'AUDITED' THEN 5
                WHEN 'DISCOVERED' THEN 6
                WHEN 'LOST' THEN 7
                ELSE 8
              END,
              "updatedAt" DESC,
              "createdAt" DESC,
              "id" DESC
          ) AS rn
        FROM "RbFactorySalesPipeline"
      )
      WHERE rn > 1
    )
  `);
  await (prisma as any).$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RbFactorySalesPipeline_prospectId_unique" ON "RbFactorySalesPipeline"("prospectId")`);
  initialized=true;
}