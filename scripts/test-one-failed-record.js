/**
 * Test one failed record - Debug completo
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testFailedRecord() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== TESTE DE REGISTRO FALHADO ===\n');

    // 1. Buscar um registro falhado
    console.log('📋 PASSO 1: Buscar registro falhado...');
    const { data: failedRecords, error: fetchError } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'failed')
        .limit(1);

    if (fetchError) {
        console.error('❌ Erro ao buscar registro:', fetchError);
        process.exit(1);
    }

    if (!failedRecords || failedRecords.length === 0) {
        console.log('✅ Nenhum registro falhado encontrado');
        process.exit(0);
    }

    const record = failedRecords[0];
    console.log(`✅ Registro encontrado: ${record.id}`);
    console.log(`   Access Code: ${record.access_code}`);
    console.log(`   Session ID: ${record.session_id}`);
    console.log(`   Dorsal: ${record.dorsal_number || 'NULL'}`);
    console.log(`   Latitude: ${record.latitude}`);
    console.log(`   Longitude: ${record.longitude}`);
    console.log(`   Captured At: ${record.captured_at}`);
    console.log(`   Error: ${record.processing_error}`);
    console.log('');

    // 2. Verificar se o access_code existe em event_devices
    console.log('📋 PASSO 2: Verificar event_devices...');
    const { data: eventDevices, error: edError } = await supabase
        .from('event_devices')
        .select(`
            access_code,
            device_id,
            event_id,
            checkpoint_name,
            checkpoint_type,
            checkpoint_order,
            events (
                id,
                name,
                status
            ),
            devices (
                id
            )
        `)
        .eq('access_code', record.access_code)
        .limit(1);

    if (edError) {
        console.error('❌ Erro ao buscar event_devices:', edError);
        process.exit(1);
    }

    if (!eventDevices || eventDevices.length === 0) {
        console.error(`❌ PROBLEMA: Nenhum event_device encontrado para access_code: ${record.access_code}`);
        console.error('   >>> PROBLEMA É DOS DADOS RECEBIDOS - access_code inválido!');
        process.exit(1);
    }

    const eventDevice = eventDevices[0];
    console.log(`✅ event_device encontrado:`);
    console.log(`   Device ID: ${eventDevice.device_id} (tipo: ${typeof eventDevice.device_id})`);
    console.log(`   Event ID: ${eventDevice.event_id} (tipo: ${typeof eventDevice.event_id})`);
    console.log(`   Checkpoint: ${eventDevice.checkpoint_name} (${eventDevice.checkpoint_type})`);
    console.log(`   Event Name: ${eventDevice.events?.name || 'N/A'}`);
    console.log(`   Event Status: ${eventDevice.events?.status || 'N/A'}`);
    console.log('');

    // 3. Validar dados
    console.log('📋 PASSO 3: Validar dados recebidos...');
    let hasErrors = false;

    if (!eventDevice.device_id) {
        console.error('   ❌ device_id é NULL em event_devices');
        hasErrors = true;
    } else {
        console.log('   ✅ device_id existe');
    }

    if (!eventDevice.event_id) {
        console.error('   ❌ event_id é NULL em event_devices');
        hasErrors = true;
    } else {
        console.log('   ✅ event_id existe');
    }

    if (eventDevice.events?.status !== 'active') {
        console.warn(`   ⚠️  Evento não está ativo: ${eventDevice.events?.status}`);
    } else {
        console.log('   ✅ Evento ativo');
    }

    console.log('');

    if (hasErrors) {
        console.error('❌ PROBLEMA É DOS DADOS: event_devices tem dados inválidos!');
        process.exit(1);
    }

    // 4. Testar processamento
    console.log('📋 PASSO 4: Tentar processar o registro...');
    console.log(`   Chamando process_device_detection('${record.id}')...`);
    console.log('');

    const { data: result, error: procError } = await supabase.rpc('process_device_detection', {
        p_detection_id: record.id
    });

    if (procError) {
        console.error('❌ ERRO ao processar:');
        console.error(`   Mensagem: ${procError.message}`);
        console.error(`   Details: ${procError.details || 'N/A'}`);
        console.error(`   Hint: ${procError.hint || 'N/A'}`);
        console.error(`   Code: ${procError.code || 'N/A'}`);
        console.error('');
        console.error('>>> PROBLEMA É DO NOSSO LADO (função PostgreSQL)!');
        process.exit(1);
    }

    console.log('📊 RESULTADO DO PROCESSAMENTO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (result.success) {
        console.log('✅ PROCESSAMENTO FUNCIONOU!');
        console.log(`   Ação: ${result.action}`);
        console.log(`   Mensagem: ${result.message}`);
    } else {
        console.error('❌ PROCESSAMENTO FALHOU:');
        console.error(`   Erro: ${result.error}`);
    }

    console.log('');
    console.log('=== FIM DO TESTE ===');
}

testFailedRecord().catch(error => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
});

