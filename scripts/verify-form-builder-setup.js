/**
 * ============================================================================
 * KROMI - Verificar Setup do Form Builder
 * ============================================================================
 * Verifica se todas as tabelas, funções e triggers foram criadas corretamente
 * ============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Carregar variáveis de ambiente
const dbUrl = process.env.SUPABASE_DB_URL || 
              process.env.DATABASE_URL || 
              process.env.POSTGRES_URL ||
              process.env.SUPABASE_POSTGRES_URL;
const host = process.env.SUPABASE_DB_HOST || process.env.PGHOST;
const user = process.env.SUPABASE_DB_USER || process.env.PGUSER || 'postgres';
const password = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD;
const database = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || 'postgres';
const port = Number(process.env.SUPABASE_DB_PORT || process.env.PGPORT || 5432);

if (!dbUrl && !host) {
    console.error('❌ Configuração de Postgres não encontrada!');
    console.error('');
    console.error('📋 Configure as variáveis no .env');
    process.exit(1);
}

// Construir configuração
const poolConfig = {
    ssl: { rejectUnauthorized: false }
};

if (host) {
    // Usar campos discretos
    poolConfig.host = host;
    poolConfig.port = port;
    poolConfig.user = user;
    poolConfig.password = password;
    poolConfig.database = database;
} else if (dbUrl) {
    // Parsear connection string
    const url = require('url');
    const parsed = url.parse(dbUrl);
    poolConfig.host = parsed.hostname;
    poolConfig.port = parseInt(parsed.port) || 5432;
    poolConfig.user = parsed.auth ? parsed.auth.split(':')[0] : 'postgres';
    poolConfig.password = parsed.auth ? parsed.auth.split(':').slice(1).join(':') : '';
    poolConfig.database = parsed.pathname ? parsed.pathname.replace(/^\//, '').split('?')[0] : 'postgres';
} else {
    throw new Error('Configuração inválida');
}

const pool = new Pool(poolConfig);

async function verify() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Verificando setup do Form Builder...');
        console.log('');
        
        // Verificar tabelas Form Builder
        console.log('📋 Verificando tabelas Form Builder...');
        const tablesCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'form_field_catalog', 'event_forms', 'event_form_fields',
                'form_submissions', 'form_submission_files', 'event_form_slug_redirects',
                'event_form_version_history', 'form_builder_audit_logs'
            )
            ORDER BY table_name
        `);
        
        console.log(`   Tabelas encontradas: ${tablesCheck.rows.length}/8`);
        tablesCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        if (tablesCheck.rows.length < 8) {
            const allTables = [
                'form_field_catalog', 'event_forms', 'event_form_fields',
                'form_submissions', 'form_submission_files', 'event_form_slug_redirects',
                'event_form_version_history', 'form_builder_audit_logs'
            ];
            const foundTables = tablesCheck.rows.map(r => r.table_name);
            const missing = allTables.filter(t => !foundTables.includes(t));
            console.log('   ❌ Faltando:', missing.join(', '));
        }
        
        console.log('');
        
        // Verificar colunas em participants
        console.log('👥 Verificando colunas em participants...');
        const participantsColumnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns
            WHERE table_name = 'participants'
            AND column_name IN (
                'registration_status', 'payment_status', 'is_free',
                'payment_amount', 'payment_date', 'payment_id',
                'form_submission_id', 'notes'
            )
            ORDER BY column_name
        `);
        
        console.log(`   Colunas encontradas: ${participantsColumnsCheck.rows.length}/8`);
        participantsColumnsCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.column_name}`);
        });
        
        console.log('');
        
        // Verificar funções
        console.log('🔧 Verificando funções...');
        const functionsCheck = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines
            WHERE routine_name IN (
                'update_participant_registration_status',
                'create_participant_from_submission',
                'can_participate_in_classifications'
            )
            ORDER BY routine_name
        `);
        
        console.log(`   Funções encontradas: ${functionsCheck.rows.length}/3`);
        functionsCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.routine_name}`);
        });
        
        console.log('');
        
        // Verificar triggers
        console.log('⚡ Verificando triggers...');
        const triggersCheck = await client.query(`
            SELECT tgname, 
                   CASE WHEN tgenabled = 'O' THEN 'Habilitado' ELSE 'Desabilitado' END as status
            FROM pg_trigger
            WHERE tgname IN (
                'trigger_update_participant_registration_status',
                'trigger_validate_payment_consistency'
            )
            ORDER BY tgname
        `);
        
        console.log(`   Triggers encontrados: ${triggersCheck.rows.length}/2`);
        triggersCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.tgname} (${row.status})`);
        });
        
        console.log('');
        
        // Verificar view
        console.log('👁️ Verificando views...');
        const viewCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.views
            WHERE table_name = 'participants_qualified'
        `);
        
        if (viewCheck.rows.length > 0) {
            console.log('   ✅ participants_qualified criada');
        } else {
            console.log('   ❌ participants_qualified NÃO encontrada');
        }
        
        console.log('');
        
        // Contar campos no catálogo
        const catalogCount = await client.query('SELECT COUNT(*) as count FROM form_field_catalog');
        console.log(`📚 Catálogo de campos: ${catalogCount.rows[0].count} campos`);
        
        console.log('');
        console.log('================================================');
        
        // Avaliar resultado
        const totalChecks = 8 + 8 + 3 + 2 + 1 + 1; // tabelas + colunas + funções + triggers + view + catálogo
        const expectedTables = 8;
        const expectedColumns = 8;
        const expectedFunctions = 3;
        const expectedTriggers = 2;
        
        if (tablesCheck.rows.length === expectedTables &&
            participantsColumnsCheck.rows.length === expectedColumns &&
            functionsCheck.rows.length === expectedFunctions &&
            triggersCheck.rows.length === expectedTriggers &&
            viewCheck.rows.length > 0) {
            console.log('🎉 SETUP 100% COMPLETO!');
            console.log('================================================');
            console.log('');
            console.log('✅ Todas as tabelas, funções e triggers foram criadas corretamente');
            console.log('');
            console.log('📋 Próximos passos:');
            console.log('   1. Reiniciar servidor: node server.js');
            console.log('   2. Verificar logs: "✅ Rotas de Form Builder carregadas"');
            console.log('');
        } else {
            console.log('⚠️  ALGUMAS COISAS PODEM ESTAR FALTANDO');
            console.log('================================================');
            console.log('');
            console.log('💡 Execute: node scripts/setup-form-builder-complete.js');
            console.log('');
        }
        
    } catch (error) {
        console.error('');
        console.error('❌ Erro ao verificar:');
        console.error('Mensagem:', error.message);
        console.error('');
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar
verify().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

