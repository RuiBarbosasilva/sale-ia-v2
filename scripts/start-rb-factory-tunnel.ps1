[CmdletBinding()]
param(
  [int]$Port = 3000,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Stop-ChildProcess($Process) {
  if ($null -ne $Process -and -not $Process.HasExited) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
  }
}

$serverProcess = $null
$tunnelProcess = $null
$oldNodeEnv = $env:NODE_ENV
$oldHost = $env:HOST
$oldPort = $env:PORT

try {
  if (-not (Test-Path '.env')) {
    throw 'Arquivo .env não encontrado. Configure as credenciais localmente antes de iniciar.'
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js não encontrado no PATH.'
  }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm não encontrado no PATH.'
  }
  if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw 'cloudflared não encontrado. Instale com: winget install --id Cloudflare.cloudflared'
  }
  if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_TUNNEL_TOKEN)) {
    throw 'Defina CLOUDFLARE_TUNNEL_TOKEN na sessão do PowerShell usando o token de um Named Tunnel do Cloudflare.'
  }

  if (-not (Test-Path 'node_modules')) {
    throw 'node_modules não existe. Execute npm ci primeiro.'
  }

  if (-not $SkipBuild) {
    Write-Host '[RB FACTORY] Gerando build de produção...' -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build falhou; servidor não será iniciado.' }
  }

  if (-not (Test-Path 'dist/src/server.js')) {
    throw 'dist/src/server.js não encontrado. O build precisa gerar o servidor.'
  }

  $env:NODE_ENV = 'production'
  $env:HOST = '127.0.0.1'
  $env:PORT = [string]$Port

  $logDir = Join-Path (Get-Location) 'logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $serverOut = Join-Path $logDir 'rb-factory-server.out.log'
  $serverErr = Join-Path $logDir 'rb-factory-server.err.log'
  $tunnelOut = Join-Path $logDir 'cloudflared.out.log'
  $tunnelErr = Join-Path $logDir 'cloudflared.err.log'

  Write-Host '[RB FACTORY] Iniciando backend local...' -ForegroundColor Cyan
  $serverProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'dist/src/server.js' -WorkingDirectory (Get-Location).Path -PassThru -WindowStyle Hidden -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr

  $healthy = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    if ($serverProcess.HasExited) {
      throw "O backend encerrou inesperadamente. Consulte $serverErr"
    }
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 3 -UseBasicParsing
      if ($response.StatusCode -eq 200) { $healthy = $true; break }
    } catch {}
  }
  if (-not $healthy) { throw "Backend não respondeu em http://127.0.0.1:$Port/api/health. Consulte $serverErr" }

  Write-Host '[RB FACTORY] Health check HTTP 200. Iniciando túnel Cloudflare nomeado...' -ForegroundColor Green
  $tunnelProcess = Start-Process -FilePath (Get-Command cloudflared).Source -ArgumentList @('tunnel','run','--no-autoupdate','--token',$env:CLOUDFLARE_TUNNEL_TOKEN) -WorkingDirectory (Get-Location).Path -PassThru -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr

  Start-Sleep -Seconds 5
  if ($tunnelProcess.HasExited) {
    throw "Cloudflare Tunnel encerrou. Consulte $tunnelErr e confirme o token/hostname no painel Cloudflare."
  }

  Write-Host ''
  Write-Host '[RB FACTORY] Backend e processo do túnel iniciados.' -ForegroundColor Green
  Write-Host "Health local: http://127.0.0.1:$Port/api/health"
  Write-Host 'Endereço público: hostname configurado na rota pública do Named Tunnel no Cloudflare.'
  Write-Host "Logs: $logDir"
  Write-Host 'Mantenha esta janela aberta. Pressione Ctrl+C para encerrar.'
  while (-not $serverProcess.HasExited -and -not $tunnelProcess.HasExited) {
    Start-Sleep -Seconds 3
  }
  if ($serverProcess.HasExited) { throw "Backend encerrou. Consulte $serverErr" }
  if ($tunnelProcess.HasExited) { throw "Túnel encerrou. Consulte $tunnelErr" }
}
finally {
  Stop-ChildProcess $tunnelProcess
  Stop-ChildProcess $serverProcess
  $env:NODE_ENV = $oldNodeEnv
  $env:HOST = $oldHost
  $env:PORT = $oldPort
}
