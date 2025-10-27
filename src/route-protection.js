// Sistema de Proteção de Rotas
// Middleware para verificar autenticação e permissões

class RouteProtection {
    constructor() {
        this.protectedRoutes = {
            // Rotas que requerem autenticação
            'admin-dashboard.html': ['admin'],
            'events.html': ['admin', 'event_manager'],
            'participants.html': ['admin', 'event_manager'],
            'classifications.html': ['admin', 'event_manager', 'participant'],
            'detection.html': ['admin', 'event_manager'],
            'image-processor.html': ['admin', 'event_manager'],
            'database-management.html': ['admin'],
            'configuracoes.html': ['admin'],
            'category-rankings.html': ['admin', 'event_manager', 'participant'],
            'live-stream.html': ['admin', 'event_manager'],
            'livestream-viewer.html': ['admin', 'event_manager', 'participant']
        };

        this.publicRoutes = [
            'login.html',
            'register.html',
            'forgot-password.html',
            'reset-password.html',
            'auth/callback'
        ];

        this.init();
    }

    async init() {
        // Aguardar inicialização do sistema de autenticação
        await this.waitForAuthSystem();
        
        // Verificar proteção da rota atual
        await this.checkCurrentRoute();
        
        // Configurar listener para mudanças de rota
        this.setupRouteListener();
    }

    async waitForAuthSystem() {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        while (!window.authSystem && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.authSystem) {
            console.error('Sistema de autenticação não inicializado');
            this.redirectToLogin();
        }
    }

    async checkCurrentRoute() {
        const currentPath = window.location.pathname;
        const fileName = currentPath.split('/').pop();
        
        // Verificar se é uma rota pública
        if (this.publicRoutes.includes(fileName)) {
            // Se já está logado, redirecionar baseado no perfil
            if (window.authSystem.currentUser) {
                window.authSystem.redirectBasedOnProfile();
            }
            return;
        }

        // Verificar se é uma rota protegida
        if (this.protectedRoutes[fileName]) {
            await this.protectRoute(fileName);
        }
    }

    async protectRoute(routeName) {
        try {
            // Verificar se está autenticado
            if (!window.authSystem.currentUser) {
                console.log('Utilizador não autenticado, redirecionando para login');
                this.redirectToLogin();
                return;
            }

            // Verificar se o perfil está carregado
            if (!window.authSystem.userProfile) {
                console.log('Perfil não carregado, aguardando...');
                await this.waitForUserProfile();
            }

            // Verificar permissões
            const requiredProfiles = this.protectedRoutes[routeName];
            const hasPermission = requiredProfiles.some(profile => 
                window.authSystem.hasPermission(profile)
            );

            if (!hasPermission) {
                console.log('Acesso negado para esta rota');
                this.showAccessDenied();
                return;
            }

            // Verificar se a sessão ainda é válida
            await this.validateSession();

            // Log da atividade
            await window.authSystem.logActivity('PAGE_ACCESS', 'route', null, {
                route: routeName,
                profile: window.authSystem.userProfile.profile_type
            });

        } catch (error) {
            console.error('Erro na proteção de rota:', error);
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
            this.redirectToLogin();
        }
    }

    async validateSession() {
        try {
            const { data: { session }, error } = await window.authSystem.supabase.auth.getSession();
            
            if (error || !session) {
                console.log('Sessão inválida, redirecionando para login');
                this.redirectToLogin();
                return;
            }

            // Verificar se a sessão expirou
            const now = new Date();
            const expiresAt = new Date(session.expires_at * 1000);
            
            if (now >= expiresAt) {
                console.log('Sessão expirada, redirecionando para login');
                this.redirectToLogin();
                return;
            }

            // Atualizar última atividade
            await this.updateLastActivity();

        } catch (error) {
            console.error('Erro ao validar sessão:', error);
            this.redirectToLogin();
        }
    }

