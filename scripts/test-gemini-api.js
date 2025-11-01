/**
 * Testar Gemini API Key
 */

require('dotenv').config();

async function testGeminiAPI() {
    console.log('=== TESTE DA GEMINI API ===\n');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('❌ GEMINI_API_KEY não está configurada no .env');
        process.exit(1);
    }

    console.log('✅ GEMINI_API_KEY encontrada');
    console.log(`   Key preview: ${apiKey.substring(0, 15)}...`);
    console.log('');

    // Criar imagem de teste em base64 (pequeno quadrado vermelho 10x10)
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCKAAf/2Q==';

    console.log('📤 Enviando requisição de teste para Gemini...');
    console.log('   Modelo: gemini-2.0-flash-exp');
    console.log('   Prompt: "Qual o número do dorsal nesta imagem?"');
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
                                text: "Qual o número do dorsal nesta imagem? Responde apenas com o número, nada mais."
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: testImageBase64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 10
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
            console.log('');
            console.log('Resposta completa:');
            console.log(JSON.stringify(data, null, 2));
            console.log('');

            // Analisar erro específico
            if (data.error) {
                if (data.error.message?.includes('API key')) {
                    console.log('🔑 PROBLEMA: API Key inválida ou expirada');
                    console.log('   Solução: Gerar nova key em https://aistudio.google.com/app/apikey');
                } else if (data.error.message?.includes('quota')) {
                    console.log('💰 PROBLEMA: Quota excedida');
                    console.log('   Solução: Aguardar reset ou aumentar quota');
                } else if (data.error.message?.includes('permission')) {
                    console.log('🔐 PROBLEMA: Permissões insuficientes');
                    console.log('   Solução: Verificar permissões da API key');
                } else {
                    console.log('⚠️ PROBLEMA:', data.error.message);
                }
            }
            process.exit(1);
        }

        console.log('✅ API FUNCIONANDO!');
        console.log('');
        
        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            const text = candidate.content?.parts?.[0]?.text || 'Sem resposta';
            
            console.log('📝 Resposta da API:');
            console.log(`   "${text}"`);
            console.log('');
            
            if (candidate.finishReason) {
                console.log(`   Finish Reason: ${candidate.finishReason}`);
            }
            
            if (candidate.safetyRatings) {
                console.log('');
                console.log('🛡️ Safety Ratings:');
                candidate.safetyRatings.forEach(rating => {
                    console.log(`   ${rating.category}: ${rating.probability}`);
                });
            }
        }

        console.log('');
        console.log('📊 Metadados da Resposta:');
        if (data.usageMetadata) {
            console.log(`   Prompt tokens: ${data.usageMetadata.promptTokenCount || 0}`);
            console.log(`   Response tokens: ${data.usageMetadata.candidatesTokenCount || 0}`);
            console.log(`   Total tokens: ${data.usageMetadata.totalTokenCount || 0}`);
        }

        console.log('');
        console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
        console.log('   A Gemini API está funcionando corretamente.');
        console.log('   Pode ser usada para processar imagens de dorsais.');

    } catch (error) {
        console.log('❌ ERRO AO FAZER REQUISIÇÃO');
        console.log('');
        console.log('Erro:', error.message);
        console.log('');
        
        if (error.message.includes('fetch')) {
            console.log('🌐 PROBLEMA: Erro de rede');
            console.log('   Solução: Verificar conexão com internet');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('🌐 PROBLEMA: DNS não resolveu');
            console.log('   Solução: Verificar conexão e DNS');
        }
        
        console.log('');
        console.log('Stack:', error.stack);
        process.exit(1);
    }
}

testGeminiAPI().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

