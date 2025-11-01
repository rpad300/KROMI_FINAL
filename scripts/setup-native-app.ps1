# ============================================================================
# KROMI - Script de Setup Completo para App Nativa (PowerShell)
# ============================================================================
# Este script ajuda a configurar tudo necessário para a app nativa
# ============================================================================

Write-Host "🚀 Kromi - Setup App Nativa" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "   Crie um arquivo .env com as variáveis necessárias" -ForegroundColor Yellow
    exit 1
}

# Carregar variáveis do .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Verificar variáveis necessárias
$supabaseUrl = if ($env:NEXT_PUBLIC_SUPABASE_URL) { $env:NEXT_PUBLIC_SUPABASE_URL } elseif ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { $null }
$serviceKey = if ($env:SUPABASE_SERVICE_ROLE_KEY) { $env:SUPABASE_SERVICE_ROLE_KEY } else { $null }

if (-not $supabaseUrl) {
    Write-Host "❌ Variável SUPABASE_URL não encontrada no .env" -ForegroundColor Red
    exit 1
}

if (-not $serviceKey) {
    Write-Host "❌ Variável SUPABASE_SERVICE_ROLE_KEY não encontrada no .env" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Variáveis de ambiente carregadas" -ForegroundColor Green
Write-Host "   Supabase URL: $($supabaseUrl.Substring(0, [Math]::Min(30, $supabaseUrl.Length)))..." -ForegroundColor Gray
Write-Host ""

Write-Host "📋 INSTRUÇÕES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Execute estes arquivos SQL no Supabase Dashboard → SQL Editor:" -ForegroundColor White
Write-Host "   1. sql/native-app-qr-code-system.sql" -ForegroundColor Cyan
Write-Host "   2. sql/native-app-detections-table.sql" -ForegroundColor Cyan
Write-Host "   3. sql/auto-fill-device-info-on-create.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Ordem de execução:" -ForegroundColor Yellow
Write-Host "   1. Abra https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   2. Selecione seu projeto" -ForegroundColor White
Write-Host "   3. Vá em SQL Editor" -ForegroundColor White
Write-Host "   4. Cole o conteúdo de cada arquivo SQL (na ordem acima)" -ForegroundColor White
Write-Host "   5. Clique em Run para executar" -ForegroundColor White
Write-Host ""
Write-Host "✅ Após executar os SQL:" -ForegroundColor Green
Write-Host "   - Reinicie o servidor: node server.js" -ForegroundColor White
Write-Host "   - Verifique se o processador inicia corretamente" -ForegroundColor White
Write-Host ""