    async updateLastActivity() {
        try {
            await window.authSystem.supabase
                .from('user_sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('user_id', window.authSystem.currentUser.id)
                .eq('is_active', true);
        } catch (error) {
            console.error('Erro ao atualizar última atividade:', error);
        }
    }

    setupRouteListener() {
        // Listener para mudanças de hash (SPA)
        window.addEventListener('hashchange', () => {
            this.checkCurrentRoute();
        });

        // Listener para mudanças de popstate (navegação do browser)
        window.addEventListener('popstate', () => {
            this.checkCurrentRoute();
        });

        // Listener para mudanças de autenticação
        if (window.authSystem && window.authSystem.supabase) {
            window.authSystem.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    this.redirectToLogin();
                } else if (event === 'SIGNED_IN' && session) {
                    this.checkCurrentRoute();
                }
            });
        }
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login.html';
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

    // Método para verificar permissões programaticamente
    hasRoutePermission(routeName) {
        if (!window.authSystem || !window.authSystem.userProfile) {
            return false;
        }

        const requiredProfiles = this.protectedRoutes[routeName];
        if (!requiredProfiles) {
            return true; // Rota não protegida
        }

        return requiredProfiles.some(profile => 
            window.authSystem.hasPermission(profile)
        );
    }

    // Método para obter rotas acessíveis pelo utilizador atual
    getAccessibleRoutes() {
        if (!window.authSystem || !window.authSystem.userProfile) {
            return this.publicRoutes;
        }

        const accessibleRoutes = [...this.publicRoutes];
        
        Object.keys(this.protectedRoutes).forEach(route => {
            if (this.hasRoutePermission(route)) {
                accessibleRoutes.push(route);
            }
        });

        return accessibleRoutes;
    }

    // Método para criar menu de navegação baseado em permissões
    createNavigationMenu() {
        if (!window.authSystem || !window.authSystem.userProfile) {
            return [];
        }

        const menuItems = [];

        // Menu para administradores
        if (window.authSystem.isAdmin()) {
            menuItems.push(
                { name: 'Dashboard', url: 'admin-dashboard.html', icon: '🏠' },
                { name: 'Eventos', url: 'events.html', icon: '📅' },
                { name: 'Participantes', url: 'participants.html', icon: '👥' },
                { name: 'Classificações', url: 'classifications.html', icon: '🏆' },
                { name: 'Detecção', url: 'detection.html', icon: '📷' },
                { name: 'Processamento', url: 'image-processor.html', icon: '⚙️' },
                { name: 'Base de Dados', url: 'database-management.html', icon: '🗄️' },
                { name: 'Configuração', url: 'configuracoes.html', icon: '⚙️' },
                { name: 'Rankings', url: 'category-rankings.html', icon: '📊' },
                { name: 'Live Stream', url: 'live-stream.html', icon: '📺' }
            );
        }
        // Menu para gestores de eventos
        else if (window.authSystem.isEventManager()) {
            menuItems.push(
                { name: 'Eventos', url: 'events.html', icon: '📅' },
                { name: 'Participantes', url: 'participants.html', icon: '👥' },
                { name: 'Classificações', url: 'classifications.html', icon: '🏆' },
                { name: 'Detecção', url: 'detection.html', icon: '📷' },
                { name: 'Processamento', url: 'image-processor.html', icon: '⚙️' },
                { name: 'Rankings', url: 'category-rankings.html', icon: '📊' },
                { name: 'Live Stream', url: 'live-stream.html', icon: '📺' }
            );
        }
        // Menu para participantes
        else if (window.authSystem.isParticipant()) {
            menuItems.push(
                { name: 'Classificações', url: 'classifications.html', icon: '🏆' },
                { name: 'Rankings', url: 'category-rankings.html', icon: '📊' },
                { name: 'Live Stream', url: 'livestream-viewer.html', icon: '📺' }
            );
        }

        return menuItems;
    }
}

// Inicializar proteção de rotas
window.routeProtection = new RouteProtection();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteProtection;
}


