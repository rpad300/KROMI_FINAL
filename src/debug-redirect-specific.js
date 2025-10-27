// DEBUG ESPECÍFICO: Verificar por que não redireciona
// Adicionar este script ao login.html temporariamente

console.log('=== DEBUG ESPECÍFICO ===');

// Verificar se authSystem está disponível
if (typeof window.authSystem !== 'undefined') {
    console.log('✅ AuthSystem carregado');
    
    // Verificar estado atual
    console.log('Utilizador atual:', window.authSystem.currentUser);
    console.log('Perfil atual:', window.authSystem.userProfile);
    
    // Verificar se tem sessão
    if (window.authSystem.supabase) {
        window.authSystem.supabase.auth.getSession().then(({ data: { session }, error }) => {
            console.log('Sessão atual:', session);
            console.log('Erro de sessão:', error);
        });
    }
} else {
    console.log('❌ AuthSystem NÃO carregado');
}

// Interceptar tentativas de redirecionamento
let redirectAttempts = 0;
const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
Object.defineProperty(window.location, 'href', {
    get: function() {
        return originalLocationHref.get.call(this);
    },
    set: function(value) {
        redirectAttempts++;
        console.log(`🔀 TENTATIVA DE REDIRECIONAMENTO #${redirectAttempts}:`, value);
        console.log('📍 Página atual:', window.location.pathname);
        
        // Verificar se é um redirecionamento válido
        if (value.includes('admin-dashboard.html')) {
            console.log('✅ Tentando redirecionar para dashboard');
        } else if (value.includes('login.html')) {
            console.log('⚠️ Tentando redirecionar para login (possível loop)');
        }
        
        // Se for o primeiro redirecionamento para dashboard, permitir
        if (redirectAttempts === 1 && value.includes('admin-dashboard.html')) {
            console.log('🚀 EXECUTANDO REDIRECIONAMENTO PARA DASHBOARD');
            return originalLocationHref.set.call(this, value);
        }
        
        // Se for redirecionamento para login, bloquear para evitar loop
        if (value.includes('login.html') && window.location.pathname.includes('login')) {
            console.log('🛑 BLOQUEANDO REDIRECIONAMENTO PARA LOGIN (evitar loop)');
            return;
        }
        
        return originalLocationHref.set.call(this, value);
    }
});

// Verificar se há erros JavaScript
window.addEventListener('error', function(e) {
    console.error('❌ ERRO JAVASCRIPT:', e.error);
    console.error('❌ Arquivo:', e.filename);
    console.error('❌ Linha:', e.lineno);
});

// Verificar promessas rejeitadas
window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ PROMESSA REJEITADA:', e.reason);
});

console.log('=== DEBUG ATIVO - FAÇA LOGIN AGORA ===');


