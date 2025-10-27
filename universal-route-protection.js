// Sistema de Proteção Universal de Rotas
// Protege TODAS as páginas da plataforma exceto as de autenticação

class UniversalRouteProtection {
    constructor() {
        // Lista de páginas públicas (que não precisam de autenticação)
        this.publicPages = [
            'login.html',
            'register.html', 
            'forgot-password.html',
            'reset-password.html',
            'auth/callback.html'
            // index-kromi.html agora é protegida (requer autenticação)
        ];

        // Páginas que podem ser acessadas com parâmetros específicos (sem autenticação)
        this.publicWithParams = [
            'detection.html',  // Para dispositivos de detecção
            'detection-kromi.html'  // Para dispositivos de detecção KROMI
        ];

        // Lista de páginas que precisam de autenticação
        this.protectedPages = [
            'index.html',
            'index-kromi.html',
            'usuarios.html',
            'perfis-permissoes.html',
            'configuracoes.html',
            'logs-auditoria.html',
            'meu-perfil.html',
            'events-kromi.html',
            'participants.html',
            'classifications.html',
            'image-processor.html',
            'database-management.html',
            'configuracoes.html',
            'category-rankings.html',
            'live-stream.html',
            'livestream-viewer.html',
            'calibration.html',
            'calibration-kromi.html',
            'admin-dashboard.html',
            'events-kromi.html',
            'participants-kromi.html',
            'classifications-kromi.html',
            'image-processor-kromi.html',
            'database-management-kromi.html',
            'platform-config-kromi.html',
            'category-rankings-kromi.html',
            'checkpoint-order-kromi.html',
            'config-kromi.html',
            'events-pwa.html'
        ];

        this.init();
    }

    async init() {
        // Guard: prevenir inicialização duplicada
        if (window.__URP_INITIALIZED__) {
            console.log('⚠️ Universal Route Protection já inicializado, ignorando...');
            return;
        }
        window.__URP_INITIALIZED__ = true;
        
        try {
            console.log('🔒 Universal Route Protection iniciando...');
            
            // Aguardar inicialização do sistema de autenticação
            await this.waitForAuthSystem();
            console.log('✅ Sistema de autenticação aguardado');
            
            // Verificar se a página atual precisa de proteção
            const currentPage = this.getCurrentPageName();
            console.log('📄 Página atual:', currentPage);
            
            if (this.isPublicPage(currentPage)) {
                console.log('🌐 Página pública detectada');
                // Página pública - verificar se já está logado para redirecionar
                await this.handlePublicPage();
            } else if (this.isPublicWithParams(currentPage)) {
                console.log('🔗 Página pública com parâmetros detectada');
                // Página pública com parâmetros - verificar se tem parâmetros válidos
                await this.handlePublicWithParams();
            } else {
                console.log('🔐 Página protegida detectada');
                // Página protegida - verificar autenticação
                await this.protectPage();
            }
            
        } catch (error) {
            console.error('❌ Erro na proteção universal:', error);
            this.redirectToLogin();
        }
    }

    async waitForAuthSystem() {
        let attempts = 0;
        const maxAttempts = 100; // 10 segundos máximo
        
        // Aguardar window.authSystem existir
        while (!window.authSystem && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.authSystem) {
            console.error('Sistema de autenticação não inicializado');
            throw new Error('Sistema de autenticação não disponível');
        }
        
        // IMPORTANTE: Aguardar que checkExistingSession() termine
        // Se currentUser for undefined (não null), ainda está verificando
        attempts = 0;
        while (window.authSystem.currentUser === undefined && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
        
        console.log('✅ AuthSystem pronto:', {
            currentUser: !!window.authSystem.currentUser,
            userProfile: !!window.authSystem.userProfile
        });
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        const fileName = path.split('/').pop();
        return fileName || 'index.html';
    }

    isPublicPage(pageName) {
        return this.publicPages.includes(pageName);
    }

    isPublicWithParams(pageName) {
        return this.publicWithParams.includes(pageName);
    }

    hasRequiredParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Para páginas de detecção, verificar se tem parâmetros essenciais
        const currentPage = this.getCurrentPageName();
        
        if (currentPage === 'detection.html' || currentPage === 'detection-kromi.html') {
            // Verificar se tem os parâmetros necessários para detecção
            return urlParams.has('event') && urlParams.has('device');
        }
        
        return false;
    }

