@echo off
setlocal EnableExtensions EnableDelayedExpansion

title SALE-IA-V2 - Inicializador Automatico
color 0A

set "PROJECT=C:\sale-ia-v2"
set "REDIS=C:\redis"
set "REDIS_EXE=C:\redis\redis-server.exe"
set "REDIS_CONF=C:\redis\redis.windows.conf"
set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
set "BACKEND_PORT=3000"

echo.
echo ============================================================
echo                 SALE-IA-V2
echo              INICIALIZADOR AUTOMATICO
echo ============================================================
echo.

REM ============================================================
REM 1 - DOCKER DESKTOP
REM ============================================================

echo [1/6] Verificando Docker Desktop...

tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I "Docker Desktop.exe" >NUL

if errorlevel 1 (
    echo       Docker nao esta aberto. Iniciando...
    
    if exist "%DOCKER_EXE%" (
        start "" "%DOCKER_EXE%"
        
        echo       Aguardando Docker Engine...
        
        set /a DOCKER_TRIES=0
        
        :WAIT_DOCKER
        timeout /t 2 /nobreak >nul
        
        docker info >nul 2>&1
        
        if errorlevel 1 (
            set /a DOCKER_TRIES+=1
            
            if !DOCKER_TRIES! GEQ 30 (
                echo       [AVISO] Docker Engine nao respondeu.
                echo       O SALE-IA continuara sem containers Docker.
                goto DOCKER_OK
            )
            
            goto WAIT_DOCKER
        )
        
        echo       [OK] Docker Engine online.
    ) else (
        echo       [AVISO] Docker Desktop nao encontrado.
        echo       Continuando sem Docker.
    )
) else (
    echo       [OK] Docker Desktop ja esta aberto.
)

:DOCKER_OK

REM ============================================================
REM 2 - REDIS
REM ============================================================

echo.
echo [2/6] Verificando Redis...

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"

if errorlevel 1 (
    echo       Redis nao esta rodando.
    echo       Iniciando Redis em C:\redis...
    
    if exist "%REDIS_EXE%" (
        if exist "%REDIS_CONF%" (
            start "SALE-IA Redis" /MIN "%REDIS_EXE%" "%REDIS_CONF%"
        ) else (
            start "SALE-IA Redis" /MIN "%REDIS_EXE%"
        )
        
        echo       Aguardando Redis...
        
        set /a REDIS_TRIES=0
        
        :WAIT_REDIS
        timeout /t 1 /nobreak >nul
        
        powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
        
        if errorlevel 1 (
            set /a REDIS_TRIES+=1
            
            if !REDIS_TRIES! GEQ 20 (
                echo       [ERRO] Redis nao iniciou.
                echo.
                echo       Verifique:
                echo       C:\redis\redis-server.exe
                echo       C:\redis\redis.windows.conf
                echo.
                pause
                exit /b 1
            )
            
            goto WAIT_REDIS
        )
        
        echo       [OK] Redis online na porta 6379.
    ) else (
        echo       [ERRO] redis-server.exe nao encontrado.
        pause
        exit /b 1
    )
) else (
    echo       [OK] Redis ja esta online na porta 6379.
)

REM ============================================================
REM 3 - BANCO / PRISMA
REM ============================================================

echo.
echo [3/6] Verificando banco Prisma...

cd /d "%PROJECT%"

call npx prisma migrate status

if errorlevel 1 (
    echo.
    echo       [ERRO] Prisma informou problema nas migrations.
    echo       O servidor NAO sera iniciado.
    echo.
    pause
    exit /b 1
)

echo       [OK] Banco Prisma verificado.

REM ============================================================
REM 4 - BACKEND
REM ============================================================

echo.
echo [4/6] Verificando SALE-IA-V2...

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %BACKEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"

if errorlevel 1 (
    echo       Backend nao esta rodando.
    echo       Iniciando SALE-IA-V2...
    
    cd /d "%PROJECT%"
    
    start "SALE-IA-V2 Backend" cmd /k "cd /d C:\sale-ia-v2 && npm run dev"
    
    echo       Aguardando API na porta %BACKEND_PORT%...
    
    set /a API_TRIES=0
    
    :WAIT_API
    timeout /t 2 /nobreak >nul
    
    powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://localhost:%BACKEND_PORT%/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
    
    if errorlevel 1 (
        set /a API_TRIES+=1
        
        if !API_TRIES! GEQ 30 (
            echo.
            echo       [ERRO] API nao respondeu.
            echo       Verifique a janela do Backend.
            echo.
            pause
            exit /b 1
        )
        
        goto WAIT_API
    )
    
    echo       [OK] Backend online.
) else (
    echo       [OK] Backend ja esta rodando na porta %BACKEND_PORT%.
)

REM ============================================================
REM 5 - HEALTH CHECK
REM ============================================================

echo.
echo [5/6] Executando Health Check...

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 5; Write-Host ('       HTTP ' + $r.StatusCode); exit 0 } catch { exit 1 }"

if errorlevel 1 (
    echo       [ERRO] Health Check falhou.
    pause
    exit /b 1
)

echo       [OK] API respondendo.

REM ============================================================
REM 6 - ABRIR DASHBOARD
REM ============================================================

echo.
echo [6/6] Abrindo Dashboard...

timeout /t 2 /nobreak >nul

start "" "http://localhost:3000"

echo.
echo ============================================================
echo              SALE-IA-V2 ONLINE
echo ============================================================
echo.
echo       Docker : OK
echo       Redis  : OK
echo       Prisma : OK
echo       Backend: OK
echo       API    : OK
echo.
echo       Dashboard: http://localhost:3000
echo.
echo ============================================================
echo.
echo O sistema continuara rodando na janela do Backend.
echo Pode minimizar esta janela.
echo.
pause

endlocal
