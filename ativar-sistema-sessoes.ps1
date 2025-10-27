# ==========================================
# ATIVAR SISTEMA DE SESSÕES PROFISSIONAL
# ==========================================
# 
# Este script substitui auth-system.js por auth-client.js
# em todas as páginas do projeto
# 
# Data: 2025-10-26
# ==========================================

Write-Host "`n🚀 ATIVANDO SISTEMA DE SESSÕES PROFISSIONAL..." -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# Páginas a atualizar
$paginas = @(
    "login.html",
    "events.html",
    "index-kromi.html",
    "image-processor-kromi.html",
    "database-management-kromi.html",
    "classifications-kromi.html",
    "participants-kromi.html",
    "category-rankings-kromi.html",
    "devices-kromi.html",
    "checkpoint-order-kromi.html",
    "calibration-kromi.html",
    "config-kromi.html",
    "template-pagina-protegida.html"
)

$substituicoes = 0
$erros = 0

foreach ($pagina in $paginas) {
    if (Test-Path $pagina) {
        Write-Host "📄 Processando: $pagina" -ForegroundColor Yellow
        
        try {
            $conteudo = Get-Content $pagina -Raw
            
            # Substituir auth-system.js por auth-client.js
            if ($conteudo -match 'auth-system\.js') {
                $conteudo = $conteudo -replace 'auth-system\.js\?v=\d+', 'auth-client.js?v=2025102610'
                $conteudo = $conteudo -replace 'auth-system\.js', 'auth-client.js?v=2025102610'
                
                $conteudo | Set-Content $pagina -NoNewline
                
                Write-Host "  ✅ Substituído: auth-system.js → auth-client.js" -ForegroundColor Green
                $substituicoes++
            } else {
                Write-Host "  ⏭️  Não usa auth-system.js, pulando..." -ForegroundColor Gray
            }
            
        } catch {
            Write-Host "  ❌ Erro ao processar: $_" -ForegroundColor Red
            $erros++
        }
        
    } else {
        Write-Host "  ⚠️  Arquivo não encontrado: $pagina" -ForegroundColor Yellow
    }
}

Write-Host "`n==========================================`n" -ForegroundColor Cyan
Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host "  ✅ $substituicoes páginas atualizadas" -ForegroundColor Green
Write-Host "  ❌ $erros erros" -ForegroundColor Red
Write-Host "`n==========================================`n" -ForegroundColor Cyan

if ($erros -eq 0) {
    Write-Host "🎉 SISTEMA DE SESSÕES ATIVADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "  1. Reiniciar servidor: Ctrl+C e npm start" -ForegroundColor White
    Write-Host "  2. Limpar cache do browser: Ctrl+Shift+R" -ForegroundColor White
    Write-Host "  3. Testar login" -ForegroundColor White
    Write-Host "  4. Verificar logs no terminal do servidor" -ForegroundColor White
} else {
    Write-Host "⚠️  Houve erros na ativação!" -ForegroundColor Red
    Write-Host "Verifica os erros acima e corrige manualmente." -ForegroundColor Yellow
}

