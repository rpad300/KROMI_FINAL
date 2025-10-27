// Sistema de Autenticação com Supabase
// Gestão completa de utilizadores com diferentes perfis

class AuthSystem {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userProfile = null;
        this.sessionTimeout = 48 * 60 * 60 * 1000; // 48 horas em millisegundos
        this.authListener = null; // Guardar subscription do listener
        this.init();
    }

    async init() {
        try {
            // Aguardar inicialização do SupabaseClient existente
            await this.waitForSupabaseClient();
            
            // Verificar sessão existente
            await this.checkExistingSession();
            
            // Configurar listeners de autenticação
            this.setupAuthListeners();
            
            console.log('Sistema de autenticação inicializado');
        } catch (error) {
            console.error('Erro ao inicializar sistema de autenticação:', error);
        }
    }

    async waitForSupabaseClient() {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        console.log('🔍 Aguardando inicialização do SupabaseClient...');
        
        while (attempts < maxAttempts) {
            // Se não está inicializado, inicializar
            if (window.supabaseClient && !window.supabaseClient.initialized) {
                console.log('🔧 Inicializando SupabaseClient...');
                await window.supabaseClient.init();
            }
            
            // Verificar se existe o SupabaseClient global
            if (window.supabaseClient && window.supabaseClient.supabase) {
                this.supabase = window.supabaseClient.supabase;
                console.log('✅ Sistema de autenticação conectado ao SupabaseClient existente');
                console.log('🔍 Supabase client:', this.supabase);
                return;
            }
            
            console.log(`⏳ Tentativa ${attempts + 1}/${maxAttempts} - SupabaseClient ainda não disponível`);
            console.log('🔍 window.supabaseClient:', window.supabaseClient);
            console.log('🔍 window.supabaseClient?.supabase:', window.supabaseClient?.supabase);
            
            // Aguardar um pouco
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.error('❌ SupabaseClient não inicializado após 5 segundos');
        console.error('🔍 Estado final - window.supabaseClient:', window.supabaseClient);
        throw new Error('SupabaseClient não inicializado');
    }

    setupAuthListeners() {
        // Prevenir múltiplos listeners
        if (this.authListener) {
            console.log('⚠️ Listener de autenticação já existe - não criar outro');
            return;
        }
        
        // Listener para mudanças de autenticação
        const { data: { subscription } } = this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Estado de autenticação mudou:', event, session);
            
            // IMPORTANTE: Apenas processar SIGNED_IN se estivermos na página de LOGIN
            // Caso contrário, vai criar loops de redirecionamento
            if (event === 'SIGNED_IN' && session) {
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                console.log('🔍 SIGNED_IN detectado na página:', currentPage);
                
                // Apenas processar handleSignIn se estivermos na página de login
                if (currentPage === 'login.html') {
                    console.log('✅ Processando handleSignIn porque estamos em login.html');
                    await this.handleSignIn(session);
                } else {
                    console.log('⏸️ Ignorando SIGNED_IN porque não estamos em login.html');
                    // Apenas atualizar currentUser e userProfile sem redirecionar
                    this.currentUser = session.user;
                    if (!this.userProfile) {
                        await this.loadUserProfile().catch(err => console.error('Erro ao carregar perfil:', err));
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                await this.handleSignOut();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                await this.handleTokenRefresh(session);
            }
        });
        
        // Guardar subscription para poder cancelar depois se necessário
        this.authListener = subscription;
        console.log('✅ Listener de autenticação configurado');
    }

    async checkExistingSession() {
        try {
            await window.debugAuth?.logAuthEvent('Verificando sessão existente');
            
            // Adicionar timeout de 10s para verificação de sessão
            const sessionPromise = this.supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout na verificação de sessão (10s)')), 10000)
            );
            
            let session, error;
            
            try {
                const result = await Promise.race([sessionPromise, timeoutPromise]);
                session = result.data.session;
                error = result.error;
            } catch (timeoutError) {
                await window.debugAuth?.logError('TIMEOUT ao verificar sessão - tentando método alternativo', timeoutError);
                console.warn('⚠️ Timeout ao verificar sessão via getSession() - tentando getUser()');
                
                // Método alternativo: tentar getUser() que é mais rápido
                try {
                    const { data: { user }, error: userError } = await this.supabase.auth.getUser();
                    if (user && !userError) {
                        console.log('✅ Sessão recuperada via getUser()');
                        this.currentUser = user;
                        // Carregar perfil diretamente
                        try {
                            await this.loadUserProfile();
                            if (this.userProfile) {
                                await window.debugAuth?.logInfo('Perfil carregado via método alternativo', { profile: this.userProfile.profile_type });
                            }
                        } catch (profileError) {
                            console.error('Erro ao carregar perfil:', profileError);
                        }
                        return;
                    }
                } catch (altError) {
                    console.error('Método alternativo também falhou:', altError);
                }
                
                console.warn('⚠️ Não foi possível recuperar sessão - continuando sem autenticação');
                return; // Continua sem sessão
            }
            
            if (error) {
                await window.debugAuth?.logError('Erro ao verificar sessão', error);
                return;
            }

            if (session) {
                await window.debugAuth?.logSessionEvent('Sessão existente encontrada', { email: session.user.email });
                this.currentUser = session.user;
                
                // Carregar perfil com timeout CURTO (5s)
                try {
                    await Promise.race([
                        this.loadUserProfile(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout no carregamento do perfil (5s)')), 5000))
                    ]);
                } catch (profileError) {
                    await window.debugAuth?.logError('Erro ao carregar perfil', profileError);
                    console.error('Erro ao carregar perfil:', profileError);
                    // Continua mesmo sem perfil - não bloqueia
                }
                
                // NÃO redirecionar automaticamente - deixar o universal-route-protection.js gerir
                if (this.userProfile) {
                    await window.debugAuth?.logInfo('Perfil carregado - aguardando redirecionamento do universal-route-protection', { profile: this.userProfile.profile_type });
                }
            } else {
                await window.debugAuth?.logAuthEvent('Nenhuma sessão encontrada');
                // Só redirecionar para login se não estiver já lá
                if (!window.location.pathname.includes('login')) {
                    this.redirectToLogin();
                }
            }
        } catch (error) {
            await window.debugAuth?.logError('Erro ao verificar sessão existente', error);
            console.error('Erro detalhado ao verificar sessão:', error);
            if (!window.location.pathname.includes('login')) {
                this.redirectToLogin();
            }
        }
    }

    async handleSignIn(session) {
        try {
            await window.debugAuth?.logAuthEvent('Iniciando handleSignIn', { email: session.user.email });
            
            this.currentUser = session.user;
            
            // Obter perfil do utilizador COM TIMEOUT
            await window.debugAuth?.logInfo('Carregando perfil do utilizador...');
            try {
                await Promise.race([
                    this.loadUserProfile(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao carregar perfil (5s)')), 5000))
                ]);
                await window.debugAuth?.logInfo('Perfil carregado com sucesso', { profile: this.userProfile?.profile_type });
            } catch (profileError) {
                await window.debugAuth?.logError('Erro/Timeout ao carregar perfil', profileError);
                console.error('Erro ao carregar perfil:', profileError);
                // Continua mesmo sem perfil - não bloqueia
            }
            
            // NÃO redirecionar automaticamente - deixar o universal-route-protection.js gerir
            await window.debugAuth?.logInfo('Login processado - aguardando redirecionamento do universal-route-protection', { profile: this.userProfile?.profile_type });
            
            // Criar/atualizar sessão na base de dados (não bloquear)
            this.createUserSession(session).catch(async error => {
                await window.debugAuth?.logError('Erro ao criar sessão', error);
                console.error('Erro detalhado ao criar sessão:', error);
            });
            
            // Log da atividade (não bloquear)
            this.logActivity('LOGIN', 'user', this.currentUser.id).catch(async error => {
                await window.debugAuth?.logError('Erro ao registar atividade', error);
                console.error('Erro detalhado ao registar atividade:', error);
            });
            
            await window.debugAuth?.logSuccess('handleSignIn concluído com sucesso');
            
            // Notificar universal-route-protection para verificar redirecionamento
            if (window.universalProtection) {
                await window.debugAuth?.logInfo('Notificando universal-route-protection para verificar redirecionamento');
                await window.universalProtection.handlePublicPage();
            }
            
        } catch (error) {
            await window.debugAuth?.logError('Erro ao processar login', error);
            console.error('Erro detalhado no handleSignIn:', error);
            this.showError('Erro ao fazer login. Tente novamente.');
        }
    }

    async handleSignOut() {
        try {
            // Limpar sessão da base de dados
            if (this.currentUser) {
                await this.endUserSession();
                await this.logActivity('LOGOUT', 'user', this.currentUser.id);
            }
            
            this.currentUser = null;
            this.userProfile = null;
            
            // Redirecionar para login
            this.redirectToLogin();
            
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    async handleTokenRefresh(session) {
        try {
            console.log('Token renovado para:', session.user.email);
            this.currentUser = session.user;
            
            // Apenas atualizar sessão existente, não criar nova
            this.updateUserSession(session).catch(error => {
                console.error('Erro ao atualizar sessão:', error);
            });
        } catch (error) {
            console.error('Erro ao atualizar token:', error);
        }
    }

    async loadUserProfile() {
        try {
            console.log('Carregando perfil para utilizador:', this.currentUser.id);
            
            // Adicionar timeout para evitar bloqueio
            const profilePromise = this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout no carregamento do perfil')), 8000)
            );
            
            const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

            if (error) {
                console.error('Erro ao carregar perfil:', error);
                
                // Se não existe perfil, criar um básico
                if (error.code === 'PGRST116') {
                    console.log('Perfil não existe - criando perfil básico');
                    await this.createBasicProfile();
                    return;
                }
                
                // Para outros erros (incluindo timeout), usar perfil padrão
                console.warn('Erro ao carregar perfil - usando perfil padrão admin');
                this.userProfile = {
                    user_id: this.currentUser.id,
                    profile_type: 'admin', // Perfil admin padrão
                    created_at: new Date().toISOString()
                };
                return;
            }

            this.userProfile = data;
            console.log('Perfil carregado com sucesso:', this.userProfile);
            
        } catch (error) {
            console.error('Erro ao carregar perfil do utilizador:', error);
            
            // Em caso de erro (incluindo timeout), usar perfil admin padrão
            console.warn('Usando perfil admin padrão devido a erro');
            this.userProfile = {
                user_id: this.currentUser.id,
                profile_type: 'admin', // Perfil admin padrão
                created_at: new Date().toISOString()
            };
        }
    }

    async createBasicProfile() {
        try {
            console.log('Criando perfil básico para:', this.currentUser.email);
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .insert({
                    user_id: this.currentUser.id,
                    email: this.currentUser.email,
                    profile_type: 'admin', // Default para admin
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao criar perfil básico:', error);
                throw error;
            }

            this.userProfile = data;
            console.log('Perfil básico criado:', this.userProfile);
            
        } catch (error) {
            console.error('Erro ao criar perfil básico:', error);
            throw error;
        }
    }

    async createUserSession(session) {
        try {
            const expiresAt = new Date(Date.now() + this.sessionTimeout);
            
            const { error } = await this.supabase
                .from('user_sessions')
                .upsert({
                    user_id: this.currentUser.id,
                    session_token: session.access_token,
                    expires_at: expiresAt.toISOString(),
                    last_activity: new Date().toISOString(),
                    is_active: true
                });

            if (error) {
                console.error('Erro ao criar sessão:', error);
            }
        } catch (error) {
            console.error('Erro ao criar sessão do utilizador:', error);
        }
    }

    async updateUserSession(session) {
        try {
            const expiresAt = new Date(Date.now() + this.sessionTimeout);
            
            const { error } = await this.supabase
                .from('user_sessions')
                .update({
                    session_token: session.access_token,
                    expires_at: expiresAt.toISOString(),
                    last_activity: new Date().toISOString()
                })
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true);

            if (error) {
                console.error('Erro ao atualizar sessão:', error);
            }
        } catch (error) {
            console.error('Erro ao atualizar sessão do utilizador:', error);
        }
    }

    async endUserSession() {
        try {
            const { error } = await this.supabase
                .from('user_sessions')
                .update({ is_active: false })
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true);

            if (error) {
                console.error('Erro ao terminar sessão:', error);
            }
        } catch (error) {
            console.error('Erro ao terminar sessão do utilizador:', error);
        }
    }

    async logActivity(action, resourceType = null, resourceId = null, details = null) {
        try {
            const { error } = await this.supabase
                .from('activity_logs')
                .insert({
                    user_id: this.currentUser?.id,
                    action: action,
                    resource_type: resourceType,
                    resource_id: resourceId,
                    details: details,
                    ip_address: await this.getClientIP(),
                    user_agent: navigator.userAgent
                });

            if (error) {
                console.error('Erro ao registar atividade:', error);
            }
        } catch (error) {
            console.error('Erro ao registar atividade:', error);
        }
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Métodos de autenticação
    async signInWithEmail(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro no login com email:', error);
            throw error;
        }
    }

    async signInWithPhone(phone, password) {
        try {
            // Para login com telefone, vamos usar o email associado ao telefone
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('email')
                .eq('phone', phone)
                .single();

            if (!profile) {
                throw new Error('Telefone não encontrado');
            }

            return await this.signInWithEmail(profile.email, password);
        } catch (error) {
            console.error('Erro no login com telefone:', error);
            throw error;
        }
    }

    async signInWithGoogle() {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro no login com Google:', error);
            throw error;
        }
    }

    async signUp(email, password, fullName, phone = null) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone
                    }
                }
            });

            if (error) {
                throw error;
            }

            // Criar perfil como participante por padrão
            if (data.user) {
                await this.createUserProfile(data.user.id, email, fullName, phone, 'participant');
            }

            return data;
        } catch (error) {
            console.error('Erro no registo:', error);
            throw error;
        }
    }

    async createUserProfile(userId, email, fullName, phone, profileType) {
        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .insert({
                    user_id: userId,
                    email: email,
                    full_name: fullName,
                    phone: phone,
                    profile_type: profileType,
                    is_active: true
                });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Erro ao criar perfil:', error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                throw error;
            }

            await this.logActivity('PASSWORD_RESET_REQUEST', 'user', null, { email });
        } catch (error) {
            console.error('Erro ao solicitar reset de password:', error);
            throw error;
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            await this.logActivity('PASSWORD_UPDATED', 'user', this.currentUser.id);
        } catch (error) {
            console.error('Erro ao atualizar password:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw error;
        }
    }

    // Métodos de verificação de permissões
    hasPermission(requiredProfile) {
        if (!this.userProfile) {
            return false;
        }

        // Admin tem acesso a tudo
        if (this.userProfile.profile_type === 'admin') {
            return true;
        }

        return this.userProfile.profile_type === requiredProfile;
    }

    isAdmin() {
        return this.hasPermission('admin');
    }

    isEventManager() {
        return this.hasPermission('event_manager');
    }

    isParticipant() {
        return this.hasPermission('participant');
    }

    // Métodos de redirecionamento
    redirectBasedOnProfile() {
        console.log('Redirecionando baseado no perfil:', this.userProfile);
        
        if (!this.userProfile) {
            console.log('Sem perfil - redirecionando para login');
            this.redirectToLogin();
            return;
        }

        const profile = this.userProfile.profile_type;
        console.log('Perfil do utilizador:', profile);
        
        // Verificar se já está na página correta para evitar loop infinito
        const currentPage = window.location.pathname.split('/').pop();
        let targetPage = '';
        
        switch (profile) {
            case 'admin':
                targetPage = 'index-kromi.html';
                break;
            case 'event_manager':
                targetPage = 'events.html';
                break;
            case 'participant':
                targetPage = 'classifications.html';
                break;
            default:
                window.debugAuth?.logError('Perfil desconhecido - redirecionando para login', { profile });
                console.log('Perfil desconhecido - redirecionando para login');
                this.redirectToLogin();
                return;
        }
        
        // SOLUÇÃO DEFINITIVA: Só redirecionar se estiver na página de login
        if (currentPage === 'login.html') {
            console.log(`Redirecionando de ${currentPage} para ${targetPage}`);
            // Aguardar um pouco para garantir que o perfil foi carregado
            setTimeout(async () => {
                switch (profile) {
                    case 'admin':
                        await window.debugAuth?.logRedirectEvent('Redirecionando admin para index-kromi');
                        console.log('Redirecionando admin para index-kromi');
                        window.location.href = './index-kromi.html';
                        break;
                    case 'event_manager':
                        await window.debugAuth?.logRedirectEvent('Redirecionando event manager para eventos');
                        console.log('Redirecionando event manager para eventos');
                        window.location.href = './events.html';
                        break;
                    case 'participant':
                        await window.debugAuth?.logRedirectEvent('Redirecionando participante para classificações');
                        console.log('Redirecionando participante para classificações');
                        window.location.href = './classifications.html';
                        break;
                }
            }, 500);
        } else {
            console.log(`Não redirecionando - já está em: ${currentPage}`);
            window.debugAuth?.logInfo(`Não redirecionando - já está em: ${currentPage}`);
        }
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login')) {
            console.log('Redirecionando para login');
            window.location.href = './login.html';
        }
    }

    // Métodos de gestão de utilizadores (apenas para admins)
    async getAllUsers() {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado');
        }

        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    *,
                    auth_users:user_id(email, created_at, last_sign_in_at)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro ao obter utilizadores:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, updates) {
        if (!this.isAdmin()) {
            throw new Error('Acesso negado');
        }

        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .update(updates)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            await this.logActivity('USER_PROFILE_UPDATED', 'user_profile', userId, updates);
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }

    // Métodos de utilidade
    showError(message) {
        // Implementar notificação de erro
        console.error(message);
        alert(message); // Substituir por sistema de notificações mais elegante
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        console.log(message);
        alert(message); // Substituir por sistema de notificações mais elegante
    }

    // Limpeza automática de sessões expiradas
    async cleanupExpiredSessions() {
        try {
            const { error } = await this.supabase.rpc('cleanup_expired_sessions');
            if (error) {
                console.error('Erro ao limpar sessões expiradas:', error);
            }
        } catch (error) {
            console.error('Erro ao limpar sessões expiradas:', error);
        }
    }
}

// Inicializar sistema de autenticação globalmente
window.authSystem = new AuthSystem();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
