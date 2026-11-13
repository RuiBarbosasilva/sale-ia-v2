[CmdletBinding()]
param(
  [int]$Port = 3000,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$LogDir = Join-Path $Root "logs\rb-factory-tunnel"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$ServerOut = Join-Path $LogDir "server.out.log"
$ServerErr = Join-Path $LogDir "server.err.log"
$TunnelOut = Join-Path $LogDir "cloudflared.out.log"
$TunnelErr = Join-Path $LogDir "cloudflared.err.log"
$StateFile = Join-Path $LogDir "processes.json"

if (-not (Test-Path (Join-Path $Root ".env"))) {
  throw "Arquivo .env não encontrado. Crie-o na raiz e configure as chaves antes de iniciar."
}
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  throw "cloudflared não encontrado. Instale o Cloudflare Tunnel para Windows e abra um novo PowerShell."
}

$envFile = Get-Content (Join-Path $Root ".env") -Raw
if ($envFile -notmatch '(?m)^\s*SALE_IA_ADMIN_KEY\s*=\s*.+') {
  throw "SALE_IA_ADMIN_KEY ausente no .env. Configure uma chave forte antes de expor a API."
}
if ($envFile -notmatch '(?m)^\s*(GEMINI_API_KEY|OPENAI_API_KEY)\s*=\s*.+') {
  Write-Warning "Nenhuma GEMINI_API_KEY/OPENAI_API_KEY encontrada no .env; geração por IA pode não funcionar."
}

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "file:./prisma/dev.db"
  Write-Warning "DATABASE_URL não estava definida no processo. Usando file:./prisma/dev.db para esta execução."
}
$env:PORT = "$Port"
$env:NODE_ENV = "production"

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 3
  throw "Já existe um serviço respondendo na porta $Port. Encerre-o ou escolha outra porta."
} catch {
  if ($_.Exception.Message -like "Já existe um serviço*") { throw }
}

if (-not $SkipBuild) {
  Write-Host "Validando dependências e compilando..."
  if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci falhou." }
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build falhou. O servidor não será iniciado." }
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$server = Start-Process -FilePath $npm -ArgumentList @("start") -WorkingDirectory $Root -PassThru -WindowStyle Hidden -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 3
    $ready = $true
    break
  } catch {}
}
if (-not $ready) {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  throw "API não respondeu em /api/health. Consulte $ServerErr e $ServerOut."
}

$tunnel = Start-Process -FilePath (Get-Command cloudflared).Source -ArgumentList @("tunnel","--url","http://127.0.0.1:$Port","--no-autoupdate") -WorkingDirectory $Root -PassThru -WindowStyle Hidden -RedirectStandardOutput $TunnelOut -RedirectStandardError $TunnelErr

$url = $null
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 2
  $logs = ""
  if (Test-Path $TunnelOut) { $logs += Get-Content $TunnelOut -Raw }
  if (Test-Path $TunnelErr) { $logs += Get-Content $TunnelErr -Raw }
  $match = [regex]::Match($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($match.Success) { $url = $match.Value; break }
  if ($tunnel.HasExited) { break }
}
if (-not $url) {
  Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  throw "O túnel não forneceu URL. Consulte $TunnelErr."
}

@{ serverPid = $server.Id; tunnelPid = $tunnel.Id; url = $url; port = $Port; startedAt = (Get-Date).ToString("o") } |
  ConvertTo-Json | Set-Content -Encoding UTF8 $StateFile

Write-Host ""
Write-Host "RB Factory backend ativo." -ForegroundColor Green
Write-Host "URL temporária: $url"
Write-Host "Health: $url/api/health"
Write-Host "Logs: $LogDir"
Write-Host "IMPORTANTE: esta URL muda quando o túnel reinicia. O notebook precisa permanecer ligado e conectado."
Write-Host "Para encerrar, execute: .\scripts\stop-rb-factory-tunnel.ps1"
