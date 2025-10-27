/**
 * ==========================================
 * AUTH CLIENT - VisionKrono
 * ==========================================
 * 
 * Cliente de autenticação que usa sistema server-side
 * Substitui auth-system.js
 * 
 * Features:
 * - Login via /api/auth/login
 * - Sessões via cookies HttpOnly
 * - CSRF protection
 * - Return URL
 * - Compatível com código existente
 * 
 * Versão: 2.0
 * Data: 2025-10-26
 * ==========================================
 */

class AuthClient {
    constructor() {
        this.currentUser = undefined; // undefined = ainda verificando, null = sem sessão
        this.userProfile = undefined;
        this.csrfToken = null;
        this.supabase = null; // Mantido para compatibilidade, mas não usado para auth
        this.authListener = null;
        this.init();
    }

    async init() {
        try {
            console.log('🔐 AuthClient inicializando...');
            
            // Verificar sessão existente
            await this.checkExistingSession();
            
            console.log('✅ AuthClient inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar AuthClient:', error);
        }
    }

    /**
     * Verificar se há sessão ativa
     */
    async checkExistingSession() {
        try {
            console.log('🔍 Verificando sessão existente...');
            
            const response = await fetch('/api/auth/session', {
                credentials: 'include' // Incluir cookies
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.authenticated) {
                    console.log('✅ Sessão válida encontrada:', data.user.email);
                    this.currentUser = {
                        id: data.user.id,
                        email: data.user.email
                    };
                    this.userProfile = {
                        user_id: data.user.id,
                        email: data.user.email,
                        name: data.user.name,
                        role: data.user.role,
                        profile_type: data.user.role, // Compatibilidade
                        status: data.user.status
                    };
                    
                    console.log('👤 Perfil carregado:', this.userProfile.role);
                    
                    // Renovar sessão automaticamente a cada 5 minutos
                    this.startSessionRenewal();
                    
                    return true;
                } else {
                    console.log('❌ Sem sessão ativa');
                    this.currentUser = null;
                    this.userProfile = null;
                    return false;
                }
            } else {
                console.log('❌ Sem sessão válida');
                this.currentUser = null;
                this.userProfile = null;
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            this.currentUser = null;
            this.userProfile = null;
            return false;
        }
    }

    /**
     * Login com email e password
     */
    async signInWithEmail(email, password) {
        try {
            console.log(`🔐 Login: ${email}`);
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao fazer login');
            }

            if (data.success) {
                this.currentUser = {
                    id: data.user.id,
                    email: data.user.email
                };
                this.userProfile = {
                    user_id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    profile_type: data.user.role, // Compatibilidade
                    status: data.user.status
                };
                
                console.log('✅ Login bem-sucedido:', this.userProfile.email);
                
                // Iniciar renovação automática
                this.startSessionRenewal();
                
                // Notificar universal-route-protection para redirecionar
                if (window.universalProtection) {
                    console.log('📍 Notificando universal-route-protection...');
                    setTimeout(() => {
                        window.universalProtection.handlePublicPage();
                    }, 300);
                } else {
                    // Fallback: redirecionar diretamente
                    console.log('📍 Redirecionando diretamente...');
                    setTimeout(() => {
                        this.redirectBasedOnProfile();
                    }, 500);
                }
                
                return data;
            } else {
                throw new Error('Login falhou');
            }
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    }

    /**
     * Logout
     */
    async signOut() {
        try {
            console.log('👋 Logout...');
            
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            this.currentUser = null;
            this.userProfile = null;
            
            // Parar renovação
            if (this.renewalInterval) {
                clearInterval(this.renewalInterval);
            }
            
            console.log('✅ Logout realizado');
            
            // Redirecionar para login
            window.location.href = './login.html';
        } catch (error) {
            console.error('❌ Erro no logout:', error);
        }
    }

    /**
     * Terminar todas as outras sessões
     */
    async logoutOthers() {
        try {
            const response = await fetch('/api/auth/logout-others', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅', data.message);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erro ao terminar outras sessões:', error);
            return false;
        }
    }

    /**
     * Listar sessões ativas
     */
    async getUserSessions() {
        try {
            const response = await fetch('/api/auth/sessions', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data.sessions || [];
            }
            
            return [];
        } catch (error) {
            console.error('❌ Erro ao listar sessões:', error);
            return [];
        }
    }

    /**
     * Renovar sessão automaticamente
     */
    startSessionRenewal() {
        // Renovar a cada 5 minutos
        this.renewalInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    console.log('🔄 Sessão renovada automaticamente');
                } else {
                    console.warn('⚠️  Falha ao renovar sessão - pode ter expirado');
                    clearInterval(this.renewalInterval);
                    // Redirecionar para login
                    window.location.href = './login.html';
                }
            } catch (error) {
                console.error('❌ Erro ao renovar sessão:', error);
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Obter token CSRF
     */
    async getCsrfToken() {
        if (this.csrfToken) {
            return this.csrfToken;
        }
        
        try {
            const response = await fetch('/api/csrf-token', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrfToken;
                return this.csrfToken;
            }
        } catch (error) {
            console.error('❌ Erro ao obter CSRF token:', error);
        }
        
        return null;
    }

    /**
     * Fazer request autenticado com CSRF
     */
    async authenticatedFetch(url, options = {}) {
        // Obter CSRF token se for método state-changing
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
            const csrfToken = await this.getCsrfToken();
            
            if (csrfToken) {
                options.headers = {
                    ...options.headers,
                    'X-CSRF-Token': csrfToken
                };
            }
        }
        
        // Sempre incluir credentials
        options.credentials = 'include';
        
        return fetch(url, options);
    }

