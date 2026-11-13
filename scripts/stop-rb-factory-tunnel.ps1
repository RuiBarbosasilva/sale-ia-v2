$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$StateFile = Join-Path $Root "logs\rb-factory-tunnel\processes.json"
if (-not (Test-Path $StateFile)) {
  Write-Host "Nenhuma sessão registrada."
  exit 0
}
$state = Get-Content $StateFile -Raw | ConvertFrom-Json
foreach ($id in @($state.tunnelPid, $state.serverPid)) {
  if ($id) {
    Stop-Process -Id ([int]$id) -Force -ErrorAction SilentlyContinue
  }
}
Remove-Item $StateFile -Force -ErrorAction SilentlyContinue
Write-Host "Túnel e backend encerrados."