    async handlePublicWithParams() {
        // Verificar se tem os parâmetros necessários
        if (this.hasRequiredParams()) {
            console.log('Página pública com parâmetros válidos - permitindo acesso');
            // Permitir acesso sem autenticação
            this.showPageContent();
        } else {
            console.log('Página pública sem parâmetros válidos - redirecionando para login');
            this.redirectToLogin();
        }
    }

    async handlePublicPage() {
        console.log('🔍 Verificando estado de autenticação...');
        console.log('🔍 window.authSystem:', window.authSystem);
        console.log('🔍 window.authSystem.currentUser:', window.authSystem?.currentUser);
        console.log('🔍 window.authSystem.userProfile:', window.authSystem?.userProfile);
        
        // Se já está logado numa página pública, redirecionar baseado no perfil
        if (window.authSystem.currentUser && window.authSystem.userProfile) {
            console.log('✅ Utilizador já logado numa página pública, verificando redirecionamento...');
            
            // Evitar loop infinito - só redirecionar se não estiver já na página de destino
            const currentPage = this.getCurrentPageName();
            const profile = window.authSystem.userProfile.profile_type;
            
            console.log('🔍 Página atual:', currentPage);
            console.log('🔍 Perfil:', profile);
            
            // SEMPRE verificar se há URL de retorno guardada PRIMEIRO
            const returnUrl = sessionStorage.getItem('returnUrl');
            
            if (returnUrl) {
                console.log('📍 URL de retorno encontrada:', returnUrl);
                console.log('🔍 Limpando returnUrl do sessionStorage...');
                sessionStorage.removeItem('returnUrl'); // Limpar após usar
                
                // Verificar se returnUrl não é login.html (evitar loop)
                if (!returnUrl.includes('login.html')) {
                    console.log('🚀 Redirecionando para URL de retorno:', returnUrl);
                    setTimeout(() => {
                        window.location.replace(returnUrl);
                    }, 100);
                    return;
                } else {
                    console.log('⚠️ returnUrl é login.html - ignorando e usando página padrão');
                }
            }
            
            let targetPage = '';
            
            // Se não há returnUrl, usar página padrão baseada no perfil
            switch (profile) {
                case 'admin':
                    targetPage = 'index-kromi.html';
                    break;
                case 'event_manager':
                    targetPage = 'events-kromi.html';
                    break;
                case 'participant':
                    targetPage = 'classifications.html';
                    break;
            }
            
            console.log('🔍 Página de destino:', targetPage);
            
            // Redirecionar se não estiver já na página correta
            if (targetPage && currentPage !== targetPage) {
                console.log(`🚀 Redirecionando de ${currentPage} para ${targetPage}`);
                console.log(`🔍 URL completa: ${window.location.origin}/${targetPage}`);
                
                // Usar replace() em vez de href para forçar redirecionamento
                setTimeout(() => {
                    window.location.replace(`${window.location.origin}/${targetPage}`);
                }, 100);
            } else {
                console.log(`⏸️ Não redirecionando: currentPage=${currentPage}, targetPage=${targetPage}`);
            }
        } else {
            console.log('❌ Utilizador não está logado ou sem perfil');
            
            // Verificar se existe sessão válida no Supabase (para ir direto ao index)
            if (window.authSystem.supabase) {
                console.log('🔍 Verificando sessão existente no Supabase...');
                try {
                    const { data: { session }, error } = await window.authSystem.supabase.auth.getSession();
                    
                    if (session && !error) {
                        console.log('✅ Sessão válida encontrada no Supabase, aguardando carregamento do perfil...');
                        // Aguardar um pouco para o auth-system.js carregar o perfil
                        setTimeout(async () => {
                            if (window.authSystem.currentUser && window.authSystem.userProfile) {
                                console.log('✅ Perfil carregado, redirecionando automaticamente...');
                                await this.handlePublicPage();
                            }
                        }, 1000);
                    } else {
                        console.log('❌ Nenhuma sessão válida encontrada');
                    }
                } catch (error) {
                    console.error('❌ Erro ao verificar sessão:', error);
                }
            }
        }
        // Se não está logado, deixar acessar a página pública
    }

