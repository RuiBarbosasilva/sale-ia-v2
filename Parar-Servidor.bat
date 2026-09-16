   @echo off
   echo Parando o servidor SALE-IA-V2 em segundo plano...
   taskkill /F /IM node.exe >nul 2>&1
   echo ✅ Servidor parado com sucesso! A porta 3000 foi liberada.
   timeout /t 3 >nul