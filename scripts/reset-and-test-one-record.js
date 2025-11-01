/**
 * Reset one failed record to pending and test processing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function resetAndTestRecord() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== RESET E TESTE DE REGISTRO FALHADO ===\n');

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
    console.log(`   Status atual: ${record.status}`);
    console.log(`   Erro anterior: ${record.processing_error}`);
    console.log('');

    // 2. Resetar status para pending
    console.log('📋 PASSO 2: Resetar status para pending...');
    const { error: updateError } = await supabase
        .from('device_detections')
        .update({
            status: 'pending',
            processing_error: null,
            processed_at: null,
            processing_result: null
        })
        .eq('id', record.id);

    if (updateError) {
        console.error('❌ Erro ao resetar status:', updateError);
        process.exit(1);
    }

    console.log('✅ Status resetado para pending');
    console.log('');

    // 3. Aguardar um momento
    console.log('⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // 4. Tentar processar
    console.log('📋 PASSO 3: Processar o registro...');
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
        
        // Verificar se é o erro de UUID
        if (procError.message && procError.message.includes('device_id')) {
            console.error('>>> CONFIRMADO: Erro de tipo UUID ainda persiste!');
            console.error('>>> O problema está na nossa função process_device_detection');
            console.error('');
            console.error('ANÁLISE:');
            console.error(`- Device ID vem como: ${typeof eventDevice?.device_id} (${eventDevice?.device_id})`);
            console.error(`- Coluna device_id espera: UUID`);
            console.error('- O problema pode estar no UPDATE mesmo com subqueries');
        }
        
        process.exit(1);
    }

    console.log('📊 RESULTADO DO PROCESSAMENTO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (result.success) {
        console.log('✅ PROCESSAMENTO FUNCIONOU!');
        console.log(`   Ação: ${result.action}`);
        console.log(`   Mensagem: ${result.message}`);
        console.log('');
        console.log('>>> A CORREÇÃO ESTÁ A FUNCIONAR! 🎉');
    } else {
        console.error('❌ PROCESSAMENTO FALHOU:');
        console.error(`   Erro: ${result.error}`);
        console.error('');
        console.error('>>> O problema persiste na função PostgreSQL');
    }

    console.log('');
    console.log('=== FIM DO TESTE ===');
}

resetAndTestRecord().catch(error => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
});

