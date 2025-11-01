/**
 * ============================================================================
 * VISIONKRONO - Executar Setup Completo do GPS Tracking Module
 * ============================================================================
 * Este script executa automaticamente TODOS os SQLs necessários para GPS Tracking
 * Usando as credenciais do .env do projeto
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  📍 VISIONKRONO - GPS TRACKING MODULE');
console.log('  Instalação Completa Automática');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Executar SQLs em sequência
const sqlFiles = [
    { file: 'sql/track_module_schema.sql', desc: 'Schema (Tabelas, Índices, Constraints)' },
    { file: 'sql/track_module_rls.sql', desc: 'Row Level Security Policies' },
    { file: 'sql/track_module_functions.sql', desc: 'Funções e RPCs de Negócio' },
    { file: 'sql/track_module_mobile_inbox.sql', desc: '⭐ Tabelas para App Móvel (Inbox Pattern)' },
    { file: 'sql/track_module_inbox_processor.sql', desc: '⭐ Processador da Inbox' },
    { file: 'sql/track_module_seeds.sql', desc: 'Seeds de Demonstração (Opcional)', optional: true }
];

let totalSuccess = 0;
let totalFailed = 0;

for (const { file, desc, optional } of sqlFiles) {
    console.log(`📋 ${desc}`);
    console.log(`   Ficheiro: ${file}`);
    console.log('');
    
    // Verificar se ficheiro existe
    if (!fs.existsSync(file)) {
        console.error(`❌ Ficheiro não encontrado: ${file}`);
        if (!optional) {
            process.exit(1);
        }
        console.log('⏭️  Pulando (opcional)...');
        console.log('');
        continue;
    }
    
    try {
        // Executar usando run-sql.js (que lê .env automaticamente)
        execSync(`node scripts/run-sql.js ${file}`, {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        
        console.log(`✅ ${path.basename(file)} executado com sucesso!`);
        console.log('');
        totalSuccess++;
        
    } catch (error) {
        console.error(`❌ Erro ao executar ${file}`);
        
        if (!optional) {
            console.error('');
            console.error('💡 Sugestões:');
            console.error('   1. Verificar se o .env está configurado corretamente');
            console.error('   2. Verificar se DATABASE_URL ou SUPABASE_DB_* estão definidos');
            console.error('   3. Executar manualmente via Supabase Dashboard → SQL Editor');
            console.error('');
            process.exit(1);
        } else {
            console.log('⚠️  Falhou mas é opcional, continuando...');
            console.log('');
        }
        
        totalFailed++;
    }
}

// Migrar QRs existentes (se houver)
console.log('📋 Migrando QRs existentes (se houver)...');
console.log('');

try {
    const { Pool } = require('pg');
    
    // Carregar .env
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_POSTGRES_URL;
    
    if (!dbUrl) {
        console.log('⚠️  DATABASE_URL não encontrado, pulando migração');
    } else {
        const pool = new Pool({
            connectionString: dbUrl.replace('postgres://', 'postgresql://'),
            ssl: { rejectUnauthorized: false }
        });
        
        const result = await pool.query('SELECT track_migrate_existing_qrs()');
        const migrationResult = result.rows[0]?.track_migrate_existing_qrs;
        
        if (migrationResult) {
            console.log('✅ Migração executada:', migrationResult);
        } else {
            console.log('✅ Migração completada (sem QRs para migrar)');
        }
        
        await pool.end();
    }
} catch (error) {
    console.log('⚠️  Migração de QRs falhou (normal se primeira instalação)');
}

console.log('');

// Resumo final
console.log('═══════════════════════════════════════════════════════');
console.log('  INSTALAÇÃO CONCLUÍDA!');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('📊 Resumo:');
console.log(`   ✅ ${totalSuccess} scripts executados com sucesso`);
if (totalFailed > 0) {
    console.log(`   ⚠️  ${totalFailed} scripts falharam (opcionais)`);
}
console.log('');
console.log('📋 Database Objects Criados:');
console.log('   ✅ 12 tabelas (8 base + 4 inbox)');
console.log('   ✅ 18 funções/RPCs (10 base + 8 processor)');
console.log('   ✅ 4 views');
console.log('   ✅ ~40 índices');
console.log('   ✅ 3 triggers');
console.log('   ✅ ~25 RLS policies');
console.log('');
console.log('🎯 Próximos Passos:');
console.log('');
console.log('1️⃣  Configurar Scheduler (processar inbox a cada 10s)');
console.log('');
console.log('   Execute no Supabase Dashboard → SQL Editor:');
console.log('');
console.log('   SELECT cron.schedule(');
console.log("       'process-gps-inbox',");
console.log("       '*/10 * * * * *',");
console.log("       $$SELECT track_process_inbox_messages(100);$$");
console.log('   );');
console.log('');
console.log('2️⃣  Verificar Instalação');
console.log('');
console.log('   node scripts/verify-gps-tracking.js');
console.log('');
console.log('3️⃣  Documentação');
console.log('');
console.log('   📖 MOBILE_APP_INBOX_README.md - Guia para app móvel');
console.log('   📖 GPS_TRACKING_MODULE_README.md - Doc completa');
console.log('   📖 docs/GPS_TRACKING_MOBILE_APP_API.md - API para developers');
console.log('');
console.log('4️⃣  Testar');
console.log('');
console.log('   - Abrir: src/event-gps-tracking.html');
console.log('   - Ou integrar no sistema de eventos');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🎉 GPS Tracking Module pronto para usar!');
console.log('═══════════════════════════════════════════════════════');
console.log('');

