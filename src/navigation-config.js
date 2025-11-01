/**
 * Kromi.online - Configuração Central de Navegação
 * Fonte única de verdade para menus, rotas, permissões e labels
 * 
 * @version 2025.10.26
 */

const NavigationConfig = {
    /**
     * Menus Globais (sempre visíveis na plataforma)
     */
    globalMenu: [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: '📊',
            route: 'index-kromi.html',
            type: 'global',
            roles: ['admin', 'moderator', 'event_manager', 'user', 'participant'],
            description: 'Visão geral da plataforma'
        },
        {
            id: 'events',
            label: 'Eventos',
            icon: '🏃',
            route: 'events-kromi.html',
            type: 'global',
            roles: ['admin', 'moderator', 'event_manager', 'user', 'participant'],
            description: 'Gestão de eventos desportivos',
            scope: {
                admin: 'all',           // Vê todos os eventos
                moderator: 'own',       // Vê apenas os seus eventos
                event_manager: 'own',   // Vê apenas os seus eventos
                user: 'participant',    // Vê eventos onde é participante
                participant: 'participant'
            }
        },
        {
            id: 'users',
            label: 'Utilizadores',
            icon: '👥',
            route: 'usuarios.html',
            type: 'global',
            roles: ['admin'],
            description: 'Gestão de utilizadores da plataforma'
        },
        {
            id: 'profiles-permissions',
            label: 'Perfis & Permissões',
            icon: '🔐',
            route: 'perfis-permissoes.html',
            type: 'global',
            roles: ['admin'],
            description: 'Configurar roles e acessos'
        },
        {
            id: 'email-templates',
            label: 'Templates de Email',
            icon: '📧',
            route: 'email-templates-platform.html',
            type: 'global',
            roles: ['admin'],
            description: 'Gestão de templates de email da plataforma'
        },
        {
            id: 'settings',
            label: 'Configurações',
            icon: '⚙️',
            route: 'configuracoes.html',
            type: 'global',
            roles: ['admin'],
            description: 'Configurações do sistema'
        },
        {
            id: 'audit',
            label: 'Auditoria',
            icon: '📋',
            route: 'logs-auditoria.html',
            type: 'global',
            roles: ['admin'],
            description: 'Logs de auditoria e histórico'
        },
        {
            id: 'ai-cost-stats',
            label: 'AI Cost Stats',
            icon: '💰',
            route: 'ai-cost-stats.html',
            type: 'global',
            roles: ['admin'],
            description: 'Estatísticas de custos de IA'
        },
        {
            id: 'branding-seo',
            label: 'Branding e SEO',
            icon: '🎨',
            route: 'branding-seo',
            type: 'global',
            roles: ['admin'],
            description: 'Gestão de logos, metadados e SEO'
        },
        {
            id: 'database',
            label: 'Gestão BD',
            icon: '🗄️',
            route: 'database-management-kromi.html',
            type: 'global',
            roles: ['admin'],
            description: 'Gestão da base de dados'
        },
        {
            id: 'processor-global',
            label: 'Processador IA',
            icon: '🤖',
            route: 'image-processor-kromi.html',
            type: 'global',
            roles: ['admin'],
            description: 'Processamento IA de todos os eventos',
            scope: 'all'  // Ver processamentos de todos os eventos
        },
        {
            id: 'profile',
            label: 'Meu Perfil',
            icon: '👤',
            route: 'meu-perfil.html',
            type: 'global',
            roles: ['admin', 'moderator', 'event_manager', 'user', 'participant'],
            description: 'Configurações do perfil pessoal'
        }
    ],

    /**
     * Menus de Evento (só aparecem quando há contexto de evento ativo)
     */
    eventMenu: [
        {
            id: 'event-dashboard',
            label: 'Dashboard',
            icon: '📊',
            route: 'config-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager', 'user', 'participant'],
            description: 'Dashboard do evento',
            showBackButton: true,
            backRoute: 'index-kromi.html',
            backLabel: 'Voltar ao Dashboard Global'
        },
        {
            id: 'detection',
            label: 'Deteção',
            icon: '📱',
            route: 'detection-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Deteção de dorsais e cronometragem'
        },
        {
            id: 'classifications',
            label: 'Classificações',
            icon: '🏆',
            route: 'classifications-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager', 'user', 'participant'],
            description: 'Rankings e classificações',
            readonly: {
                user: true,
                participant: true
            }
        },
        {
            id: 'participants',
            label: 'Participantes',
            icon: '👥',
            route: 'participants-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Gestão de participantes'
        },
        {
            id: 'form-builder',
            label: 'Formulários',
            icon: '📋',
            route: 'form-builder-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Formulários de inscrição dinâmicos'
        },
        {
            id: 'gps-tracking',
            label: 'GPS Tracking',
            icon: '📍',
            route: 'gps-tracking-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Cronometragem GPS em tempo real'
        },
        {
            id: 'devices',
            label: 'Dispositivos',
            icon: '📲',
            route: 'devices-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Gestão de dispositivos de captura'
        },
        {
            id: 'calibration',
            label: 'Calibração',
            icon: '🎚️',
            route: 'calibration-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Calibração de IA e sistemas'
        },
        {
            id: 'checkpoint-order',
            label: 'Ordem Checkpoints',
            icon: '🚩',
            route: 'checkpoint-order-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Configuração da ordem dos checkpoints'
        },
        {
            id: 'category-rankings',
            label: 'Por Escalão',
            icon: '🎯',
            route: 'category-rankings-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager', 'user', 'participant'],
            description: 'Classificações por escalão',
            readonly: {
                user: true,
                participant: true
            }
        },
        {
            id: 'live-stream',
            label: 'Live Stream',
            icon: '📹',
            route: 'src/live-stream.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Transmissão ao vivo dos dispositivos'
        },
        {
            id: 'image-processor',
            label: 'Processador IA',
            icon: '🤖',
            route: 'image-processor-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Processamento IA deste evento',
            scope: 'event'  // Ver processamentos apenas deste evento
        },
        {
            id: 'event-email-templates',
            label: 'Templates de Email',
            icon: '📧',
            route: 'email-templates-event.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Templates de email do evento'
        },
        {
            id: 'event-settings',
            label: 'Configurações',
            icon: '⚙️',
            route: 'config-kromi.html',
            type: 'event',
            roles: ['admin', 'moderator', 'event_manager'],
            description: 'Configurações do evento'
        }
    ],

    /**
     * Mapeamento de roles para prioridades (usado em fallbacks)
     */
    rolePriority: {
        admin: 100,
        moderator: 80,
        event_manager: 80,
        user: 50,
        participant: 50
    },

    /**
     * Normalização de roles (aliases)
     */
    roleAliases: {
        'event_manager': 'moderator',
        'participant': 'user',
        'guest': 'user'  // Guest vê menus de user (básicos)
    },

    /**
     * Configuração de ícones por tipo de item
     */
    icons: {
        back: '◀️',
        separator: '―',
        external: '🔗',
        locked: '🔒',
        warning: '⚠️'
    },

    /**
     * Labels de contexto
     */
    labels: {
        globalSection: 'Menu Principal',
        eventSection: 'Menu do Evento',
        noEvent: 'Selecione um evento',
        backToGlobal: 'Voltar ao Dashboard',
        accessDenied: 'Acesso Negado',
        loginRequired: 'Login Necessário'
    },

    /**
     * Obter item de menu por ID
     */
    getMenuItem(id) {
        return [...this.globalMenu, ...this.eventMenu].find(item => item.id === id);
    },

    /**
     * Verificar se um role tem acesso a um item
     */
    hasAccess(item, userRole) {
        if (!item || !item.roles) return false;
        
        // Normalizar role
        const normalizedRole = this.roleAliases[userRole] || userRole;
        
        // Verificar se role está permitido
        return item.roles.includes(normalizedRole) || item.roles.includes(userRole);
    },

    /**
     * Obter escopo de acesso para um item
     */
    getScope(item, userRole) {
        if (!item.scope) return 'all';
        
        const normalizedRole = this.roleAliases[userRole] || userRole;
        return item.scope[normalizedRole] || item.scope[userRole] || 'none';
    },

    /**
     * Verificar se item é readonly para role
     */
    isReadonly(item, userRole) {
        if (!item.readonly) return false;
        
        const normalizedRole = this.roleAliases[userRole] || userRole;
        return item.readonly[normalizedRole] || item.readonly[userRole] || false;
    }
};

// Export para uso em módulos
if (typeof window !== 'undefined') {
    window.NavigationConfig = NavigationConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationConfig;
}

