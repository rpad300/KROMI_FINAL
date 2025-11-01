/**
 * Verificar erros de processamento no image_buffer
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkProcessingErrors() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== VERIFICAÇÃO DE ERROS DE PROCESSAMENTO ===\n');

    // Buscar registros com erro
    const { data: errors } = await supabase
        .from('image_buffer')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(5);

    if (!errors || errors.length === 0) {
        console.log('✅ Nenhum erro de processamento encontrado!');
        return;
    }

    console.log(`📋 Encontrados ${errors.length} erros recentes:\n`);

    errors.forEach((error, index) => {
        console.log(`--- ERRO ${index + 1} ---`);
        console.log('ID:', error.id.substring(0, 8) + '...');
        console.log('Criado:', new Date(error.created_at).toLocaleString('pt-PT'));
        console.log('Status:', error.status);
        
        // Verificar formato da imagem
        const hasImageData = !!error.image_data;
        const imageFormat = hasImageData 
            ? (error.image_data.startsWith('data:image') ? 'COM prefixo' : 'Base64 puro')
            : 'SEM IMAGEM';
        
        console.log('Imagem:', imageFormat);
        
        if (hasImageData) {
            console.log('Tamanho:', (error.image_data.length / 1024).toFixed(1), 'KB');
            console.log('Primeiros 20 chars:', error.image_data.substring(0, 20));
        }
        
        // Processing result completo
        if (error.processing_result) {
            console.log('Processing Result:', JSON.stringify(error.processing_result, null, 2));
        } else {
            console.log('Processing Result: NULL (não processado ainda)');
        }
        
        console.log('');
    });

    // Estatísticas
    const { data: stats } = await supabase
        .from('image_buffer')
        .select('status');

    if (stats) {
        const statusCount = stats.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});

        console.log('=== ESTATÍSTICAS ===');
        Object.entries(statusCount).forEach(([status, count]) => {
            console.log(`${status}: ${count}`);
        });
    }
}

checkProcessingErrors().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

