@echo off
setlocal
cd /d C:\sale-ia-v2

powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "try { Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing -TimeoutSec 2 | Out-Null } catch { Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command cd C:\sale-ia-v2; npm run dev *> C:\sale-ia-v2\runtime\backend.log' }"

powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$ok=$false;for($i=0;$i -lt 30;$i++){try{Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing -TimeoutSec 1|Out-Null;$ok=$true;break}catch{};Start-Sleep 1};if($ok){Start-Process 'http://localhost:3000'}"

exit
