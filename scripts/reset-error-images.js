/**
 * Resetar imagens com erro para reprocessamento
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function resetErrorImages() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== RESET DE IMAGENS COM ERRO ===\n');

    // Buscar imagens com erro
    const { data: errors } = await supabase
        .from('image_buffer')
        .select('id, created_at, processing_result')
        .eq('status', 'error')
        .order('created_at', { ascending: false });

    if (!errors || errors.length === 0) {
        console.log('✅ Nenhuma imagem com erro para resetar');
        return;
    }

    console.log(`📋 Encontradas ${errors.length} imagens com erro\n`);

    // Mostrar resumo
    errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.id.substring(0, 8)}... - ${new Date(error.created_at).toLocaleTimeString('pt-PT')}`);
    });

    console.log('\n📤 Resetando para status "pending"...\n');

    // Resetar todas para pending
    const { data: updated, error: updateError } = await supabase
        .from('image_buffer')
        .update({
            status: 'pending',
            processing_result: null
        })
        .eq('status', 'error')
        .select();

    if (updateError) {
        console.error('❌ Erro ao resetar:', updateError);
        process.exit(1);
    }

    console.log(`✅ ${updated.length} imagens resetadas para "pending"`);
    console.log('');
    console.log('🔄 O BackgroundProcessor vai reprocessá-las automaticamente');
    console.log('   (usando as API keys do .env que funcionam)');
    console.log('');
    console.log('📊 Acompanhe em: https://192.168.1.219:1144/image-processor-kromi.html');
}

resetErrorImages().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

