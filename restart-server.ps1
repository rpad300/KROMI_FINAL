# Script para reiniciar servidor VisionKrono
# Executar: .\restart-server.ps1

Write-Host ""
Write-Host "🔄 Reiniciando Servidor VisionKrono..." -ForegroundColor Cyan
Write-Host ""

# Procurar processo do servidor (normalmente escuta na porta 1144)
$serverPort = 1144
$serverProcess = Get-NetTCPConnection -LocalPort $serverPort -ErrorAction SilentlyContinue | Select-Object -First 1

if ($serverProcess) {
    $pid = $serverProcess.OwningProcess
    Write-Host "📍 Servidor encontrado na porta $serverPort (PID: $pid)" -ForegroundColor Yellow
    
    # Parar processo
    Write-Host "⏸️ Parando servidor..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    Write-Host "✅ Servidor parado" -ForegroundColor Green
} else {
    Write-Host "⚠️ Nenhum servidor encontrado na porta $serverPort" -ForegroundColor Yellow
}

# Iniciar servidor novamente
Write-Host ""
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan

# Verificar se existe package.json
if (Test-Path "package.json") {
    Write-Host "📦 Usando npm start..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
    Write-Host "✅ Servidor iniciado em nova janela!" -ForegroundColor Green
} elseif (Test-Path "server.js") {
    Write-Host "📦 Usando node server.js..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"
    Write-Host "✅ Servidor iniciado em nova janela!" -ForegroundColor Green
} else {
    Write-Host "❌ Não encontrado package.json ou server.js" -ForegroundColor Red
    Write-Host "💡 Iniciar manualmente: npm start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Aguarde ~5 segundos e verifique os logs do servidor" -ForegroundColor Cyan
Write-Host "✅ Deve mostrar: Cliente Supabase (service role) inicializado" -ForegroundColor Green
Write-Host ""

