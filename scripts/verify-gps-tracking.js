/**
 * ============================================================================
 * VISIONKRONO - Verificar Instalação do GPS Tracking Module
 * ============================================================================
 * Verifica se todas as tabelas, funções e views foram criadas corretamente
 * ============================================================================
 */

const { Pool } = require('pg');
const path = require('path');

// Carregar .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_POSTGRES_URL;

if (!dbUrl) {
    console.error('❌ DATABASE_URL não configurado no .env');
    process.exit(1);
}

async function verify() {
    const pool = new Pool({
        connectionString: dbUrl.replace('postgres://', 'postgresql://'),
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await actualVerify(pool);
    } finally {
        await pool.end();
    }
}

async function actualVerify(pool) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  📍 Verificando Instalação GPS Tracking');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    try {
        // Verificar tabelas
        console.log('📋 Verificando Tabelas...');
        const tables = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE tablename LIKE 'track_%' 
            AND schemaname = 'public'
            ORDER BY tablename
        `);
        
        const expectedTables = [
            'track_activities',
            'track_activity_checkpass',
            'track_audit_log',
            'track_checks',
            'track_device_registry',
            'track_device_session',
            'track_gps_live',
            'track_ingest_errors',
            'track_inbox_messages',
            'track_participant_access',
            'track_participant_qr',
            'track_routes'
        ];
        
        const foundTables = tables.rows.map(r => r.tablename);
        
        expectedTables.forEach(table => {
            if (foundTables.includes(table)) {
                console.log(`   ✅ ${table}`);
            } else {
                console.log(`   ❌ ${table} - NÃO ENCONTRADA`);
            }
        });
        
        console.log('');
        console.log(`   Total: ${foundTables.length}/12 tabelas`);
        console.log('');
        
        // Verificar funções
        console.log('⚙️  Verificando Funções/RPCs...');
        const functions = await pool.query(`
            SELECT proname as function_name
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND proname LIKE 'track_%'
            ORDER BY proname
        `);
        
        const expectedFunctions = [
            'track_arm_activity',
            'track_cleanup_old_messages',
            'track_discard_activity',
            'track_finish_activity',
            'track_get_live_positions',
            'track_get_participant_by_qr',
            'track_get_rankings',
            'track_inbox_stats',
            'track_issue_qr',
            'track_migrate_existing_qrs',
            'track_pause_activity',
            'track_process_activity_event',
            'track_process_gps_batch',
            'track_process_heartbeat',
            'track_process_inbox_messages',
            'track_resume_activity',
            'track_retry_failed_messages',
            'track_submit_gps_batch',
            'track_submit_message',
            'track_validate_qr'
        ];
        
        const foundFunctions = functions.rows.map(r => r.function_name);
        const uniqueFunctions = [...new Set(foundFunctions)]; // Remover duplicados (overloads)
        
        expectedFunctions.forEach(func => {
            if (foundFunctions.includes(func)) {
                console.log(`   ✅ ${func}`);
            } else {
                console.log(`   ❌ ${func} - NÃO ENCONTRADA`);
            }
        });
        
        console.log('');
        console.log(`   Total: ${uniqueFunctions.length} funções encontradas`);
        console.log('');
        
        // Verificar views
        console.log('👁️  Verificando Views...');
        const views = await pool.query(`
            SELECT viewname 
            FROM pg_views 
            WHERE viewname LIKE '%track%' 
            AND schemaname = 'public'
            ORDER BY viewname
        `);
        
        const expectedViews = [
            'v_track_activities_summary',
            'v_track_active_qrs',
            'v_track_participant_qr_context',
            'v_track_route_stats'
        ];
        
        const foundViews = views.rows.map(r => r.viewname);
        
        expectedViews.forEach(view => {
            if (foundViews.includes(view)) {
                console.log(`   ✅ ${view}`);
            } else {
                console.log(`   ❌ ${view} - NÃO ENCONTRADA`);
            }
        });
        
        console.log('');
        console.log(`   Total: ${foundViews.length}/4 views`);
        console.log('');
        
        // Testar função básica
        console.log('🧪 Testando Funcionalidade Básica...');
        
        try {
            const statsResult = await pool.query('SELECT * FROM track_inbox_stats()');
            console.log('   ✅ track_inbox_stats() - Funcionando');
            
            if (statsResult.rows.length > 0) {
                console.log('');
                console.log('   📊 Estatísticas da Inbox:');
                statsResult.rows.forEach(row => {
                    console.log(`      ${row.metric}: ${row.value}`);
                });
            }
        } catch (error) {
            console.log('   ❌ track_inbox_stats() - Erro:', error.message);
        }
        
        console.log('');
        
        // Verificar dados demo (se houver)
        console.log('📦 Verificando Dados Demo...');
        const demoRoutes = await pool.query('SELECT COUNT(*) as count FROM track_routes');
        const demoQRs = await pool.query('SELECT COUNT(*) as count FROM track_participant_access');
        const demoActivities = await pool.query('SELECT COUNT(*) as count FROM track_activities');
        
        console.log(`   Rotas: ${demoRoutes.rows[0].count}`);
        console.log(`   QRs: ${demoQRs.rows[0].count}`);
        console.log(`   Atividades: ${demoActivities.rows[0].count}`);
        
        if (demoRoutes.rows[0].count > 0) {
            console.log('   ✅ Dados demo carregados');
        } else {
            console.log('   ℹ️  Sem dados demo (normal)');
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('  VERIFICAÇÃO CONCLUÍDA!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        
        if (foundTables.length === 12 && uniqueFunctions.length >= 15 && foundViews.length === 4) {
            console.log('✅ GPS Tracking Module instalado corretamente!');
            console.log('');
            console.log('📱 Próximos passos:');
            console.log('   1. Configurar scheduler para processar inbox');
            console.log('   2. Consultar MOBILE_APP_INBOX_README.md');
            console.log('   3. Desenvolver app móvel');
        } else {
            console.log('⚠️  Alguns componentes estão faltando.');
            console.log('   Execute: node scripts/setup-gps-tracking-complete.js');
        }
        
        console.log('');
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
        throw error;
    }
}

verify().catch(error => {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
});