    async protectPage() {
        try {
            console.log('🔐 Protegendo página...');
            
            // Verificar se está autenticado
            if (!window.authSystem.currentUser) {
                console.log('❌ Utilizador não autenticado');
                
                // Guardar URL atual para retornar após login
                const currentUrl = window.location.href;
                sessionStorage.setItem('returnUrl', currentUrl);
                console.log('📍 URL de retorno guardada:', currentUrl);
                
                console.log('🚀 Redirecionando para login...');
                this.redirectToLogin();
                return;
            }

            console.log('✅ Utilizador autenticado:', window.authSystem.currentUser.email);

            // Verificar se o perfil está carregado
            if (!window.authSystem.userProfile) {
                console.log('⏳ Perfil não carregado, aguardando...');
                await this.waitForUserProfile();
            }

            console.log('✅ Perfil carregado:', window.authSystem.userProfile.profile_type);

            // Verificar permissões específicas da página
            const currentPage = this.getCurrentPageName();
            const hasPermission = this.checkPagePermission(currentPage);

            if (!hasPermission) {
                console.log('❌ Acesso negado para esta página');
                this.showAccessDenied();
                return;
            }

            console.log('✅ Permissão validada para', currentPage);

            // Verificar se a sessão ainda é válida
            await this.validateSession();

            console.log('✅ Página protegida - acesso permitido');

            // Log da atividade
            await window.authSystem.logActivity('PAGE_ACCESS', 'route', null, {
                route: currentPage,
                profile: window.authSystem.userProfile.profile_type
            });

            // Mostrar conteúdo da página
            this.showPageContent();

        } catch (error) {
            console.error('Erro na proteção da página:', error);
            this.redirectToLogin();
        }
    }

    async waitForUserProfile() {
        let attempts = 0;
        const maxAttempts = 30; // 3 segundos máximo
        
        while (!window.authSystem.userProfile && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.authSystem.userProfile) {
            console.error('Perfil do utilizador não carregado');
            throw new Error('Perfil não disponível');
        }
    }

    checkPagePermission(pageName) {
        if (!window.authSystem.userProfile) {
            return false;
        }

        const profile = window.authSystem.userProfile.profile_type;

        // Admin tem acesso a tudo
        if (profile === 'admin') {
            return true;
        }

        // Definir permissões específicas por página
        const pagePermissions = {
            // Páginas para administradores apenas
            'database-management.html': ['admin'],
            'database-management-kromi.html': ['admin'],
            'configuracoes.html': ['admin'],
            'platform-config-kromi.html': ['admin'],
            'config-kromi.html': ['admin'],
            'admin-dashboard.html': ['admin'],

            // Páginas para administradores e gestores de eventos
            'events-kromi.html': ['admin', 'event_manager'],
            'events-kromi.html': ['admin', 'event_manager'],
            'events-pwa.html': ['admin', 'event_manager'],
            'participants.html': ['admin', 'event_manager'],
            'participants-kromi.html': ['admin', 'event_manager'],
            'detection.html': ['admin', 'event_manager'],
            'detection-kromi.html': ['admin', 'event_manager'],
            'image-processor.html': ['admin', 'event_manager'],
            'image-processor-kromi.html': ['admin', 'event_manager'],
            'calibration.html': ['admin', 'event_manager'],
            'calibration-kromi.html': ['admin', 'event_manager'],
            'checkpoint-order-kromi.html': ['admin', 'event_manager'],
            'live-stream.html': ['admin', 'event_manager'],

            // Páginas para todos os perfis
            'classifications.html': ['admin', 'event_manager', 'participant'],
            'classifications-kromi.html': ['admin', 'event_manager', 'participant'],
            'category-rankings.html': ['admin', 'event_manager', 'participant'],
            'category-rankings-kromi.html': ['admin', 'event_manager', 'participant'],
            'livestream-viewer.html': ['admin', 'event_manager', 'participant'],

            // Página inicial redireciona baseado no perfil
            'index.html': ['admin', 'event_manager', 'participant']
        };

        const allowedProfiles = pagePermissions[pageName];
        if (!allowedProfiles) {
            // Se a página não está na lista, permitir acesso (páginas novas)
            return true;
        }

        return allowedProfiles.includes(profile);
    }

