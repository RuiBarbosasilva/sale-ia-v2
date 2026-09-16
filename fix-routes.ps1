# SALE-IA-V2 - DIAGNÓSTICO E CORREÇÃO DE ROTAS 404

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SALE-IA-V2 - DIAGNOSTICO DE ROTAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar estado atual do apiRoutes.ts
Write-Host "1. Verificando src/routes/apiRoutes.ts..." -ForegroundColor Yellow
$apiRoutesContent = Get-Content "src/routes/apiRoutes.ts" -Raw
Write-Host $apiRoutesContent
Write-Host ""

# 2. Verificar se os arquivos de rota existem
Write-Host "2. Verificando arquivos de rota..." -ForegroundColor Yellow
$routeFiles = @(
    "src/routes/dashboardRoutes.ts",
    "src/routes/leadRoutes.ts",
    "src/routes/paymentRoutes.ts",
    "src/routes/pixRoutes.ts",
    "src/routes/pricing.ts",
    "src/routes/webhook.ts"
)

foreach ($file in $routeFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [ERRO] $file NAO ENCONTRADO" -ForegroundColor Red
    }
}
Write-Host ""

# 3. Verificar exports dos arquivos de rota
Write-Host "3. Verificando exports dos routers..." -ForegroundColor Yellow
foreach ($file in $routeFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "export default") {
            Write-Host "  $file -> export default" -ForegroundColor Cyan
        } elseif ($content -match "export const") {
            Write-Host "  $file -> export const (named)" -ForegroundColor Cyan
        } else {
            Write-Host "  $file -> SEM EXPORT CLARO" -ForegroundColor Red
        }
    }
}
Write-Host ""

# 4. Corrigir apiRoutes.ts se necessário
Write-Host "4. Corrigindo apiRoutes.ts..." -ForegroundColor Yellow

# Backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "src/routes/apiRoutes.ts" "src/routes/apiRoutes.ts.backup_$timestamp" -Force
Write-Host "  Backup criado: apiRoutes.ts.backup_$timestamp" -ForegroundColor Green

# Verificar se precisa corrigir
$needsFix = $false

# Verificar se dashboardRoutes está importado
if ($apiRoutesContent -notmatch "dashboardRoutes") {
    $needsFix = $true
    Write-Host "  [ALERTA] dashboardRoutes nao esta importado" -ForegroundColor Red
}

# Verificar se leadRoutes está importado
if ($apiRoutesContent -notmatch "leadRoutes") {
    $needsFix = $true
    Write-Host "  [ALERTA] leadRoutes nao esta importado" -ForegroundColor Red
}

# Verificar se paymentRoutes está montado
if ($apiRoutesContent -notmatch 'apiRoutes\.use\("/payments"') {
    $needsFix = $true
    Write-Host "  [ALERTA] paymentRoutes nao esta montado" -ForegroundColor Red
}

if ($needsFix) {
    Write-Host ""
    Write-Host "  Aplicando correcao completa..." -ForegroundColor Yellow
    
    $correctedContent = @"
import { Router } from "express";
import { chat } from "../controllers/chatController";
import dashboardRoutes from "./dashboardRoutes";
import leadRoutes from "./leadRoutes";
import paymentRoutes from "./paymentRoutes";
import pixRoutes from "./pixRoutes";
import pricingRoutes from "./pricing";
import webhookRoutes from "./webhook";

export const apiRoutes = Router();

// Rotas basicas
apiRoutes.post("/chat", chat);
apiRoutes.get("/health", (_req, res) => res.json({ status: "OK", service: "SALE-IA" }));

// Montagem dos modulos de rota
apiRoutes.use("/dashboard", dashboardRoutes);
apiRoutes.use("/leads", leadRoutes);
apiRoutes.use("/payments", paymentRoutes);
apiRoutes.use("/pix", pixRoutes);
apiRoutes.use("/pricing", pricingRoutes);
apiRoutes.use("/webhook", webhookRoutes);
"@
    
    $correctedContent | Set-Content "src/routes/apiRoutes.ts" -NoNewline
    Write-Host "  [OK] apiRoutes.ts corrigido" -ForegroundColor Green
} else {
    Write-Host "  [OK] apiRoutes.ts ja esta correto" -ForegroundColor Green
}
Write-Host ""

# 5. Verificar dist
Write-Host "5. Verificando dist/src/routes/apiRoutes.js..." -ForegroundColor Yellow
if (Test-Path "dist/src/routes/apiRoutes.js") {
    $distContent = Get-Content "dist/src/routes/apiRoutes.js" -Raw
    if ($distContent -match "dashboardRoutes") {
        Write-Host "  [OK] dist esta atualizado" -ForegroundColor Green
    } else {
        Write-Host "  [ALERTA] dist esta desatualizado" -ForegroundColor Red
    }
} else {
    Write-Host "  [ALERTA] dist nao existe" -ForegroundColor Red
}
Write-Host ""

# 6. Build
Write-Host "6. Executando BUILD..." -ForegroundColor Yellow
npm run build
Write-Host ""

# 7. Instruções para reiniciar o servidor
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. PARE o servidor atual (Ctrl+C)" -ForegroundColor Yellow
Write-Host "2. Inicie o servidor novamente:" -ForegroundColor Yellow
Write-Host "   npm start" -ForegroundColor White
Write-Host ""
Write-Host "3. Aguarde a mensagem:" -ForegroundColor Yellow
Write-Host "   [SERVER] Rodando na porta 3000" -ForegroundColor White
Write-Host ""
Write-Host "4. Execute o smoke test:" -ForegroundColor Yellow
Write-Host "   .\smoke-test.ps1" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan