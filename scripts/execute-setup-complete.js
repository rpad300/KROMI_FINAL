/**
 * ============================================================================
 * KROMI - Executar Setup Completo da App Nativa
 * ============================================================================
 * Este script tenta executar o SQL SETUP-COMPLETO-APP-NATIVA.sql automaticamente
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

if (!dbUrl) {
    console.error('❌ Nenhuma connection string de Postgres configurada!');
    console.error('');
    console.error('📋 Configure uma destas variáveis no .env:');
    console.error('   - SUPABASE_DB_URL');
    console.error('   - DATABASE_URL');
    console.error('   - POSTGRES_URL');
    console.error('   - SUPABASE_POSTGRES_URL');
    console.error('');
    console.error('💡 Ou execute manualmente no Supabase Dashboard:');
    console.error('   Arquivo: sql/SETUP-COMPLETO-APP-NATIVA.sql');
    process.exit(1);
}

// Ler arquivo SQL
const sqlFile = path.join(__dirname, '..', 'sql', 'SETUP-COMPLETO-APP-NATIVA.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🚀 Executando setup completo da app nativa...');
console.log('');
console.log('📁 Arquivo:', sqlFile);
console.log('🔗 Database:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Ocultar senha
console.log('');

// Criar pool de conexão
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { 
        rejectUnauthorized: false,
        require: true
    }
});

async function executeSQL() {
    const client = await pool.connect();
    
    try {
        console.log('▶️  Executando SQL...');
        console.log('   (Isso pode levar alguns segundos)');
        console.log('');
        
        // Executar SQL
        await client.query(sql);
        
        console.log('✅ SQL executado com sucesso!');
        console.log('');
        
        // Verificar resultado
        console.log('🔍 Verificando resultado...');
        
        const checks = await Promise.all([
            client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_detections') as existe"),
            client.query("SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'device_qr_info') as existe"),
            client.query("SELECT COUNT(*) as count FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('save_device_detection', 'get_device_info_by_qr', 'process_device_detection', 'process_pending_detections')")
        ]);
        
        const tableExists = checks[0].rows[0].existe;
        const viewExists = checks[1].rows[0].existe;
        const functionsCount = parseInt(checks[2].rows[0].count);
        
        console.log('');
        console.log('📊 Resultado:');
        console.log('================================');
        console.log(`Tabela device_detections: ${tableExists ? '✅ CRIADA' : '❌ NÃO CRIADA'}`);
        console.log(`View device_qr_info: ${viewExists ? '✅ CRIADA' : '❌ NÃO CRIADA'}`);
        console.log(`Funções RPC: ${functionsCount}/4`);
        console.log('================================');
        console.log('');
        
        if (tableExists && viewExists && functionsCount === 4) {
            console.log('🎉 SETUP COMPLETO! Tudo criado com sucesso!');
            console.log('');
            console.log('📋 Próximos passos:');
            console.log('   1. Reiniciar servidor: node server.js');
            console.log('   2. Verificar logs para confirmar processador ativo');
            console.log('   3. Testar criação de dispositivo');
        } else {
            console.log('⚠️  Algumas coisas podem estar faltando.');
            console.log('   Verifique os erros acima.');
        }
        
    } catch (error) {
        console.error('');
        console.error('❌ Erro ao executar SQL:', error.message);
        console.error('');
        
        if (error.message.includes('does not exist')) {
            console.error('💡 Dica: Certifique-se que as tabelas base existem:');
            console.error('   - events');
            console.error('   - devices');
            console.error('   - event_devices');
            console.error('   - detections');
            console.error('   - image_buffer');
        }
        
        if (error.message.includes('permission denied')) {
            console.error('💡 Dica: Use Service Role Key ou credenciais com permissões adequadas');
        }
        
        console.error('');
        console.error('📋 Solução Alternativa:');
        console.error('   Execute manualmente no Supabase Dashboard → SQL Editor');
        console.error('   Arquivo: sql/SETUP-COMPLETO-APP-NATIVA.sql');
        
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar
executeSQL().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

