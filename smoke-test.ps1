# SALE-IA-V2 - SMOKE TEST HTTP REAL
# Execute este script com o servidor rodando na porta 3000

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SALE-IA-V2 - SMOKE TEST HTTP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

function Test-HttpEndpoint {
    param (
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null
    )
    
    $url = "$baseUrl$Path"
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 5
        } else {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-WebRequest -Uri $url -Method $Method -Body $jsonBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        }
        
        $statusCode = $response.StatusCode
        $color = "Green"
        if ($statusCode -ge 400) { $color = "Yellow" }
        if ($statusCode -ge 500) { $color = "Red" }
        
        Write-Host "$Method " -NoNewline -ForegroundColor White
        Write-Host "$Path " -NoNewline -ForegroundColor Cyan
        Write-Host "-> HTTP $statusCode" -ForegroundColor $color
        
        return $statusCode
    }
    catch {
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            $color = "Yellow"
            if ($statusCode -ge 500) { $color = "Red" }
            
            Write-Host "$Method " -NoNewline -ForegroundColor White
            Write-Host "$Path " -NoNewline -ForegroundColor Cyan
            Write-Host "-> HTTP $statusCode" -ForegroundColor $color
            
            return $statusCode
        } else {
            Write-Host "$Method " -NoNewline -ForegroundColor White
            Write-Host "$Path " -NoNewline -ForegroundColor Cyan
            Write-Host "-> ERROR: $($_.Exception.Message)" -ForegroundColor Red
            
            return "ERROR"
        }
    }
}

Write-Host "Executando testes HTTP..." -ForegroundColor Yellow
Write-Host ""

# HEALTH
Test-HttpEndpoint -Method "GET" -Path "/api/health"

# DASHBOARD
Test-HttpEndpoint -Method "GET" -Path "/api/dashboard/overview"
Test-HttpEndpoint -Method "GET" -Path "/api/dashboard/sales-metrics"
Test-HttpEndpoint -Method "GET" -Path "/api/dashboard/messages?phone=5511999999999"
Test-HttpEndpoint -Method "POST" -Path "/api/dashboard/toggle-human-mode" -Body @{phone="5511999999999"; humanMode=$false}
Test-HttpEndpoint -Method "POST" -Path "/api/dashboard/send-message" -Body @{phone="5511999999999"; message="Test message"}

# LEADS
Test-HttpEndpoint -Method "POST" -Path "/api/leads/reset-human-mode" -Body @{leadId="test-lead-id"}

# PAYMENTS
Test-HttpEndpoint -Method "POST" -Path "/api/payments/webhook" -Body @{transactionId="test-tx-123"; orderId="test-order-id"; amount=100.00}

# PIX
Test-HttpEndpoint -Method "POST" -Path "/api/pix/generate" -Body @{amount=100.00; key="test@test.com"; name="TESTE"; city="SAO PAULO"}

# PRICING
Test-HttpEndpoint -Method "POST" -Path "/api/pricing/quote" -Body @{leadId="test-lead"; productId="test-product"; quantity=1}
Test-HttpEndpoint -Method "POST" -Path "/api/pricing/calculate" -Body @{productId="test-product"; quantity=1}
Test-HttpEndpoint -Method "GET" -Path "/api/pricing/non-existent-id-12345"
Test-HttpEndpoint -Method "POST" -Path "/api/pricing/negotiate" -Body @{quoteId="test-quote"; requestedDiscount=5}

# WEBHOOK
Test-HttpEndpoint -Method "POST" -Path "/api/webhook/whatsapp" -Body @{phone="5511999999999"; message="Ola, gostaria de saber precos"}
Test-HttpEndpoint -Method "POST" -Path "/api/webhook/" -Body @{phone="5511999999999"; message="Ola"}

# CHAT
Test-HttpEndpoint -Method "POST" -Path "/api/chat" -Body @{message="Ola, quais produtos voces tem?"; phone="5511999999999"}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST CONCLUIDO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Legenda:" -ForegroundColor Yellow
Write-Host "  HTTP 200-299 = Sucesso (Verde)" -ForegroundColor Green
Write-Host "  HTTP 400-499 = Erro do cliente/Validacao (Amarelo)" -ForegroundColor Yellow
Write-Host "  HTTP 500+    = Erro do servidor (Vermelho)" -ForegroundColor Red
Write-Host "  ERROR        = Falha de conexao (Vermelho)" -ForegroundColor Red
Write-Host ""