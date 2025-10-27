// Teste simples para carregar eventos
// Este script testa se consegue carregar eventos da base de dados

async function testLoadEvents() {
    try {
        console.log('🧪 Testando carregamento de eventos...');
        
        // Verificar se existe instância do Supabase
        if (!window.supabaseClient || !window.supabaseClient.supabase) {
            console.error('❌ SupabaseClient não disponível');
            return;
        }
        
        console.log('✅ SupabaseClient disponível');
        
        // Fazer query simples
        const { data: events, error } = await window.supabaseClient.supabase
            .from('events')
            .select('id, name, status, created_at')
            .limit(5);
        
        if (error) {
            console.error('❌ Erro na query:', error);
            return;
        }
        
        console.log('✅ Eventos carregados:', events);
        console.log('📊 Total de eventos:', events?.length || 0);
        
        // Mostrar eventos no console
        if (events && events.length > 0) {
            events.forEach((event, index) => {
                console.log(`Evento ${index + 1}:`, {
                    id: event.id,
                    name: event.name,
                    status: event.status,
                    created_at: event.created_at
                });
            });
        } else {
            console.log('⚠️ Nenhum evento encontrado');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar teste quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧪 Iniciando teste de carregamento de eventos...');
    
    // Aguardar um pouco para o Supabase inicializar
    setTimeout(() => {
        testLoadEvents();
    }, 2000);
});


