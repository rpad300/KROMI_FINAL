/**
 * Test directly without waiting - stop DeviceDetectionProcessor first
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testDirect() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== TESTE DIRETO (sem espera) ===\n');

    // Buscar um registro falhado
    const { data: failedRecords } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'failed')
        .limit(1);

    if (!failedRecords || failedRecords.length === 0) {
        console.log('✅ Nenhum registro falhado - todos foram processados!');
        process.exit(0);
    }

    const record = failedRecords[0];
    console.log(`Registro: ${record.id}`);
    console.log(`Erro anterior: ${record.processing_error}\n`);

    // Resetar
    await supabase
        .from('device_detections')
        .update({
            status: 'pending',
            processing_error: null,
            processed_at: null
        })
        .eq('id', record.id);

    console.log('✅ Resetado para pending\n');

    // Processar IMEDIATAMENTE (antes do processor em background)
    console.log('📋 Processando IMEDIATAMENTE...\n');
    
    const { data: result, error: procError } = await supabase.rpc('process_device_detection', {
        p_detection_id: record.id
    });

    if (procError) {
        console.error('❌ ERRO:');
        console.error(JSON.stringify(procError, null, 2));
        console.error('\n>>> ERRO PERSISTE!\n');
        process.exit(1);
    }

    console.log('📊 RESULTADO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (result.success) {
        console.log('✅✅✅ FUNCIONOU! A CORREÇÃO ESTÁ A TRABALHAR! 🎉🎉🎉\n');
    } else {
        console.error(`❌ Falhou: ${result.error}\n`);
    }
}

testDirect().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

