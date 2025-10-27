/**
 * VisionKrono - Serviço de Navegação
 * Aplica regras de visibilidade e permissões aos menus
 * 
 * @version 2025.10.26
 */

class NavigationService {
    constructor() {
        this.config = window.NavigationConfig;
        this.authSystem = null;
        this.eventContext = null;
        this.currentUser = null;
        this.currentRole = null;
        
        console.log('[NAV-SERVICE] Serviço de navegação inicializado');
    }

    /**
     * Inicializar serviço com dependências
     */
    async init() {
        try {
            // Aguardar AuthSystem
            await this.waitForAuthSystem();
            this.authSystem = window.authSystem;
            
            // Aguardar EventContext (se disponível)
            this.eventContext = window.eventContext || null;
            
            // Carregar dados do utilizador
            await this.loadCurrentUser();
            
            console.log('[NAV-SERVICE] Serviço inicializado com sucesso', {
                user: this.currentUser?.email,
                role: this.currentRole
            });
            
            return true;
        } catch (error) {
            console.error('[NAV-SERVICE] Erro ao inicializar serviço:', error);
            return false;
        }
    }

    /**
     * Aguardar AuthSystem estar pronto
     */
    async waitForAuthSystem() {
        return new Promise((resolve) => {
            const tick = () => {
                if (window.authSystem?.currentUser !== undefined) {
                    resolve();
                } else {
                    setTimeout(tick, 100);
                }
            };
            tick();
        });
    }

    /**
     * Carregar dados do utilizador atual
     */
    async loadCurrentUser() {
        if (!this.authSystem) {
            throw new Error('AuthSystem não disponível');
        }

        this.currentUser = this.authSystem.currentUser;
        
        // Obter role do perfil
        const profile = this.authSystem.userProfile;
        this.currentRole = profile?.role || profile?.profile_type || 'user';
        
        console.log('[NAV-SERVICE] Utilizador carregado:', {
            email: this.currentUser?.email,
            role: this.currentRole
        });
    }

    /**
     * Obter menu global filtrado por permissões
     */
    getGlobalMenu() {
        if (!this.currentRole) {
            console.warn('[NAV-SERVICE] Role não disponível, retornando menu vazio');
            return [];
        }

        const menu = this.config.globalMenu.filter(item => {
            return this.config.hasAccess(item, this.currentRole);
        });

        console.log('[NAV-SERVICE] Menu global gerado:', {
            total: this.config.globalMenu.length,
            visible: menu.length,
            role: this.currentRole
        });

        return menu;
    }

    /**
     * Obter menu de evento filtrado por permissões e contexto
     */
    getEventMenu(eventId = null) {
        if (!this.currentRole) {
            console.warn('[NAV-SERVICE] Role não disponível, retornando menu vazio');
            return [];
        }

        // Se não há eventId, retornar vazio
        if (!eventId && !this.eventContext?.currentEventId) {
            console.log('[NAV-SERVICE] Sem contexto de evento, menu vazio');
            return [];
        }

        const activeEventId = eventId || this.eventContext?.currentEventId;

        const menu = this.config.eventMenu.filter(item => {
            return this.config.hasAccess(item, this.currentRole);
        });

        console.log('[NAV-SERVICE] Menu de evento gerado:', {
            eventId: activeEventId,
            total: this.config.eventMenu.length,
            visible: menu.length,
            role: this.currentRole
        });

        return menu;
    }