    async validateSession() {
        try {
            // No sistema server-side, a validação já foi feita no middleware
            // Se chegou aqui com currentUser, a sessão é válida
            console.log('✅ Sessão validada (server-side)');
            
            // Atualizar última atividade
            await this.updateLastActivity();

        } catch (error) {
            console.error('Erro ao validar sessão:', error);
            this.redirectToLogin();
        }
    }

    async updateLastActivity() {
        // No sistema server-side, a última atividade é atualizada automaticamente
        // no middleware a cada request
        console.log('✅ Última atividade atualizada (server-side automático)');
        return Promise.resolve();
    }

    showPageContent() {
        // Remover loading de autenticação se existir
        const authLoading = document.getElementById('authLoading');
        if (authLoading) {
            authLoading.style.display = 'none';
        }

        // Verificar se é uma página pública com parâmetros
        const currentPage = this.getCurrentPageName();
        const isPublicWithParams = this.isPublicWithParams(currentPage) && this.hasRequiredParams();

        if (!isPublicWithParams) {
            // Mostrar header de autenticação apenas para páginas protegidas
            const authHeader = document.getElementById('authHeader');
            if (authHeader) {
                authHeader.style.display = 'block';
            }
        }

        // Mostrar conteúdo principal se existir
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.display = 'block';
        }

        // Carregar informações do utilizador apenas se estiver autenticado
        if (window.authSystem && window.authSystem.currentUser) {
            this.loadUserInfo();
        }
    }

    loadUserInfo() {
        const userProfile = window.authSystem.userProfile;
        if (!userProfile) return;

        // Atualizar avatar
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.textContent = (userProfile.full_name || 'U').charAt(0).toUpperCase();
        }

        // Atualizar nome
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = userProfile.full_name || 'Utilizador';
        }

        // Atualizar email
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = userProfile.email;
        }
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login')) {
            console.log('Redirecionando para login');
            window.location.href = './login.html';
        }
    }

    showAccessDenied() {
        // Criar página de acesso negado
        document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    padding: 40px;
                    text-align: center;
                    max-width: 400px;
                    margin: 20px;
                ">
                    <div style="
                        font-size: 4rem;
                        margin-bottom: 20px;
                        color: #e74c3c;
                    ">🚫</div>
                    <h1 style="
                        color: #333;
                        margin-bottom: 15px;
                        font-size: 2rem;
                    ">Acesso Negado</h1>
                    <p style="
                        color: #666;
                        margin-bottom: 30px;
                        line-height: 1.5;
                    ">
                        Não tem permissão para aceder a esta página.<br>
                        Contacte o administrador se acredita que isto é um erro.
                    </p>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button onclick="window.history.back()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Voltar</button>
                        <button onclick="window.location.href='/login.html'" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Login</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Método para logout global
    async logout() {
        try {
            await window.authSystem.signOut();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }
}

// Inicializar proteção universal
window.universalProtection = new UniversalRouteProtection();
window.universalProtection.init();

// Função global de logout
window.logout = function() {
    if (window.universalProtection) {
        window.universalProtection.logout();
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalRouteProtection;
}
