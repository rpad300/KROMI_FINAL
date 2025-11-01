/**
 * Verificar formato das imagens na device_detections
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkImageFormat() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== VERIFICAÇÃO DE FORMATO DE IMAGEM ===\n');

    // Buscar um registro qualquer
    const { data: records } = await supabase
        .from('device_detections')
        .select('*')
        .limit(1);

    if (!records || records.length === 0) {
        console.log('❌ Nenhum registro encontrado');
        return;
    }

    const record = records[0];

    console.log('📋 REGISTRO:', record.id.substring(0, 8) + '...');
    console.log('Status:', record.status);
    console.log('');

    // Verificar image_data
    console.log('=== IMAGE_DATA ===');
    if (!record.image_data) {
        console.log('❌ image_data está NULL/vazio');
    } else {
        const imageData = record.image_data;
        console.log('Tipo:', typeof imageData);
        console.log('Comprimento:', imageData.length);
        console.log('Primeiros 100 chars:', imageData.substring(0, 100));
        
        // Verificar se é base64
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(imageData.substring(0, 100));
        console.log('Parece base64 puro?', isBase64);
        
        // Verificar se tem prefixo data:image
        const hasDataPrefix = imageData.startsWith('data:image');
        console.log('Tem prefixo data:image?', hasDataPrefix);
        
        // Verificar se começa com /9j/ (JPEG base64)
        const isJpegBase64 = imageData.startsWith('/9j/');
        console.log('Começa com /9j/ (JPEG base64)?', isJpegBase64);
    }

    console.log('');

    // Verificar display_image
    console.log('=== DISPLAY_IMAGE ===');
    if (!record.display_image) {
        console.log('⚠️ display_image está NULL/vazio');
    } else {
        const displayImage = record.display_image;
        console.log('Tipo:', typeof displayImage);
        console.log('Comprimento:', displayImage.length);
        console.log('Primeiros 100 chars:', displayImage.substring(0, 100));
        
        const hasDataPrefix = displayImage.startsWith('data:image');
        console.log('Tem prefixo data:image?', hasDataPrefix);
        
        const isJpegBase64 = displayImage.startsWith('/9j/');
        console.log('Começa com /9j/ (JPEG base64)?', isJpegBase64);
    }

    console.log('');

    // Comparar com formato esperado
    console.log('=== FORMATO ESPERADO ===');
    console.log('✅ image_data: base64 puro (sem prefixo data:image) para AI');
    console.log('✅ display_image: base64 puro (sem prefixo data:image) para display');
    console.log('');

    console.log('=== VERIFICAÇÃO ===');
    const imageDataOk = record.image_data && record.image_data.startsWith('/9j/');
    const displayImageOk = !record.display_image || record.display_image.startsWith('/9j/');
    
    console.log('image_data correto?', imageDataOk ? '✅' : '❌');
    console.log('display_image correto?', displayImageOk ? '✅' : '❌');
    
    if (imageDataOk && displayImageOk) {
        console.log('\n✅ FORMATO CORRETO!');
    } else {
        console.log('\n❌ FORMATO INCORRETO - precisa ajustar');
        
        if (!imageDataOk) {
            console.log('\n⚠️ image_data deveria ser base64 puro (começando com /9j/ para JPEG)');
        }
        
        if (!displayImageOk && record.display_image) {
            console.log('\n⚠️ display_image deveria ser base64 puro ou NULL');
        }
    }
}

checkImageFormat().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

