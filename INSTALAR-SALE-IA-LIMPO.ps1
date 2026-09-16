$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = "C:\sale-ia\backend"

Write-Host "SALE-IA - INSTALACAO DO NUCLEO LIMPO" -ForegroundColor Cyan

if (!(Test-Path $target)) {
  throw "Pasta alvo nao encontrada: $target"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "C:\sale-ia\backend-before-clean-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null

Write-Host "[1/5] Backup do codigo atual..." -ForegroundColor Yellow
Copy-Item "$target\src" "$backup\src" -Recurse -Force
if (Test-Path "$target\prisma") { Copy-Item "$target\prisma" "$backup\prisma" -Recurse -Force }
Copy-Item "$target\package.json" "$backup\package.json" -Force -ErrorAction SilentlyContinue
Copy-Item "$target\tsconfig.json" "$backup\tsconfig.json" -Force -ErrorAction SilentlyContinue

Write-Host "[2/5] Instalando codigo limpo..." -ForegroundColor Yellow
Copy-Item "$source\src" "$target\src" -Recurse -Force
Copy-Item "$source\prisma" "$target\prisma" -Recurse -Force
Copy-Item "$source\package.json" "$target\package.json" -Force
Copy-Item "$source\tsconfig.json" "$target\tsconfig.json" -Force
Copy-Item "$source\tests" "$target\tests" -Recurse -Force
Copy-Item "$source\.env.example" "$target\.env.example" -Force

Set-Location $target

Write-Host "[3/5] Dependencias..." -ForegroundColor Yellow
npm install

Write-Host "[4/5] Prisma..." -ForegroundColor Yellow
npx prisma generate
npx prisma db push

Write-Host "[5/5] TypeScript..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
  throw "TypeScript ainda possui erros."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " SALE-IA LIMPO E COMPILANDO SEM ERROS" -ForegroundColor Green
Write-Host " BACKUP: $backup" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Agora execute: npm run test:automation" -ForegroundColor Cyan
Write-Host "Depois: npm run dev" -ForegroundColor Cyan
