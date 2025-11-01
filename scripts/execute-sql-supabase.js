/**
 * Executa SQL diretamente no Supabase usando a API REST
 */

require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERRO: Variáveis de ambiente não configuradas');
    process.exit(1);
}

// Ler o ficheiro SQL
const fs = require('fs');
const path = require('path');

const sqlFilePath = path.join(__dirname, '..', 'sql', 'fix-detection-trigger-participant-id.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log('🔧 Executando correção de triggers no Supabase...\n');
console.log('📋 SQL a executar:');
console.log('   - Corrigir trigger_detection_email()');
console.log('   - Corrigir trigger_classification_email()\n');

// O Supabase não tem uma API REST direta para executar SQL arbitrário
// A melhor opção é usar psql ou executar manualmente
console.log('⚠️  O Supabase não permite executar SQL arbitrário via API REST.');
console.log('\n✅ SOLUÇÃO: Execute manualmente no Supabase Dashboard\n');
console.log('📝 INSTRUÇÕES:');
console.log('   1. Abra: https://supabase.com/dashboard');
console.log('   2. Selecione o seu projeto');
console.log('   3. Vá a: SQL Editor (menu lateral)');
console.log('   4. Clique em: "New query"');
console.log('   5. Cole o seguinte SQL:\n');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(sql);
console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('   6. Clique em: "Run" ou pressione Ctrl+Enter');
console.log('   7. Aguarde confirmação de sucesso\n');
console.log('✅ Após executar, as triggers estarão corrigidas!');