    /**
     * Verificar se utilizador pode acessar um evento específico
     */
    async canAccessEvent(eventId) {
        if (!eventId || !this.currentUser) {
            return false;
        }

        // Admin tem acesso total
        if (this.currentRole === 'admin') {
            return true;
        }

        try {
            const supabase = window.supabaseClient?.supabase;
            if (!supabase) {
                throw new Error('Supabase não disponível');
            }

            // Verificar se é organizador do evento
            if (this.currentRole === 'moderator' || this.currentRole === 'event_manager') {
                const { data, error } = await supabase
                    .from('events')
                    .select('organizer_id, id')
                    .eq('id', eventId)
                    .single();

                if (error) throw error;

                return data?.organizer_id === this.currentUser.id;
            }

            // Verificar se é participante do evento
            if (this.currentRole === 'user' || this.currentRole === 'participant') {
                const { data, error } = await supabase
                    .from('participants')
                    .select('id')
                    .eq('event_id', eventId)
                    .eq('user_id', this.currentUser.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                return !!data;
            }

            return false;
        } catch (error) {
            console.error('[NAV-SERVICE] Erro ao verificar acesso ao evento:', error);
            return false;
        }
    }

    /**
     * Obter item de menu com informações de contexto
     */
    getMenuItem(id) {
        const item = this.config.getMenuItem(id);
        if (!item) return null;

        return {
            ...item,
            hasAccess: this.config.hasAccess(item, this.currentRole),
            scope: this.config.getScope(item, this.currentRole),
            readonly: this.config.isReadonly(item, this.currentRole)
        };
    }

    /**
     * Construir URL com contexto de evento
     */
    buildEventUrl(route, eventId = null) {
        const activeEventId = eventId || this.eventContext?.currentEventId;
        
        if (!activeEventId) {
            return route;
        }

        // Adicionar eventId como query parameter
        const url = new URL(route, window.location.origin);
        url.searchParams.set('event', activeEventId);
        
        return url.pathname + url.search;
    }

    /**
     * Obter contexto de evento atual
     */
    getCurrentEventContext() {
        if (!this.eventContext) {
            return null;
        }

        return {
            eventId: this.eventContext.currentEventId,
            eventName: this.eventContext.currentEventName,
            hasEvent: !!this.eventContext.currentEventId
        };
    }

    /**
     * Atualizar contexto de evento
     */
    setEventContext(eventId, eventName = null) {
        if (this.eventContext) {
            this.eventContext.currentEventId = eventId;
            this.eventContext.currentEventName = eventName;
        } else {
            // Criar contexto se não existir
            this.eventContext = {
                currentEventId: eventId,
                currentEventName: eventName
            };
            window.eventContext = this.eventContext;
        }

        console.log('[NAV-SERVICE] Contexto de evento atualizado:', {
            eventId,
            eventName
        });

        // Disparar evento personalizado para notificar componentes
        window.dispatchEvent(new CustomEvent('eventContextChanged', {
            detail: { eventId, eventName }
        }));
    }

    /**
     * Limpar contexto de evento
     */
    clearEventContext() {
        if (this.eventContext) {
            this.eventContext.currentEventId = null;
            this.eventContext.currentEventName = null;
        }

        console.log('[NAV-SERVICE] Contexto de evento limpo');

        window.dispatchEvent(new CustomEvent('eventContextCleared'));
    }

    /**
     * Obter navegação completa (global + evento)
     */
    getCompleteNavigation(eventId = null) {
        const navigation = {
            global: this.getGlobalMenu(),
            event: this.getEventMenu(eventId),
            context: this.getCurrentEventContext(),
            user: {
                email: this.currentUser?.email,
                role: this.currentRole
            }
        };

        return navigation;
    }

    /**
     * Verificar se rota atual requer contexto de evento
     */
    currentRouteRequiresEvent() {
        const currentPage = window.location.pathname.split('/').pop();
        
        const eventPages = this.config.eventMenu.map(item => {
            const route = item.route.split('?')[0];
            return route.split('/').pop();
        });

        return eventPages.includes(currentPage);
    }

    /**
     * Redirecionar para rota com verificação de permissões
     */
    navigateTo(route, eventId = null) {
        const url = eventId ? this.buildEventUrl(route, eventId) : route;
        
        console.log('[NAV-SERVICE] Navegando para:', url);
        window.location.href = url;
    }

    /**
     * Obter escopo de dados para eventos
     */
    getEventDataScope() {
        const eventsItem = this.config.getMenuItem('events');
        if (!eventsItem) return 'none';

        return this.config.getScope(eventsItem, this.currentRole);
    }
}

// Criar instância global
if (typeof window !== 'undefined') {
    window.navigationService = new NavigationService();
}

// Export para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationService;
}

