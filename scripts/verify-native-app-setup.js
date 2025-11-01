/**
 * ============================================================================
 * KROMI - Verificar Setup da App Nativa
 * ============================================================================
 * Script que verifica se tudo está configurado corretamente
 * ============================================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const checks = {
    table: false,
    view: false,
    functions: false,
    triggers: false
};

async function checkTable() {
    try {
        const { data, error } = await supabase
            .from('device_detections')
            .select('id')
            .limit(1);
        
        if (error && error.code === '42P01') {
            console.log('❌ Tabela device_detections não existe');
            return false;
        }
        
        if (error) {
            console.log(`⚠️ Erro ao verificar tabela: ${error.message}`);
            return false;
        }
        
        console.log('✅ Tabela device_detections existe');
        return true;
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        return false;
    }
}

async function checkView() {
    try {
        const { data, error } = await supabase
            .from('device_qr_info')
            .select('access_code')
            .limit(1);
        
        if (error && error.message.includes('does not exist')) {
            console.log('❌ View device_qr_info não existe');
            return false;
        }
        
        if (error) {
            console.log(`⚠️ Erro ao verificar view: ${error.message}`);
            return false;
        }
        
        console.log('✅ View device_qr_info existe');
        return true;
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        return false;
    }
}

async function checkFunctions() {
    const functions = [
        'save_device_detection',
        'get_device_info_by_qr',
        'process_device_detection',
        'process_pending_detections'
    ];
    
    let allExist = true;
    
    for (const funcName of functions) {
        try {
            // Tentar chamar a função (mesmo que falhe, confirma que existe)
            const { error } = await supabase.rpc(funcName, {});
            
            if (error) {
                // Se erro é "does not exist", função não existe
                if (error.message && error.message.includes('does not exist')) {
                    console.log(`❌ Função ${funcName} não existe`);
                    allExist = false;
                } else {
                    // Outro erro significa que função existe mas parâmetros estão errados (OK)
                    console.log(`✅ Função ${funcName} existe`);
                }
            } else {
                console.log(`✅ Função ${funcName} existe`);
            }
        } catch (error) {
            console.log(`⚠️ Erro ao verificar ${funcName}: ${error.message}`);
            allExist = false;
        }
    }
    
    return allExist;
}

async function checkEventDevices() {
    try {
        const { data, error } = await supabase
            .from('event_devices')
            .select('access_code')
            .limit(1);
        
        if (error) {
            console.log(`⚠️ Erro ao verificar event_devices: ${error.message}`);
            return false;
        }
        
        console.log('✅ Tabela event_devices acessível');
        
        // Verificar se tem dispositivos com access_code
        const { count } = await supabase
            .from('event_devices')
            .select('*', { count: 'exact', head: true })
            .not('access_code', 'is', null);
        
        console.log(`   ${count || 0} dispositivos com QR code gerado`);
        
        return true;
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        return false;
    }
}

async function runChecks() {
    console.log('🔍 Verificando setup da app nativa...\n');
    
    console.log('1️⃣ Verificando tabela device_detections...');
    checks.table = await checkTable();
    console.log('');
    
    console.log('2️⃣ Verificando view device_qr_info...');
    checks.view = await checkView();
    console.log('');
    
    console.log('3️⃣ Verificando funções RPC...');
    checks.functions = await checkFunctions();
    console.log('');
    
    console.log('4️⃣ Verificando event_devices...');
    await checkEventDevices();
    console.log('');
    
    // Resumo
    console.log('📊 Resumo:');
    console.log('================================');
    
    if (checks.table && checks.view && checks.functions) {
        console.log('✅ Tudo configurado corretamente!');
        console.log('');
        console.log('📋 Próximos passos:');
        console.log('   1. Reiniciar servidor: node server.js');
        console.log('   2. Verificar logs do processador');
        console.log('   3. Testar com app nativa');
    } else {
        console.log('❌ Algumas configurações estão faltando');
        console.log('');
        console.log('📋 Execute os scripts SQL no Supabase:');
        console.log('   1. sql/native-app-qr-code-system.sql');
        console.log('   2. sql/native-app-detections-table.sql');
        console.log('   3. sql/auto-fill-device-info-on-create.sql');
    }
}

runChecks().catch(console.error);

