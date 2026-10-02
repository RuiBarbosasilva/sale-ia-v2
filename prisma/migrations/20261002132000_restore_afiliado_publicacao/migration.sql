CREATE TABLE IF NOT EXISTS "AfiliadoPublicacao" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "produtoId" TEXT NOT NULL,
  "canal" TEXT NOT NULL,
  "postIdExterno" TEXT,
  "dataPublicacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "cliques" INTEGER NOT NULL DEFAULT 0,
  "vendasConfirmadas" INTEGER NOT NULL DEFAULT 0,
  "comissaoGerada" REAL NOT NULL DEFAULT 0,
  "variacao" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AfiliadoPublicacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "AfiliadoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AfiliadoPublicacao_produtoId_idx" ON "AfiliadoPublicacao"("produtoId");
CREATE INDEX IF NOT EXISTS "AfiliadoPublicacao_canal_status_idx" ON "AfiliadoPublicacao"("canal","status");
CREATE INDEX IF NOT EXISTS "AfiliadoPublicacao_postIdExterno_idx" ON "AfiliadoPublicacao"("postIdExterno");
