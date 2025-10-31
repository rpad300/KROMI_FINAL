/**
 * ==========================================
 * AUTH CLIENT - Kromi.online
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
            }).catch(() => {
                // Erro de rede - não é sessão inválida
                console.log('⚠️ Erro de rede ao verificar sessão');
                this.currentUser = null;
                this.userProfile = null;
                return null;
            });

            if (!response) {
                return false;
            }

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
                    
                    // Verificar se precisa verificar contacto (mas não redirecionar em páginas públicas)
                    if (data.user.status === 'pending_verification' && 
                        !window.location.pathname.includes('verify-contact.html') &&
                        !window.location.pathname.includes('login.html') &&
                        !window.location.pathname.includes('register.html')) {
                        console.log('⚠️ Conta pendente de verificação. Redirecionando...');
                        window.location.href = '/verify-contact.html';
                        return true; // Retornar true mas redirecionar
                    }
                    
                    // Renovar sessão automaticamente a cada 5 minutos
                    this.startSessionRenewal();
                    
                    return true;
                } else {
                    console.log('ℹ️ Sem sessão ativa (comportamento esperado em páginas públicas)');
                    this.currentUser = null;
                    this.userProfile = null;
                    return false;
                }
            } else if (response.status === 401) {
                // 401 é esperado em páginas públicas - não é um erro
                console.log('ℹ️ Sem sessão válida (comportamento esperado em páginas públicas)');
                this.currentUser = null;
                this.userProfile = null;
                return false;
            } else {
                console.log('❌ Erro ao verificar sessão:', response.status);
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
                // Melhorar tratamento de erros
                const error = new Error(data.message || 'Erro ao fazer login');
                error.code = data.code;
                error.suggestion = data.suggestion;
                throw error;
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
                
                // Verificar se precisa verificar contacto
                if (data.user.status === 'pending_verification') {
                    console.log('⚠️ Conta pendente de verificação. Redirecionando...');
                    window.location.href = '/verify-contact.html';
                    return;
                }
                
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
     * Registro de novo utilizador (dinâmico: email, telefone, ambos, ou Google)
     * @param {string|null} email - Email do utilizador (pode ser null se só telefone)
     * @param {string} password - Palavra-passe
     * @param {string} fullName - Nome completo
     * @param {string|null} phone - Telefone do utilizador (pode ser null se só email)
     * @param {string} method - Método escolhido: 'email', 'phone', 'both'
     */
    async signUp(email, password, fullName, phone = null, method = 'email') {
        try {
            console.log(`📝 Registro método: ${method}`, { email: email || 'N/A', phone: phone || 'N/A' });
            
            // Validação: pelo menos email ou telefone deve estar presente
            if (!email && !phone) {
                throw new Error('Email ou telefone é obrigatório');
            }

            // Inicializar Supabase se necessário
            if (!this.supabase && window.supabaseClient) {
                const initialized = await window.supabaseClient.init();
                if (initialized && window.supabaseClient.supabase) {
                    this.supabase = window.supabaseClient.supabase;
                }
            }
            
            // Se ainda não tem Supabase, tentar usar diretamente
            if (!this.supabase) {
                // Tentar buscar configuração do servidor
                const response = await fetch('/api/config');
                const config = await response.json();
                
                const supabaseUrl = config.SUPABASE_URL;
                const supabaseKey = config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY;
                
                if (!supabaseUrl || !supabaseKey) {
                    throw new Error('Supabase não configurado');
                }
                
                const { createClient } = await import('https://unpkg.com/@supabase/supabase-js@2');
                this.supabase = createClient(supabaseUrl, supabaseKey);
            }
            
            // Obter URL da aplicação para redirect
            let appUrl = 'https://192.168.1.219:1144';
            try {
                const configResponse = await fetch('/api/config');
                const config = await configResponse.json();
                appUrl = config.APP_URL || `https://${window.location.hostname}:${window.location.port}`;
            } catch (e) {
                appUrl = `https://${window.location.hostname}:${window.location.port}`;
            }
            
            const redirectTo = `${appUrl}/auth/callback`;
            
            let userData = null;
            
            // Caso 1: Apenas telefone (sem email)
            if (method === 'phone' && !email && phone) {
                console.log('📱 Registo apenas com telefone via servidor...');
                
                // Para telefone apenas, usar endpoint server-side que cria via Admin API
                const response = await fetch('/api/auth/signup-phone', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        phone: phone,
                        password: password,
                        full_name: fullName
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    const error = new Error(errorData.error || 'Erro ao criar conta com telefone');
                    if (errorData.code === 'PHONE_EXISTS') {
                        error.code = 'DUPLICATE_PHONE';
                        error.suggestion = 'login';
                    }
                    throw error;
                }
                
                const result = await response.json();
                userData = result;
                
                // Se foi criado com sucesso, já foi enviado SMS
                console.log('✅ Conta criada com telefone, SMS enviado');
                return result;
            }
            
            // Caso 2: Email (com ou sem telefone) ou Ambos
            // Supabase requer email para signUp, então usamos email como principal
            if (email) {
                console.log('📧 Registo com email...');
                
                // Verificar duplicados ANTES de tentar criar
                try {
                    const checkResponse = await fetch('/api/auth/check-duplicate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            email: email,
                            phone: phone || null
                        })
                    });
                    
                    if (checkResponse.ok) {
                        const checkResult = await checkResponse.json();
                        if (checkResult.exists) {
                            let errorMsg = '';
                            if (checkResult.type === 'email') {
                                errorMsg = 'Este email já está registado. Por favor, faça login.';
                            } else if (checkResult.type === 'phone') {
                                errorMsg = 'Este telefone já está registado. Por favor, faça login.';
                            } else {
                                errorMsg = 'Este email ou telefone já está registado. Por favor, faça login.';
                            }
                            
                            const duplicateError = new Error(errorMsg);
                            duplicateError.code = 'DUPLICATE_CONTACT';
                            duplicateError.suggestion = 'login';
                            throw duplicateError;
                        }
                    }
                } catch (checkError) {
                    // Se é erro de duplicado, propagar
                    if (checkError.code === 'DUPLICATE_CONTACT') {
                        throw checkError;
                    }
                    // Outros erros na verificação são ignorados (permite registo)
                    console.warn('⚠️ Erro ao verificar duplicados (continuando):', checkError);
                }
                
                // Criar utilizador no Supabase com email
                const { data, error } = await this.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: phone || null
                        },
                        emailRedirectTo: email ? redirectTo : undefined
                    }
                });

                if (error) {
                    // Melhorar mensagens de erro do Supabase
                    if (error.message.includes('already registered') || error.message.includes('User already registered') || error.message.includes('already exists')) {
                        const duplicateError = new Error('Este email já está registado. Por favor, faça login.');
                        duplicateError.code = 'DUPLICATE_EMAIL';
                        duplicateError.suggestion = 'login';
                        throw duplicateError;
                    }
                    throw error;
                }
                
                userData = data;

                // Criar perfil como participante por padrão (status pending_verification)
                if (data.user) {
                    try {
                        const { error: profileError } = await this.supabase
                            .from('user_profiles')
                            .insert({
                                user_id: data.user.id,
                                email: email,
                                name: fullName,
                                full_name: fullName,
                                phone: phone,
                                profile_type: 'participant',
                                role: 'user', // SEMPRE user por padrão - apenas admin pode alterar
                                status: 'pending_verification', // Aguardando verificação
                                is_active: false // Inativo até confirmar contacto
                            });

                        if (profileError) {
                            console.warn('⚠️ Erro ao criar perfil:', profileError);
                            // Não falhar o registro se o perfil não for criado
                        } else {
                            // Se tem telefone E método é 'both', enviar SMS via Supabase Auth
                            if (phone && method === 'both' && this.supabase) {
                                try {
                                    const { data: smsData, error: smsError } = await this.supabase.auth.signInWithOtp({
                                        phone: phone,
                                        options: {
                                            channel: 'sms'
                                        }
                                    });
                                    
                                    if (!smsError) {
                                        console.log('📱 SMS de verificação enviado via Supabase Auth');
                                    } else {
                                        console.warn('⚠️ Erro ao enviar SMS:', smsError);
                                    }
                                } catch (smsError) {
                                    console.warn('⚠️ Erro ao enviar SMS:', smsError);
                                }
                            }
                        }
                    } catch (profileError) {
                        console.warn('⚠️ Erro ao criar perfil:', profileError);
                        // Não falhar o registro se o perfil não for criado
                    }
                }

                // Se o registro foi bem-sucedido, enviar email de confirmação usando sistema da plataforma
                if (data.user && !data.session && email) {
                    // Usuário criado mas precisa confirmar email
                    try {
                        console.log('📧 Solicitando envio de email de confirmação...');
                        
                        // Chamar rota do servidor para enviar email customizado
                        const emailResponse = await fetch('/api/auth/send-confirmation-email', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                email: email,
                                user_name: fullName,
                                user_id: data.user.id,
                                type: 'signup'
                            })
                        });
                        
                        if (emailResponse.ok) {
                            const emailResult = await emailResponse.json();
                            console.log('✅ Email de confirmação solicitado:', emailResult.message);
                        } else {
                            console.warn('⚠️ Não foi possível enviar email de confirmação customizado');
                        }
                    } catch (emailError) {
                        console.warn('⚠️ Erro ao solicitar envio de email:', emailError);
                        // Não falhar o registro se o email falhar
                    }
                }
                
                console.log('✅ Registro bem-sucedido:', email);
                return data;
            }
            
            throw new Error('Método de registo inválido');
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            throw error;
        }
    }

    /**
     * Login com Google OAuth
     */
    async signInWithGoogle() {
        try {
            console.log('🔐 Iniciando login com Google...');
            
            // Redirecionar para endpoint server-side que inicia OAuth
            window.location.href = '/api/auth/google';
            
        } catch (error) {
            console.error('❌ Erro no login com Google:', error);
            throw error;
        }
    }
}

// Criar instância global
window.authSystem = new AuthClient();
window.AuthClient = AuthClient;

console.log('✅ AuthClient carregado e disponível globalmente');