    // ==========================================
    // MÉTODOS DE COMPATIBILIDADE
    // (para manter código existente funcionando)
    // ==========================================

    /**
     * Verificar se é admin
     */
    isAdmin() {
        return this.userProfile?.role === 'admin' || 
               this.userProfile?.profile_type === 'admin';
    }

    /**
     * Verificar se é gestor de eventos
     */
    isEventManager() {
        const role = this.userProfile?.role || this.userProfile?.profile_type;
        return role === 'admin' || role === 'event_manager' || role === 'moderator';
    }

    /**
     * Verificar se é participante
     */
    isParticipant() {
        return this.userProfile?.role === 'user' || 
               this.userProfile?.profile_type === 'participant';
    }

    /**
     * Verificar permissão
     */
    hasPermission(permission) {
        const role = this.userProfile?.role || this.userProfile?.profile_type;
        
        // Admin tem todas as permissões
        if (role === 'admin') {
            return true;
        }
        
        // Moderador tem permissões de gestão
        if (role === 'moderator' || role === 'event_manager') {
            return ['view', 'create', 'edit'].includes(permission);
        }
        
        // User tem apenas view
        return permission === 'view';
    }

    /**
     * Redirecionar para login (compatibilidade)
     */
    redirectToLogin() {
        // Guardar URL atual para retornar
        const currentUrl = window.location.href;
        if (!currentUrl.includes('login.html')) {
            sessionStorage.setItem('returnUrl', currentUrl);
        }
        window.location.href = './login.html';
    }

    /**
     * Log de atividade (compatibilidade - não faz nada no client-side)
     */
    async logActivity(action, resourceType, resourceId, details) {
        // No sistema server-side, logs são feitos automaticamente no backend
        console.log(`📋 [LOG] ${action}`, { resourceType, resourceId, details });
        return Promise.resolve();
    }

    /**
     * Redirecionar baseado no perfil (compatibilidade)
     */
    redirectBasedOnProfile() {
        // Verificar returnUrl primeiro
        const returnUrl = sessionStorage.getItem('returnUrl');
        
        if (returnUrl && !returnUrl.includes('login.html')) {
            sessionStorage.removeItem('returnUrl');
            window.location.replace(returnUrl);
            return;
        }
        
        // Usar página padrão do perfil
        const role = this.userProfile?.role || this.userProfile?.profile_type;
        
        let targetPage = 'index-kromi.html';
        
        if (role === 'admin') {
            targetPage = 'index-kromi.html';
        } else if (role === 'moderator' || role === 'event_manager') {
            targetPage = 'events-kromi.html';
        } else {
            targetPage = 'classifications.html';
        }
        
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage !== targetPage && currentPage === 'login.html') {
            window.location.replace(`./${targetPage}`);
        }
    }

    /**
     * Login com telefone (compatibilidade - usar email)
     */
    async signInWithPhone(phone, password) {
        // Por enquanto, usar email
        return this.signInWithEmail(phone, password);
    }

    /**
     * Login com Google (a implementar)
     */
    async signInWithGoogle() {
        throw new Error('Google OAuth não implementado no sistema server-side ainda');
    }
}

// Criar instância global
window.authSystem = new AuthClient();
window.AuthClient = AuthClient;

console.log('✅ AuthClient carregado e disponível globalmente');

