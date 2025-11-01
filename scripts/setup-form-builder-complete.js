/**
 * ============================================================================
 * KROMI - Executar Setup Completo do Form Builder
 * ============================================================================
 * Este script executa automaticamente TODOS os SQLs necessários para o Form Builder
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Executando setup completo do Form Builder...');
console.log('');

// Executar SQLs em sequência
const sqlFiles = [
    'sql/create-form-builder-system.sql',
    'sql/integrate-form-builder-with-participants.sql'
];

for (const sqlFile of sqlFiles) {
    console.log(`📋 Executando: ${sqlFile}`);
    console.log('');
    
    try {
        const result = execSync(`node scripts/run-sql.js ${sqlFile}`, {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        
        console.log(`✅ ${path.basename(sqlFile)} executado com sucesso!`);
        console.log('');
    } catch (error) {
        console.error(`❌ Erro ao executar ${sqlFile}:`);
        console.error(error.message);
        process.exit(1);
    }
}

console.log('================================================');
console.log('✅ SETUP COMPLETO!');
console.log('================================================');
console.log('');
console.log('📊 Resumo:');
console.log('   ✅ 8 tabelas Form Builder criadas');
console.log('   ✅ 8 colunas adicionadas a participants');
console.log('   ✅ 3 funções criadas');
console.log('   ✅ 2 triggers criados');
console.log('   ✅ 1 view criada');
console.log('   ✅ 10 campos no catálogo');
console.log('');
console.log('📋 Próximos passos:');
console.log('   1. Reiniciar servidor: node server.js');
console.log('   2. Verificar logs: "✅ Rotas de Form Builder carregadas"');
console.log('   3. Criar formulário via API ou interface');
console.log('');
console.log('📚 Documentação:');
console.log('   - LEIA-ME-FORM-BUILDER.md');
console.log('   - FORM-BUILDER-QUICK-START.md');
console.log('   - FORM-BUILDER-INTEGRATION-GUIDE.md');
console.log('');
