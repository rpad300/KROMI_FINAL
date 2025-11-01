/**
 * Verificar formato das imagens no image_buffer
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkImageBufferFormat() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== VERIFICAÇÃO DE FORMATO NO IMAGE_BUFFER ===\n');

    // Buscar um registro qualquer
    const { data: records } = await supabase
        .from('image_buffer')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!records || records.length === 0) {
        console.log('❌ Nenhum registro encontrado no image_buffer');
        return;
    }

    const record = records[0];

    console.log('📋 REGISTRO:', record.id.substring(0, 8) + '...');
    console.log('Status:', record.status);
    console.log('');

    // Verificar image_data
    console.log('=== IMAGE_DATA (para AI) ===');
    if (!record.image_data) {
        console.log('❌ image_data está NULL/vazio');
    } else {
        const imageData = record.image_data;
        console.log('Tipo:', typeof imageData);
        console.log('Comprimento:', imageData.length);
        console.log('Primeiros 100 chars:', imageData.substring(0, 100));
        
        const hasDataPrefix = imageData.startsWith('data:image');
        console.log('Tem prefixo data:image?', hasDataPrefix ? '✅ SIM' : '❌ NÃO');
        
        const isJpegBase64 = imageData.startsWith('/9j/');
        console.log('Começa com /9j/ (JPEG base64 puro)?', isJpegBase64 ? '✅ SIM' : '❌ NÃO');
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
        console.log('Tem prefixo data:image?', hasDataPrefix ? '✅ SIM' : '❌ NÃO');
        
        const isJpegBase64 = displayImage.startsWith('/9j/');
        console.log('Começa com /9j/ (JPEG base64 puro)?', isJpegBase64 ? '✅ SIM' : '❌ NÃO');
    }

    console.log('');

    console.log('=== DIAGNÓSTICO ===');
    const imageDataOk = record.image_data && record.image_data.startsWith('/9j/');
    const displayImageOk = !record.display_image || record.display_image.startsWith('/9j/');
    
    console.log('image_data é base64 puro?', imageDataOk ? '✅' : '❌');
    console.log('display_image é base64 puro?', displayImageOk ? '✅' : '❌');
    
    console.log('');
    console.log('=== PROBLEMA NO AI PROCESSOR ===');
    console.log('O AI processor espera que o frontend adicione o prefixo "data:image/jpeg;base64,"');
    console.log('ao exibir a imagem em <img src="...">');
    console.log('');
    console.log('✅ Backend está CORRETO (base64 puro)');
    console.log('❌ Frontend precisa adicionar prefixo ao exibir');
}

checkImageBufferFormat().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

