# ==========================================
# SCRIPT: Substituir VisionKrono por Kromi.online
# ==========================================
# Substitui todas as ocorrências de "VisionKrono" por "Kromi.online" 
# em todos os arquivos do projeto
# ==========================================

Write-Host "🔄 Iniciando substituição de VisionKrono por Kromi.online..." -ForegroundColor Yellow

# Diretório raiz do projeto
$projectRoot = Get-Location
$srcPath = Join-Path $projectRoot "src"

# Contadores
$filesProcessed = 0
$totalReplacements = 0
$errors = @()

# Tipos de arquivos para processar
$fileExtensions = @("*.html", "*.js", "*.css", "*.md", "*.json", "*.sql")

Write-Host "📁 Processando arquivos em: $srcPath" -ForegroundColor Cyan

foreach ($extension in $fileExtensions) {
    $files = Get-ChildItem -Path $srcPath -Filter $extension -Recurse -File
    
    foreach ($file in $files) {
        try {
            Write-Host "📄 Processando: $($file.Name)" -ForegroundColor Gray
            
            # Ler conteúdo do arquivo
            $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
            
            if ($content -match "VisionKrono") {
                # Contar ocorrências antes da substituição
                $beforeCount = ([regex]::Matches($content, "VisionKrono")).Count
                
                # Fazer a substituição
                $newContent = $content -replace "VisionKrono", "Kromi.online"
                
                # Contar ocorrências após a substituição
                $afterCount = ([regex]::Matches($newContent, "VisionKrono")).Count
                $replacements = $beforeCount - $afterCount
                
                if ($replacements -gt 0) {
                    # Salvar arquivo modificado
                    Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
                    
                    Write-Host "  ✅ $replacements substituições em $($file.Name)" -ForegroundColor Green
                    $totalReplacements += $replacements
                }
            }
            
            $filesProcessed++
            
        } catch {
            $errorMsg = "Erro ao processar $($file.FullName): $($_.Exception.Message)"
            Write-Host "  ❌ $errorMsg" -ForegroundColor Red
            $errors += $errorMsg
        }
    }
}

# Processar arquivos na raiz também
Write-Host "📁 Processando arquivos na raiz do projeto..." -ForegroundColor Cyan

$rootFiles = Get-ChildItem -Path $projectRoot -Filter "*.md" -File
foreach ($file in $rootFiles) {
    try {
        Write-Host "📄 Processando: $($file.Name)" -ForegroundColor Gray
        
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        
        if ($content -match "VisionKrono") {
            $beforeCount = ([regex]::Matches($content, "VisionKrono")).Count
            $newContent = $content -replace "VisionKrono", "Kromi.online"
            $afterCount = ([regex]::Matches($newContent, "VisionKrono")).Count
            $replacements = $beforeCount - $afterCount
            
            if ($replacements -gt 0) {
                Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
                Write-Host "  ✅ $replacements substituições em $($file.Name)" -ForegroundColor Green
                $totalReplacements += $replacements
            }
        }
        
        $filesProcessed++
        
    } catch {
        $errorMsg = "Erro ao processar $($file.FullName): $($_.Exception.Message)"
        Write-Host "  ❌ $errorMsg" -ForegroundColor Red
        $errors += $errorMsg
    }
}

# Resumo
Write-Host "`n📊 RESUMO DA SUBSTITUIÇÃO:" -ForegroundColor Yellow
Write-Host "  📁 Arquivos processados: $filesProcessed" -ForegroundColor White
Write-Host "  🔄 Total de substituições: $totalReplacements" -ForegroundColor White

if ($errors.Count -gt 0) {
    Write-Host "  ❌ Erros encontrados: $($errors.Count)" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "    - $error" -ForegroundColor Red
    }
} else {
    Write-Host "  ✅ Nenhum erro encontrado!" -ForegroundColor Green
}

Write-Host "`n🎉 Substituição concluída!" -ForegroundColor Green
Write-Host "💡 Recomendação: Faça commit das alterações e teste o sistema." -ForegroundColor Cyan
