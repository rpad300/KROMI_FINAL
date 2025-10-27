# Script para adicionar autenticação em massa nas páginas -kromi

$paginas = @(
    "classifications-kromi.html",
    "participants-kromi.html",
    "category-rankings-kromi.html",
    "devices-kromi.html",
    "checkpoint-order-kromi.html",
    "calibration-kromi.html",
    "config-kromi.html"
)

$scriptsAutenticacao = @"
    <!-- Scripts de Autenticação -->
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="supabase.js?v=2025102605"></script>
    <script src="auth-system.js?v=2025102605"></script>
    <script src="universal-route-protection.js?v=2025102605"></script>
    
    <!-- Scripts da Página -->
"@

$codigoVerificacao = @"

            console.log('🔐 Verificando autenticação...');
            
            try {
                await waitForAuthSystem();
                
                if (!window.authSystem.isAdmin() && !window.authSystem.isEventManager()) {
                    console.warn('⚠️ Sem permissão - redirecionando para login');
                    window.location.href = './login.html';
                    return;
                }
                
                console.log('✅ Autenticação validada');
                
            } catch (error) {
                console.error('❌ Erro na autenticação:', error);
                window.location.href = './login.html';
                return;
            }
            
"@

$funcaoWaitForAuthSystem = @"
        
        async function waitForAuthSystem() {
            const maxWaitTime = 10000;
            const startTime = Date.now();
            
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    const elapsedTime = Date.now() - startTime;
                    
                    if (window.authSystem && window.authSystem.supabase) {
                        clearInterval(checkInterval);
                        console.log(`✅ AuthSystem pronto após ${elapsedTime}ms`);
                        resolve();
                        return;
                    }
                    
                    if (elapsedTime > maxWaitTime) {
                        clearInterval(checkInterval);
                        reject(new Error('Timeout ao aguardar AuthSystem'));
                    }
                }, 100);
            });
        }
"@

Write-Host "🔐 Adicionando autenticação em páginas -kromi..." -ForegroundColor Cyan

foreach ($pagina in $paginas) {
    if (Test-Path $pagina) {
        Write-Host "`n📄 Processando: $pagina" -ForegroundColor Yellow
        
        $conteudo = Get-Content $pagina -Raw
        
        # 1. Substituir script do supabase.js antigo
        if ($conteudo -match '<script src="supabase\.js"></script>') {
            Write-Host "  ✅ Substituindo scripts de autenticação..." -ForegroundColor Green
            $conteudo = $conteudo -replace '<script src="supabase\.js"></script>\s*<script src="navigation\.js"></script>', $scriptsAutenticacao + '<script src="navigation.js"></script>'
        }
        
        # 2. Adicionar verificação de autenticação no DOMContentLoaded
        if ($conteudo -match "document\.addEventListener\('DOMContentLoaded', \(\) => \{") {
            Write-Host "  ✅ Adicionando verificação de autenticação..." -ForegroundColor Green
            $conteudo = $conteudo -replace "document\.addEventListener\('DOMContentLoaded', \(\) => \{", "document.addEventListener('DOMContentLoaded', async () => {$codigoVerificacao"
        }
        elseif ($conteudo -match "document\.addEventListener\('DOMContentLoaded', async \(\) => \{") {
            Write-Host "  ✅ Adicionando verificação de autenticação (async já existe)..." -ForegroundColor Green
            $conteudo = $conteudo -replace "(document\.addEventListener\('DOMContentLoaded', async \(\) => \{)", "`$1$codigoVerificacao"
        }
        
        # 3. Adicionar função waitForAuthSystem antes do primeiro 'function'
        if ($conteudo -match '\n        function ') {
            Write-Host "  ✅ Adicionando função waitForAuthSystem..." -ForegroundColor Green
            $conteudo = $conteudo -replace '(\n        function )', "$funcaoWaitForAuthSystem`$1"
        }
        
        # Salvar arquivo
        $conteudo | Set-Content $pagina -NoNewline
        
        Write-Host "  ✅ $pagina atualizado!" -ForegroundColor Green
        
    } else {
        Write-Host "  ⚠️ $pagina não encontrado" -ForegroundColor Red
    }
}

Write-Host "`n✅ Processo concluído!" -ForegroundColor Cyan
Write-Host "`n📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Reiniciar servidor: Ctrl+C e npm start" -ForegroundColor White
Write-Host "  2. Limpar cache do browser: Ctrl+Shift+R" -ForegroundColor White
Write-Host "  3. Testar cada página" -ForegroundColor White



