/**
 * Reprocessar TODOS os registros falhados
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function reprocessAllFailed() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== REPROCESSAR TODOS OS REGISTROS FALHADOS ===\n');

    // Buscar todos os falhados
    const { data: failed } = await supabase
        .from('device_detections')
        .select('*')
        .eq('status', 'failed');

    if (!failed || failed.length === 0) {
        console.log('✅ Nenhum registro falhado para reprocessar');
        return;
    }

    console.log(`📋 Encontrados ${failed.length} registros falhados\n`);

    let success = 0;
    let errors = 0;

    for (const record of failed) {
        console.log(`Processando ${record.id.substring(0, 8)}...`);

        // Resetar
        await supabase
            .from('device_detections')
            .update({ status: 'pending', processing_error: null, processed_at: null })
            .eq('id', record.id);

        // Processar
        const { data: result, error } = await supabase.rpc('process_device_detection', {
            p_detection_id: record.id
        });

        if (error || !result.success) {
            console.log(`   ❌ Falhou: ${error?.message || result.error}`);
            errors++;
        } else {
            console.log(`   ✅ ${result.action || 'processado'}`);
            success++;
        }
    }

    console.log('');
    console.log(`📊 RESULTADO FINAL:`);
    console.log(`   ✅ Sucesso: ${success}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📝 Total: ${failed.length}`);
}

reprocessAllFailed().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

