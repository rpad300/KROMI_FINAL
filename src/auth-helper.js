// Helper function para autenticação universal
// Incluir em todas as páginas protegidas após auth-client.js
// VERSÃO: 2025-10-26 20:00 - Sistema server-side com timeout garantido

console.log('✅ auth-helper.js v2025102620 carregado');

/**
 * Aguarda que o AuthClient esteja pronto
 * SEMPRE resolve (nunca fica pendurado)
 */
async function waitForAuthClient() {
    const maxWaitTime = 5000; // 5 segundos
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            
            // Verificar se AuthClient está pronto
            // No novo sistema, verificamos se currentUser não é undefined (ou seja, já verificou)
            if (window.authSystem && window.authSystem.currentUser !== undefined) {
                clearInterval(checkInterval);
                console.log(`✅ AuthClient pronto após ${elapsedTime}ms`);
                resolve(true);
                return;
            }
            
            // Verificar timeout
            if (elapsedTime > maxWaitTime) {
                clearInterval(checkInterval);
                console.error('❌ TIMEOUT: AuthClient não inicializado após 5 segundos');
                resolve(false);
            }
        }, 50);
    });
}

/**
 * Função para verificar permissões
 * SEMPRE resolve (true/false), nunca fica pendurado
 */
async function verificarAutenticacao(perfilRequerido = ['admin', 'moderator']) {
    console.log('🔐 Verificando autenticação...');
    
    try {
        // Aguardar AuthClient com timeout garantido
        const authReady = await waitForAuthClient();
        
        if (!authReady) {
            console.error('❌ Resultado autenticação: false (motivo: timeout AuthClient)');
            return false;
        }
        
        // Verificar se tem sessão ativa
        if (!window.authSystem.currentUser) {
            console.warn('⚠️ Resultado autenticação: false (motivo: sem sessão)');
            return false;
        }
        
        // Verificar role (sistema server-side) OU profile_type (compatibilidade)
        const perfil = window.authSystem.userProfile?.role || window.authSystem.userProfile?.profile_type;
        
        console.log('🔍 Perfil detectado:', perfil);
        console.log('🔍 Perfis requeridos:', perfilRequerido);
        
        if (!perfil || !perfilRequerido.includes(perfil)) {
            console.warn(`⚠️ Resultado autenticação: false (motivo: perfil '${perfil}' não permitido)`);
            return false;
        }
        
        console.log(`✅ Resultado autenticação: true (motivo: perfil '${perfil}' permitido)`);
        return true;
        
    } catch (error) {
        console.error('❌ Erro na autenticação:', error);
        console.error('❌ Resultado autenticação: false (motivo: exceção)', error.message);
        return false;
    }
}

