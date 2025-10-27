/**
 * Script para aplicar Sidebar Unificado a TODAS as páginas -kromi.html
 * Execute no Node.js: node apply-unified-sidebar-to-all.js
 */

const fs = require('fs');
const path = require('path');

// Páginas a atualizar
const pagesToUpdate = [
    'participants-kromi.html',
    'classifications-kromi.html',
    'detection-kromi.html',
    'checkpoint-order-kromi.html',
    'category-rankings-kromi.html',
    'image-processor-kromi.html',
    'database-management-kromi.html',
    'devices-kromi.html'
];

// CSS a adicionar (se não existir)
const cssToAdd = [
    '<link rel="stylesheet" href="navigation-component.css?v=2025102601">',
    '<link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">'
];

// Scripts a adicionar (se não existirem)
const scriptsToAdd = [
    '<script src="navigation-config.js?v=2025102601" defer></script>',
    '<script src="navigation-service.js?v=2025102601" defer></script>',
    '<script src="navigation-component.js?v=2025102601" defer></script>',
    '<script src="navigation-init.js?v=2025102601" defer></script>'
];

function updatePage(filePath) {
    console.log(`\n📝 Processando: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  Ficheiro não encontrado, ignorando.`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. Adicionar CSS (antes de </head>)
    cssToAdd.forEach(css => {
        if (!content.includes(css)) {
            // Procurar onde inserir (depois de kromi-layout-fixes.css)
            const kromiLayoutIndex = content.indexOf('kromi-layout-fixes.css');
            if (kromiLayoutIndex !== -1) {
                const afterKromi = content.indexOf('\n', kromiLayoutIndex);
                if (afterKromi !== -1) {
                    const indent = '    ';
                    content = content.slice(0, afterKromi + 1) + 
                             `\n    <!-- Sistema de Navegação Unificado -->\n${indent}${css}\n` +
                             content.slice(afterKromi + 1);
                    modified = true;
                    console.log(`   ✅ Adicionado: ${css}`);
                }
            }
        } else {
            console.log(`   ℹ️  Já existe: ${css}`);
        }
    });
    
    // 2. Adicionar scripts (antes de </body> ou antes do último script)
    scriptsToAdd.forEach(script => {
        if (!content.includes(script.split('?')[0])) { // Ignorar versão
            // Procurar onde inserir (antes de </body> ou após auth scripts)
            const bodyCloseIndex = content.lastIndexOf('</body>');
            if (bodyCloseIndex !== -1) {
                const indent = '    ';
                // Adicionar antes de </body>
                content = content.slice(0, bodyCloseIndex) + 
                         `${indent}${script}\n` +
                         content.slice(bodyCloseIndex);
                modified = true;
                console.log(`   ✅ Adicionado: ${script}`);
            }
        } else {
            console.log(`   ℹ️  Já existe: ${script.split('?')[0]}`);
        }
    });
    
    // 3. Substituir <nav class="sidebar"> por <div class="sidebar">
    if (content.includes('<nav class="sidebar"')) {
        content = content.replace(/<nav class="sidebar"/g, '<div class="sidebar"');
        content = content.replace(/<\/nav>\s*<!--\s*Sidebar\s*-->/g, '</div>');
        modified = true;
        console.log(`   ✅ Substituído: <nav class="sidebar"> → <div class="sidebar">`);
    }
    
    // 4. Adicionar class="layout-with-sidebar" no body (se não existir)
    if (!content.includes('class="layout-with-sidebar"') && content.includes('<body')) {
        content = content.replace(/<body([^>]*)>/g, '<body$1 class="layout-with-sidebar">');
        modified = true;
        console.log(`   ✅ Adicionado: class="layout-with-sidebar" no body`);
    }
    
    // 5. Salvar se modificado
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   💾 Ficheiro atualizado com sucesso!`);
    } else {
        console.log(`   ℹ️  Nenhuma alteração necessária`);
    }
}

// Processar todas as páginas
console.log('🚀 Aplicando Sidebar Unificado a todas as páginas...\n');

pagesToUpdate.forEach(page => {
    updatePage(page);
});

console.log('\n✅ Processamento concluído!');
console.log('\n📋 Resumo:');
console.log(`   Total de páginas processadas: ${pagesToUpdate.length}`);
console.log('\n🧪 Próximo passo: Testar cada página no browser');

