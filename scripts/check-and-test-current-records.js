/**
 * Verificar registros atuais e testar processamento
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAndTest() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== VERIFICAÇÃO DE REGISTROS NA TABELA ===\n');

    // Contar registros por status
    const { data: stats, error: statsError } = await supabase
        .from('device_detections')
        .select('status', { count: 'exact' });

    if (statsError) {
        console.error('❌ Erro ao buscar estatísticas:', statsError);
        process.exit(1);
    }

    const statusCount = {};
    stats.forEach(record => {
        statusCount[record.status] = (statusCount[record.status] || 0) + 1;
    });

    console.log('📊 ESTATÍSTICAS:');
    console.log(`   Total de registros: ${stats.length}`);
    Object.keys(statusCount).forEach(status => {
        console.log(`   - ${status}: ${statusCount[status]}`);
    });
    console.log('');

    // Buscar registros pendentes
    const { data: pending } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (pending && pending.length > 0) {
        console.log(`📋 ${pending.length} REGISTRO(S) PENDENTE(S):`);
        pending.forEach((record, i) => {
            console.log(`   ${i + 1}. ID: ${record.id.substring(0, 8)}... | Dorsal: ${record.dorsal_number || 'NULL'} | ${record.created_at}`);
        });
        console.log('');
    }

    // Buscar registros processados
    const { data: processed } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'processed')
        .order('processed_at', { ascending: false })
        .limit(5);

    if (processed && processed.length > 0) {
        console.log(`✅ ÚLTIMOS ${processed.length} REGISTROS PROCESSADOS:`);
        processed.forEach((record, i) => {
            const result = record.processing_result || {};
            console.log(`   ${i + 1}. ID: ${record.id.substring(0, 8)}... | Ação: ${result.action || 'N/A'} | ${record.processed_at}`);
        });
        console.log('');
    }

    // Buscar registros falhados
    const { data: failed } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (failed && failed.length > 0) {
        console.log(`❌ ${failed.length} REGISTRO(S) FALHADO(S):`);
        failed.forEach((record, i) => {
            console.log(`   ${i + 1}. ID: ${record.id.substring(0, 8)}... | Erro: ${record.processing_error?.substring(0, 50)}... | ${record.created_at}`);
        });
        console.log('');
    }

    // Testar processamento de registros pendentes
    if (pending && pending.length > 0) {
        console.log('🧪 TESTANDO PROCESSAMENTO DE UM REGISTRO PENDENTE...\n');
        const testRecord = pending[0];
        
        console.log(`   Registro: ${testRecord.id}`);
        console.log(`   Access Code: ${testRecord.access_code}`);
        console.log(`   Dorsal: ${testRecord.dorsal_number || 'NULL'}`);
        console.log('');

        const { data: result, error: procError } = await supabase.rpc('process_device_detection', {
            p_detection_id: testRecord.id
        });

        if (procError) {
            console.error('   ❌ ERRO ao processar:');
            console.error(`      ${procError.message}`);
        } else {
            console.log('   📊 RESULTADO:');
            console.log(JSON.stringify(result, null, 6));
            console.log('');
            
            if (result.success) {
                console.log('   ✅ PROCESSAMENTO BEM SUCEDIDO!');
                console.log(`      Ação: ${result.action}`);
                console.log(`      Mensagem: ${result.message}`);
            } else {
                console.error('   ❌ PROCESSAMENTO FALHOU:');
                console.error(`      Erro: ${result.error}`);
            }
        }
    } else if (failed && failed.length > 0) {
        console.log('🧪 TESTANDO REPROCESSAMENTO DE UM REGISTRO FALHADO...\n');
        const testRecord = failed[0];
        
        console.log(`   Registro: ${testRecord.id}`);
        console.log(`   Erro anterior: ${testRecord.processing_error}`);
        console.log('');

        // Resetar para pending
        await supabase
            .from('device_detections')
            .update({ status: 'pending', processing_error: null, processed_at: null })
            .eq('id', testRecord.id);

        console.log('   ✅ Resetado para pending');
        console.log('');

        const { data: result, error: procError } = await supabase.rpc('process_device_detection', {
            p_detection_id: testRecord.id
        });

        if (procError) {
            console.error('   ❌ ERRO ao processar:');
            console.error(`      ${procError.message}`);
        } else {
            console.log('   📊 RESULTADO:');
            console.log(JSON.stringify(result, null, 6));
            console.log('');
            
            if (result.success) {
                console.log('   ✅ REPROCESSAMENTO BEM SUCEDIDO!');
                console.log(`      Ação: ${result.action}`);
                console.log(`      Mensagem: ${result.message}`);
            } else {
                console.error('   ❌ REPROCESSAMENTO FALHOU:');
                console.error(`      Erro: ${result.error}`);
            }
        }
    } else {
        console.log('ℹ️  Nenhum registro para testar (todos já foram processados)');
    }

    console.log('');
    console.log('=== FIM DA VERIFICAÇÃO ===');
}

checkAndTest().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

