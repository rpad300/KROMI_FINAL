// DEBUG: Script para verificar o que está a acontecer no login
// Adicionar este script temporariamente ao login.html para debug

console.log('=== DEBUG: Sistema de Autenticação ===');

// Verificar se os scripts estão carregados
console.log('Supabase carregado:', typeof window.supabaseClient !== 'undefined');
console.log('AuthSystem carregado:', typeof window.authSystem !== 'undefined');

// Verificar configurações
if (window.supabaseClient) {
    console.log('Supabase URL:', window.supabaseClient.supabase?.supabaseUrl);
    console.log('Supabase Key:', window.supabaseClient.supabase?.supabaseKey?.substring(0, 20) + '...');
}

// Verificar estado de autenticação
if (window.authSystem) {
    console.log('Utilizador atual:', window.authSystem.currentUser);
    console.log('Perfil atual:', window.authSystem.userProfile);
    console.log('Sessão atual:', window.authSystem.supabase?.auth?.session());
}

// Interceptar redirecionamentos
const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
Object.defineProperty(window.location, 'href', {
    get: function() {
        return originalLocationHref.get.call(this);
    },
    set: function(value) {
        console.log('🔀 REDIRECIONAMENTO DETECTADO:', value);
        console.log('📍 Página atual:', window.location.pathname);
        console.log('🎯 Destino:', value);
        
        // Verificar se é um redirecionamento válido
        if (value.includes('admin-dashboard.html')) {
            console.log('✅ Redirecionamento para dashboard - OK');
        } else if (value.includes('login.html')) {
            console.log('⚠️ Redirecionamento para login - pode ser loop');
        }
        
        return originalLocationHref.set.call(this, value);
    }
});

// Interceptar erros
window.addEventListener('error', function(e) {
    console.error('❌ ERRO:', e.error);
});

// Interceptar promessas rejeitadas
window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ PROMESSA REJEITADA:', e.reason);
});

console.log('=== DEBUG ATIVO ===');


