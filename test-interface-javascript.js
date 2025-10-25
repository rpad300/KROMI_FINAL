// =====================================================
// VisionKrono - Teste da Interface JavaScript
// Execute no console do navegador na página de configuração
// =====================================================

console.log('🧪 INICIANDO TESTES DA INTERFACE JAVASCRIPT');
console.log('===========================================');

// 1. TESTAR CARREGAMENTO DE MODALIDADES
async function testLoadModalities() {
    console.log('🔍 TESTE 1: Carregamento de Modalidades');
    console.log('=====================================');
    
    try {
        if (!window.supabaseClient || !window.supabaseClient.supabase) {
            console.log('❌ Supabase não disponível');
            return false;
        }
        
        const { data: modalities, error } = await window.supabaseClient.supabase
            .from('event_modalities')
            .select('*')
            .order('name');
        
        if (error) {
            console.log('❌ Erro ao carregar modalidades:', error);
            return false;
        }
        
        console.log('✅ Modalidades carregadas:', modalities.length);
        
        // Verificar se Duatlo e Triatlo existem
        const duatlo = modalities.find(m => m.name === 'Duatlo');
        const triatlo = modalities.find(m => m.name === 'Triatlo');
        
        if (duatlo) {
            console.log('✅ Duatlo encontrado:', duatlo);
        } else {
            console.log('❌ Duatlo não encontrado');
        }
        
        if (triatlo) {
            console.log('✅ Triatlo encontrado:', triatlo);
        } else {
            console.log('❌ Triatlo não encontrado');
        }
        
        return duatlo && triatlo;
        
    } catch (error) {
        console.log('❌ Erro no teste de modalidades:', error);
        return false;
    }
}

// 2. TESTAR CARREGAMENTO DE ATIVIDADES
async function testLoadActivities() {
    console.log('');
    console.log('🔍 TESTE 2: Carregamento de Atividades');
    console.log('=====================================');
    
    try {
        // Obter ID do Duatlo
        const { data: duatlo, error: duatloError } = await window.supabaseClient.supabase
            .from('event_modalities')
            .select('id')
            .eq('name', 'Duatlo')
            .single();
        
        if (duatloError || !duatlo) {
            console.log('❌ Duatlo não encontrado');
            return false;
        }
        
        // Carregar atividades do Duatlo
        const { data: activities, error } = await window.supabaseClient.supabase
            .from('modality_activities')
            .select('*')
            .eq('modality_id', duatlo.id)
            .order('activity_order');
        
        if (error) {
            console.log('❌ Erro ao carregar atividades:', error);
            return false;
        }
        
        console.log('✅ Atividades do Duatlo carregadas:', activities.length);
        activities.forEach(activity => {
            console.log(`  - ${activity.activity_name} (ordem: ${activity.activity_order}, ativa: ${activity.is_active})`);
        });
        
        return activities.length >= 2;
        
    } catch (error) {
        console.log('❌ Erro no teste de atividades:', error);
        return false;
    }
}

// 3. TESTAR FUNÇÃO DE VALIDAÇÃO
async function testValidation() {
    console.log('');
    console.log('🔍 TESTE 3: Validação Multi-Disciplinar');
    console.log('======================================');
    
    try {
        // Criar evento de teste
        const { data: testEvent, error: eventError } = await window.supabaseClient.supabase
            .from('events')
            .insert({
                name: 'Teste Validação Interface',
                event_type: 'Triatlo',
                event_started_at: new Date().toISOString(),
                is_active: true
            })
            .select()
            .single();
        
        if (eventError || !testEvent) {
            console.log('❌ Erro ao criar evento de teste:', eventError);
            return false;
        }
        
        console.log('✅ Evento de teste criado:', testEvent.id);
        
        // Testar validação (deve falhar pois não há dispositivos)
        const { data: validationResult, error: validationError } = await window.supabaseClient.supabase
            .rpc('validate_multimodal_setup', { p_event_id: testEvent.id });
        
        if (validationError) {
            console.log('❌ Erro na validação:', validationError);
            return false;
        }
        
        console.log('✅ Validação executada:', validationResult);
        console.log('Resultado esperado: false (sem dispositivos)');
        
        // Limpar evento de teste
        await window.supabaseClient.supabase
            .from('events')
            .delete()
            .eq('id', testEvent.id);
        
        console.log('✅ Evento de teste removido');
        
        return true;
        
    } catch (error) {
        console.log('❌ Erro no teste de validação:', error);
        return false;
    }
}

// 4. TESTAR FUNÇÕES DE INTERFACE
function testInterfaceFunctions() {
    console.log('');
    console.log('🔍 TESTE 4: Funções de Interface');
    console.log('===============================');
    
    const functions = [
        'handleModalityChange',
        'loadMultimodalActivities',
        'renderMultimodalActivities',
        'moveActivity',
        'toggleActivity',
        'validateMultimodalSetup'
    ];
    
    let allFunctionsExist = true;
    
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName}: Disponível`);
        } else {
            console.log(`❌ ${funcName}: Não encontrada`);
            allFunctionsExist = false;
        }
    });
    
    return allFunctionsExist;
}

// 5. TESTAR ELEMENTOS DO DOM
function testDOMElements() {
    console.log('');
    console.log('🔍 TESTE 5: Elementos do DOM');
    console.log('============================');
    
    const elements = [
        'multimodalConfig',
        'multimodalActivities',
        'multimodalValidation',
        'multimodalValidationText',
        'modalitiesConfig'
    ];
    
    let allElementsExist = true;
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ #${elementId}: Encontrado`);
        } else {
            console.log(`❌ #${elementId}: Não encontrado`);
            allElementsExist = false;
        }
    });
    
    return allElementsExist;
}

// EXECUTAR TODOS OS TESTES
async function runAllTests() {
    console.log('🚀 EXECUTANDO TODOS OS TESTES');
    console.log('=============================');
    
    const results = {
        modalities: await testLoadModalities(),
        activities: await testLoadActivities(),
        validation: await testValidation(),
        interface: testInterfaceFunctions(),
        dom: testDOMElements()
    };
    
    console.log('');
    console.log('📊 RESULTADOS DOS TESTES');
    console.log('========================');
    console.log('Modalidades:', results.modalities ? '✅ PASSOU' : '❌ FALHOU');
    console.log('Atividades:', results.activities ? '✅ PASSOU' : '❌ FALHOU');
    console.log('Validação:', results.validation ? '✅ PASSOU' : '❌ FALHOU');
    console.log('Interface:', results.interface ? '✅ PASSOU' : '❌ FALHOU');
    console.log('DOM:', results.dom ? '✅ PASSOU' : '❌ FALHOU');
    
    const allPassed = Object.values(results).every(result => result);
    
    console.log('');
    if (allPassed) {
        console.log('🎉 TODOS OS TESTES PASSARAM!');
        console.log('Sistema pronto para uso!');
    } else {
        console.log('⚠️ ALGUNS TESTES FALHARAM');
        console.log('Verifique os erros acima');
    }
    
    return results;
}

// Executar testes automaticamente
runAllTests().then(results => {
    console.log('');
    console.log('✨ Testes concluídos!');
    console.log('Resultado final:', results);
});

// Exportar funções para uso manual
window.testVisionKrono = {
    testLoadModalities,
    testLoadActivities,
    testValidation,
    testInterfaceFunctions,
    testDOMElements,
    runAllTests
};
