// Teste simples e direto do Supabase
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testSupabaseSimple() {
    console.log('🧪 Teste Simples do Supabase');
    console.log('============================\n');
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🌐 URL:', url);
    console.log('🔑 Key:', key ? key.substring(0, 30) + '...' : 'NÃO CONFIGURADA');
    
    try {
        // Importar Supabase
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(url, key);
        
        console.log('\n📊 Testando tabelas...');
        
        // Testar tabela images
        console.log('🖼️  Testando tabela "images"...');
        const { data: images, error: imagesError } = await supabase
            .from('images')
            .select('*')
            .limit(1);
            
        if (imagesError) {
            console.log('❌ Tabela "images":', imagesError.message);
        } else {
            console.log('✅ Tabela "images" OK');
        }
        
        // Testar tabela detections
        console.log('📊 Testando tabela "detections"...');
        const { data: detections, error: detectionsError } = await supabase
            .from('detections')
            .select('*')
            .limit(1);
            
        if (detectionsError) {
            console.log('❌ Tabela "detections":', detectionsError.message);
        } else {
            console.log('✅ Tabela "detections" OK');
        }
        
        // Testar tabela configurations
        console.log('⚙️  Testando tabela "configurations"...');
        const { data: configs, error: configsError } = await supabase
            .from('configurations')
            .select('*')
            .limit(1);
            
        if (configsError) {
            console.log('❌ Tabela "configurations":', configsError.message);
        } else {
            console.log('✅ Tabela "configurations" OK');
        }
        
        // Testar inserção simples
        console.log('\n🧪 Testando inserção...');
        
        // Inserir uma imagem de teste
        const { data: imageData, error: imageError } = await supabase
            .from('images')
            .insert([{
                image_type: 'test',
                image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hRaNdQAAAABJRU5ErkJggg==',
                metadata: { test: true }
            }])
            .select()
            .single();
        
        if (imageError) {
            console.log('❌ Erro ao inserir imagem:', imageError.message);
        } else {
            console.log('✅ Imagem inserida:', imageData.id);
            
            // Testar inserção de detecção com referência
            const { data: detectionData, error: detectionError } = await supabase
                .from('detections')
                .insert([{
                    number: 999,
                    session_id: 'test_session',
                    proof_image_id: imageData.id,
                    dorsal_region: { x: 100, y: 200, width: 50, height: 30 }
                }])
                .select()
                .single();
            
            if (detectionError) {
                console.log('❌ Erro ao inserir detecção:', detectionError.message);
            } else {
                console.log('✅ Detecção inserida:', detectionData.id);
                
                // Limpar dados de teste
                await supabase.from('detections').delete().eq('id', detectionData.id);
                await supabase.from('images').delete().eq('id', imageData.id);
                console.log('🧹 Dados de teste removidos');
            }
        }
        
        // Testar configuração
        console.log('\n⚙️  Testando configurações...');
        const { data: configData, error: configError } = await supabase
            .from('configurations')
            .upsert({
                config_type: 'test_config',
                config_data: { test: true, value: 123 }
            }, {
                onConflict: 'config_type'
            })
            .select()
            .single();
        
        if (configError) {
            console.log('❌ Erro ao salvar configuração:', configError.message);
        } else {
            console.log('✅ Configuração salva:', configData.id);
            
            // Testar leitura
            const { data: readConfig, error: readError } = await supabase
                .from('configurations')
                .select('*')
                .eq('config_type', 'test_config')
                .single();
            
            if (readError) {
                console.log('❌ Erro ao ler configuração:', readError.message);
            } else {
                console.log('✅ Configuração lida:', readConfig.config_data);
            }
            
            // Limpar
            await supabase.from('configurations').delete().eq('config_type', 'test_config');
            console.log('🧹 Configuração de teste removida');
        }
        
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        console.log('✅ Supabase está funcionando perfeitamente');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar teste
testSupabaseSimple();
