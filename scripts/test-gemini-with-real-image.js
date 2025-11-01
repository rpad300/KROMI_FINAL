/**
 * Testar Gemini API com imagem REAL do image_buffer
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testGeminiWithRealImage() {
    console.log('=== TESTE GEMINI COM IMAGEM REAL ===\n');

    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!apiKey) {
        console.log('❌ GEMINI_API_KEY não configurada');
        process.exit(1);
    }

    // Buscar imagem real do image_buffer
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📋 Buscando imagem real do image_buffer...');
    const { data: images } = await supabase
        .from('image_buffer')
        .select('*')
        .not('image_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!images || images.length === 0) {
        console.log('❌ Nenhuma imagem encontrada no image_buffer');
        process.exit(1);
    }

    const image = images[0];
    console.log('✅ Imagem encontrada:');
    console.log(`   ID: ${image.id.substring(0, 8)}...`);
    console.log(`   Criada: ${new Date(image.created_at).toLocaleString('pt-PT')}`);
    console.log(`   Tamanho: ${(image.image_data.length / 1024).toFixed(1)} KB`);
    console.log('');

    // Remover prefixo se existir
    let base64Image = image.image_data;
    if (base64Image.includes('base64,')) {
        base64Image = base64Image.split('base64,')[1];
    }

    console.log('📤 Enviando para Gemini...');
    console.log(`   Base64 length: ${base64Image.length}`);
    console.log(`   Primeiros 20 chars: ${base64Image.substring(0, 20)}`);
    console.log('');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Analisa esta imagem de um evento desportivo.
                                
TAREFA: Identifica o número do dorsal do atleta.

REGRAS:
- Se vires um número claro no dorsal, responde APENAS com o número (ex: "123")
- Se não conseguires ver nenhum número, responde "NONE"
- Não adiciones explicações, apenas o número ou NONE

NÚMERO DO DORSAL:`
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Image
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 50
                    }
                })
            }
        );

        console.log('📥 Resposta recebida');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log('');

        const data = await response.json();

        if (!response.ok) {
            console.log('❌ ERRO NA API');
            console.log(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        console.log('✅ SUCESSO!');
        console.log('');

        if (data.candidates && data.candidates[0]) {
            const text = data.candidates[0].content?.parts?.[0]?.text || 'Sem resposta';
            
            console.log('🎯 RESPOSTA DO GEMINI:');
            console.log('━'.repeat(50));
            console.log(text);
            console.log('━'.repeat(50));
            console.log('');

            // Tentar extrair número
            const numberMatch = text.match(/\b\d+\b/);
            if (numberMatch) {
                console.log(`✅ DORSAL DETECTADO: ${numberMatch[0]}`);
            } else if (text.includes('NONE')) {
                console.log('⚠️ Nenhum dorsal detectado na imagem');
            } else {
                console.log('❓ Resposta não contém número claro');
            }
        }

        console.log('');
        console.log('📊 Tokens usados:');
        if (data.usageMetadata) {
            console.log(`   Prompt: ${data.usageMetadata.promptTokenCount || 0}`);
            console.log(`   Resposta: ${data.usageMetadata.candidatesTokenCount || 0}`);
            console.log(`   Total: ${data.usageMetadata.totalTokenCount || 0}`);
        }

        console.log('');
        console.log('✅ GEMINI FUNCIONANDO PERFEITAMENTE!');
        console.log('   Pode processar imagens reais de dorsais.');

    } catch (error) {
        console.log('❌ ERRO:', error.message);
        process.exit(1);
    }
}

testGeminiWithRealImage().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

