-- Restore legacy Afiliados IA compatibility tables used by the /api/afiliados module.
CREATE TABLE IF NOT EXISTS "AfiliadoProduto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "plataforma" TEXT NOT NULL,
  "produtoIdExterno" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "categoria" TEXT,
  "tipo" TEXT NOT NULL,
  "preco" REAL NOT NULL,
  "comissaoPercentual" REAL NOT NULL,
  "linkAfiliado" TEXT NOT NULL,
  "thumbnail" TEXT,
  "temperatura" REAL,
  "score" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "vendasConfirmadas" INTEGER NOT NULL DEFAULT 0,
  "comissaoTotal" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "AfiliadoProduto_plataforma_idx" ON "AfiliadoProduto"("plataforma");
CREATE INDEX IF NOT EXISTS "AfiliadoProduto_produtoIdExterno_idx" ON "AfiliadoProduto"("produtoIdExterno");
CREATE INDEX IF NOT EXISTS "AfiliadoProduto_status_idx" ON "AfiliadoProduto"("status");
CREATE INDEX IF NOT EXISTS "AfiliadoProduto_score_idx" ON "AfiliadoProduto"("score");

CREATE TABLE IF NOT EXISTS "AfiliadoCopy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "produtoId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "canal" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AfiliadoCopy_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "AfiliadoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AfiliadoCopy_produtoId_idx" ON "AfiliadoCopy"("produtoId");

CREATE TABLE IF NOT EXISTS "AfiliadoCriativo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "produtoId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "url" TEXT,
  "descricao" TEXT,
  "promptUsado" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ATIVO',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AfiliadoCriativo_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "AfiliadoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AfiliadoCriativo_produtoId_idx" ON "AfiliadoCriativo"("produtoId");
