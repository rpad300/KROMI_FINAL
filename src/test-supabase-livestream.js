// Teste simples do Supabase para Live Stream
async function testSupabaseConnection() {
    console.log('🧪 Testando conexão Supabase...');
    
    try {
        // Aguardar Supabase estar disponível
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            if (window.supabaseClient && window.supabaseClient.supabase) {
                console.log('✅ Supabase encontrado');
                
                const supabase = window.supabaseClient.supabase;
                
                // Testar se as tabelas existem
                console.log('🔍 Testando tabela livestream_devices...');
                const { data, error } = await supabase
                    .from('livestream_devices')
                    .select('*')
                    .limit(1);
                
                if (error) {
                    console.error('❌ Erro ao acessar tabela livestream_devices:', error);
                    console.log('📋 Execute o SQL no Supabase Dashboard primeiro!');
                    return false;
                } else {
                    console.log('✅ Tabela livestream_devices OK');
                }
                
                // Testar inserção
                console.log('🔍 Testando inserção...');
                const testDevice = {
                    device_id: 'test-device-' + Date.now(),
                    device_name: 'Dispositivo de Teste',
                    event_id: 'test-event-id',
                    status: 'online',
                    capabilities: ['livestream', 'detection']
                };
                
                const { data: insertData, error: insertError } = await supabase
                    .from('livestream_devices')
                    .insert([testDevice])
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('❌ Erro ao inserir:', insertError);
                    return false;
                } else {
                    console.log('✅ Inserção OK:', insertData);
                    
                    // Limpar teste
                    await supabase
                        .from('livestream_devices')
                        .delete()
                        .eq('device_id', testDevice.device_id);
                    
                    console.log('✅ Teste completo - Supabase funcionando!');
                    return true;
                }
            }
            
            console.log(`⏳ Aguardando Supabase... (tentativa ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        console.error('❌ Supabase não disponível após 10 segundos');
        return false;
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        return false;
    }
}

// Executar teste quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('events')) {
        console.log('🧪 Iniciando teste do Supabase...');
        setTimeout(() => {
            testSupabaseConnection();
        }, 2000);
    }
});
