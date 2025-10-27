/**
 * Script para verificar quais páginas têm header correto
 * Execute: node src/fix-all-headers-mobile.js
 */

const fs = require('fs');
const path = require('path');

const pagesToCheck = [
    'calibration-kromi.html',
    'config-kromi.html',
    'events-kromi.html',
    'participants-kromi.html',
    'classifications-kromi.html',
    'detection-kromi.html',
    'checkpoint-order-kromi.html',
    'category-rankings-kromi.html',
    'image-processor-kromi.html',
    'database-management-kromi.html',
    'devices-kromi.html',
    'usuarios.html',
    'configuracoes.html',
    'perfis-permissoes.html',
    'logs-auditoria.html',
    'meu-perfil.html',
    'index-kromi.html'
];

console.log('🔍 Verificando estrutura do header em todas as páginas...\n');

const results = {
    ok: [],
    needsFix: []
};

pagesToCheck.forEach(page => {
    const filePath = path.join(__dirname, page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${page} - Ficheiro não encontrado`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se tem header-left
    const hasHeaderLeft = content.includes('class="header-left"');
    const hasHeaderRight = content.includes('class="header-right"');
    const hasHeaderTitle = content.includes('class="header-title"');
    
    if (hasHeaderLeft && hasHeaderRight && hasHeaderTitle) {
        results.ok.push(page);
        console.log(`✅ ${page} - OK`);
    } else {
        results.needsFix.push(page);
        console.log(`❌ ${page} - PRECISA CORREÇÃO`);
        console.log(`   - header-left: ${hasHeaderLeft ? '✅' : '❌'}`);
        console.log(`   - header-right: ${hasHeaderRight ? '✅' : '❌'}`);
        console.log(`   - header-title: ${hasHeaderTitle ? '✅' : '❌'}`);
    }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 RESUMO:`);
console.log(`   ✅ OK: ${results.ok.length}/${pagesToCheck.length}`);
console.log(`   ❌ Precisam correção: ${results.needsFix.length}/${pagesToCheck.length}`);
console.log('='.repeat(50));

if (results.needsFix.length > 0) {
    console.log('\n❌ Páginas que precisam de correção:');
    results.needsFix.forEach(p => console.log(`   - ${p}`));
}

