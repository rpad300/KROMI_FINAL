/**
 * Script para adicionar logo-loader.js e logo-integration.css
 * a todas as páginas que usam navigation-component.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

// Páginas que já foram atualizadas manualmente (não atualizar novamente)
const alreadyUpdated = [
    'devices-kromi.html',
    'usuarios.html',
    'perfis-permissoes.html',
    'branding-seo.html',
    '_template-kromi.html',
    'login.html',
    'detections-kromi.html'
];

// Encontrar todos os arquivos HTML
const htmlFiles = fs.readdirSync(srcDir)
    .filter(file => file.endsWith('.html'))
    .filter(file => !alreadyUpdated.includes(file));

console.log(`📄 Encontradas ${htmlFiles.length} páginas para verificar...`);

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

htmlFiles.forEach(file => {
    const filePath = path.join(srcDir, file);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Verificar se usa navigation-component.js
        if (!content.includes('navigation-component.js')) {
            skippedCount++;
            return;
        }
        
        // Verificar se já tem ambos
        const hasLogoLoader = content.includes('logo-loader.js');
        const hasLogoIntegration = content.includes('logo-integration.css');
        
        if (hasLogoLoader && hasLogoIntegration) {
            console.log(`⏭️  ${file} já tem logo-loader.js e logo-integration.css`);
            skippedCount++;
            return;
        }
        
        // Adicionar logo-integration.css no <head> (após navigation-component.css ou unified-sidebar-styles.css)
        if (!hasLogoIntegration) {
            // Tentar encontrar unified-sidebar-styles.css primeiro
            const unifiedPattern = /(<link\s+rel="stylesheet"\s+href="[^"]*unified-sidebar-styles\.css[^"]*">)/;
            if (unifiedPattern.test(content)) {
                content = content.replace(
                    unifiedPattern,
                    `$1\n    <link rel="stylesheet" href="/logo-integration.css?v=2025012701">`
                );
                modified = true;
            } else {
                // Se não encontrar, procurar navigation-component.css
                const navPattern = /(<link\s+rel="stylesheet"\s+href="[^"]*navigation-component\.css[^"]*">)/;
                if (navPattern.test(content)) {
                    content = content.replace(
                        navPattern,
                        `$1\n    <link rel="stylesheet" href="/logo-integration.css?v=2025012701">`
                    );
                    modified = true;
                }
            }
        }
        
        // Adicionar logo-loader.js antes de navigation-component.js
        const scriptPattern = /(<script\s+src="[^"]*navigation-component\.js[^"]*"[^>]*>)/;
        if (scriptPattern.test(content)) {
            // Encontrar a linha exata
            const lines = content.split('\n');
            let insertIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('navigation-component.js')) {
                    // Inserir antes desta linha
                    const beforeLine = lines[i];
                    const indent = beforeLine.match(/^(\s*)/)[1];
                    
                    // Verificar se já tem logo-loader antes
                    let hasLogoLoader = false;
                    for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
                        if (lines[j].includes('logo-loader.js')) {
                            hasLogoLoader = true;
                            break;
                        }
                        // Parar se encontrar outro script de navegação antes
                        if (lines[j].includes('navigation-') && !lines[j].includes('navigation-component.js')) {
                            break;
                        }
                    }
                    
                    if (!hasLogoLoader && !content.includes('logo-loader.js')) {
                        // Inserir logo-loader.js antes de navigation-component.js
                        lines.splice(i, 0, `${indent}<!-- Logo Loader (carregar ANTES da navegação, SEM defer para garantir ordem) -->`);
                        lines.splice(i + 1, 0, `${indent}<script src="/logo-loader.js?v=2025012702"></script>`);
                        content = lines.join('\n');
                        modified = true;
                        break;
                    }
                }
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${file} atualizado`);
            updatedCount++;
        } else {
            skippedCount++;
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar ${file}:`, error.message);
        errorCount++;
    }
});

console.log('\n📊 Resumo:');
console.log(`   ✅ Atualizadas: ${updatedCount}`);
console.log(`   ⏭️  Ignoradas: ${skippedCount}`);
console.log(`   ❌ Erros: ${errorCount}`);
console.log(`\n✅ Processo concluído!`);

