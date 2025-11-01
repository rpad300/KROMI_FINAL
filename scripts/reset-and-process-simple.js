/**
 * Reset failed e processar com processador simples
 */

const { createClient } = require('@supabase/supabase-js');
const DeviceDetectionProcessorSimple = require('../src/device-detection-processor-simple');
require('dotenv').config();

async function resetAndProcess() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== RESET E PROCESSAMENTO SIMPLES ===\n');

    // Buscar falhados
    const { data: failed } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'failed');

    if (!failed || failed.length === 0) {
        console.log('✅ Nenhum registro falhado');
        return;
    }

    console.log(`📋 ${failed.length} registros falhados encontrados\n`);

    // Resetar todos para pending
    const { error: resetError } = await supabase
        .from('device_detections')
        .update({
            status: 'pending',
            processing_error: null,
            processed_at: null
        })
        .eq('status', 'failed');

    if (resetError) {
        console.error('❌ Erro ao resetar:', resetError);
        return;
    }

    console.log('✅ Registros resetados para pending\n');
    console.log('📋 Processando com processador simples...\n');

    // Processar
    const processor = new DeviceDetectionProcessorSimple();
    await processor.init();
    await processor.processPendingDetections();

    console.log('\n=== VERIFICAÇÃO FINAL ===\n');

    // Verificar status final
    const { data: stats } = await supabase
        .from('device_detections')
        .select('status');

    const statusCount = {};
    stats.forEach(r => {
        statusCount[r.status] = (statusCount[r.status] || 0) + 1;
    });

    console.log('Status dos registros:');
    Object.keys(statusCount).forEach(status => {
        console.log(`   ${status}: ${statusCount[status]}`);
    });

    console.log('\n✅ Concluído!');
}

resetAndProcess().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

