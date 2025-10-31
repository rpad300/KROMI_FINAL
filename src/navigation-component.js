/**
 * Kromi.online - Componente de Navegação Unificado
 * Renderiza sidebar com menus global e de evento
 * 
 * @version 2025.10.26
 */

class NavigationComponent {
    constructor(containerId = 'sidebar') {
        this.containerId = containerId;
        this.container = null;
        this.service = null;
        this.currentEventId = null;
        
        console.log('[NAV-COMPONENT] Componente de navegação criado');
    }

    /**
     * Inicializar componente
     */
    async init() {
        try {
            // Aguardar serviço de navegação
            await this.waitForService();
            this.service = window.navigationService;
            
            // Aguardar serviço estar pronto
            if (!this.service.currentUser) {
                await this.service.init();
            }

            // Obter container
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                throw new Error(`Container ${this.containerId} não encontrado`);
            }

            // Detectar eventId da URL
            this.detectEventFromUrl();

            // Renderizar navegação
            this.render();

            // Configurar listeners
            this.setupListeners();

            console.log('[NAV-COMPONENT] Componente inicializado');
            
            return true;
        } catch (error) {
            console.error('[NAV-COMPONENT] Erro ao inicializar:', error);
            return false;
        }
    }

    /**
     * Aguardar serviço estar disponível
     */
    async waitForService() {
        return new Promise((resolve) => {
            const tick = () => {
                if (window.navigationService) {
                    resolve();
                } else {
                    setTimeout(tick, 100);
                }
            };
            tick();
        });
    }

    /**
     * Detectar eventId da URL
     */
    detectEventFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('event');
        
        if (eventId) {
            this.currentEventId = eventId;
            console.log('[NAV-COMPONENT] Evento detectado na URL:', eventId);
        }
    }

    /**
     * Renderizar navegação completa
     */
    render() {
        if (!this.container || !this.service) {
            console.warn('[NAV-COMPONENT] Container ou serviço não disponível');
            return;
        }

        const navigation = this.service.getCompleteNavigation(this.currentEventId);

        const html = `
            ${this.renderHeader()}
            ${this.renderGlobalMenu(navigation.global)}
            ${this.renderEventMenu(navigation.event, navigation.context)}
            ${this.renderFooter()}
        `;

        this.container.innerHTML = html;

        // Marcar link ativo
        this.setActiveLink();

        // Carregar logo no header da sidebar (aguardar logoLoader estar disponível)
        this.loadSidebarLogoDelayed();

        console.log('[NAV-COMPONENT] Navegação renderizada', {
            globalItems: navigation.global.length,
            eventItems: navigation.event.length,
            hasEventContext: !!navigation.context?.hasEvent
        });
    }
    
    /**
     * Carregar logo na sidebar com delay para garantir que logoLoader está carregado
     */
    async loadSidebarLogoDelayed() {
        // Verificar se já está disponível imediatamente
        if (typeof window.logoLoader !== 'undefined' && window.logoLoader && typeof window.logoLoader.renderLogo === 'function') {
            console.log('[NAV-COMPONENT] LogoLoader já disponível, carregando logo imediatamente...');
            await this.loadSidebarLogo();
            return;
        }
        
        // Escutar evento customizado de pronto
        const onLogoLoaderReady = () => {
            console.log('[NAV-COMPONENT] Evento logoLoaderReady recebido, carregando logo...');
            window.removeEventListener('logoLoaderReady', onLogoLoaderReady);
            this.loadSidebarLogo();
        };
        window.addEventListener('logoLoaderReady', onLogoLoaderReady);
        
        // Fallback: aguardar logoLoader estar disponível com polling
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        const checkAndLoad = async () => {
            // Verificar se logoLoader existe e está inicializado
            if (typeof window.logoLoader !== 'undefined' && window.logoLoader && typeof window.logoLoader.renderLogo === 'function') {
                console.log('[NAV-COMPONENT] LogoLoader encontrado via polling, carregando logo...');
                window.removeEventListener('logoLoaderReady', onLogoLoaderReady);
                await this.loadSidebarLogo();
                return true;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                // Log apenas a cada 10 tentativas para não poluir o console
                if (attempts % 10 === 0) {
                    console.log(`[NAV-COMPONENT] Aguardando LogoLoader... (tentativa ${attempts}/${maxAttempts})`, {
                        logoLoaderExists: typeof window.logoLoader !== 'undefined',
                        logoLoaderValue: window.logoLoader ? 'truthy' : 'falsy',
                        hasRenderLogo: window.logoLoader && typeof window.logoLoader.renderLogo === 'function'
                    });
                }
                setTimeout(checkAndLoad, 100);
            } else {
                console.warn('[NAV-COMPONENT] LogoLoader não disponível após espera. Usando fallback de texto...');
                window.removeEventListener('logoLoaderReady', onLogoLoaderReady);
                // Usar fallback de texto se logo não estiver disponível
                const logoContainer = document.getElementById('sidebarLogo');
                if (logoContainer) {
                    logoContainer.innerHTML = '<h2 class="sidebar-title">🏃 Kromi.online</h2>';
                }
            }
        };
        
        // Aguardar um pouco antes de começar o polling (para dar tempo do logo-loader.js carregar)
        setTimeout(() => {
            checkAndLoad();
        }, 300);
    }
    
    /**
     * Carregar logo na sidebar
     */
    async loadSidebarLogo() {
        const logoContainer = document.getElementById('sidebarLogo');
        if (!logoContainer) {
            console.warn('[NAV-COMPONENT] Container sidebarLogo não encontrado');
            return;
        }
        
        // Verificar se logoLoader está disponível
        if (typeof window.logoLoader === 'undefined' || !window.logoLoader || typeof window.logoLoader.renderLogo !== 'function') {
            console.warn('[NAV-COMPONENT] LogoLoader não disponível. Usando fallback de texto.');
            logoContainer.innerHTML = '<h2 class="sidebar-title">🏃 Kromi.online</h2>';
            return;
        }
        
        try {
            console.log('[NAV-COMPONENT] Carregando logo na sidebar...');
            const success = await window.logoLoader.renderLogo(logoContainer, {
                type: 'secondary', // Usar logo secundário (monocromático) para fundos escuros
                orientation: 'horizontal', // Sidebar sempre horizontal
                alt: 'Kromi.online',
                className: 'sidebar-logo',
                style: {
                    maxHeight: '50px',
                    width: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    objectFit: 'contain'
                },
                fallback: '<h2 class="sidebar-title">🏃 Kromi.online</h2>',
                onError: (error) => {
                    console.warn('[NAV-COMPONENT] Erro ao carregar logo:', error);
                    // Se falhar, tentar logo primário como fallback
                    setTimeout(async () => {
                        console.log('[NAV-COMPONENT] Tentando logo primário como fallback...');
                        await window.logoLoader.renderLogo(logoContainer, {
                            type: 'primary',
                            orientation: 'horizontal',
                            alt: 'Kromi.online',
                            className: 'sidebar-logo',
                            style: {
                                maxHeight: '50px',
                                width: 'auto',
                                display: 'block',
                                margin: '0 auto',
                                objectFit: 'contain'
                            },
                            fallback: '<h2 class="sidebar-title">🏃 Kromi.online</h2>'
                        });
                    }, 1000);
                }
            });
            
            if (success) {
                console.log('[NAV-COMPONENT] Logo carregado com sucesso na sidebar');
            } else {
                console.log('[NAV-COMPONENT] Logo não encontrado, usando fallback');
            }
        } catch (error) {
            console.error('[NAV-COMPONENT] Erro ao carregar logo:', error);
        }
    }

    /**
     * Renderizar header da sidebar
     */
    renderHeader() {
        return `
            <div class="sidebar-header">
                <div class="sidebar-logo-container" id="sidebarLogo">
                    <h2 class="sidebar-title">🏃 Kromi.online</h2>
                </div>
                <button class="sidebar-toggle" id="sidebarToggle" aria-label="Alternar menu lateral" type="button">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        `;
    }

    /**
     * Renderizar menu global
     */
    renderGlobalMenu(items) {
        if (!items || items.length === 0) {
            return '';
        }

        const itemsHtml = items.map(item => this.renderMenuItem(item, 'global')).join('');

        return `
            <nav class="sidebar-nav" data-section="global">
                <div class="nav-section-label">${this.service.config.labels.globalSection}</div>
                <ul class="nav-list">
                    ${itemsHtml}
                </ul>
            </nav>
        `;
    }

    /**
     * Renderizar menu de evento
     */
    renderEventMenu(items, context) {
        // Não mostrar se não há contexto de evento
        if (!context?.hasEvent || !items || items.length === 0) {
            return '';
        }

        const itemsHtml = items.map(item => this.renderMenuItem(item, 'event')).join('');

        // Adicionar separador e título do evento
        const eventTitle = context.eventName || `Evento ${context.eventId}`;

        return `
            <div class="nav-separator"></div>
            <nav class="sidebar-nav" data-section="event">
                <div class="nav-section-label">
                    <span class="nav-section-icon">🏃</span>
                    <span class="nav-section-title">${eventTitle}</span>
                </div>
                <ul class="nav-list">
                    ${itemsHtml}
                </ul>
            </nav>
        `;
    }

    /**
     * Renderizar item de menu individual
     */
    renderMenuItem(item, section = 'global') {
        const url = section === 'event' 
            ? this.service.buildEventUrl(item.route, this.currentEventId)
            : item.route;

        // Botão de voltar especial para dashboard do evento
        if (item.showBackButton && section === 'event') {
            return `
                <li class="nav-item">
                    <a href="${url}" class="nav-link" data-item-id="${item.id}" title="${item.description}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.label}</span>
                    </a>
                    <a href="${item.backRoute}" class="nav-link nav-link-back" title="${item.backLabel}">
                        <span class="nav-icon">${this.service.config.icons.back}</span>
                        <span class="nav-text nav-text-small">${item.backLabel}</span>
                    </a>
                </li>
            `;
        }

        // Item normal
        return `
            <li class="nav-item">
                <a href="${url}" class="nav-link" data-item-id="${item.id}" title="${item.description}">
                    <span class="nav-icon">${item.icon}</span>
                    <span class="nav-text">${item.label}</span>
                    ${item.readonly && this.service.config.isReadonly(item, this.service.currentRole) 
                        ? '<span class="nav-badge">👁️</span>' 
                        : ''}
                </a>
            </li>
        `;
    }

    /**
     * Renderizar footer da sidebar
     */
    renderFooter() {
        return `
            <div class="sidebar-footer">
                <button class="btn-logout" id="logoutBtn" type="button">
                    <span class="nav-icon">🚪</span>
                    <span class="nav-text">Sair</span>
                </button>
            </div>
        `;
    }

    /**
     * Marcar link ativo baseado na página atual
     */
    setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const links = this.container.querySelectorAll('.nav-link');

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const linkPage = href.split('?')[0].split('/').pop();

            if (linkPage === currentPage) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Configurar event listeners
     */
    setupListeners() {
        // Sidebar toggle
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.container.classList.toggle('active');
                this.container.classList.toggle('collapsed');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Listener para mudanças de contexto de evento
        window.addEventListener('eventContextChanged', (e) => {
            console.log('[NAV-COMPONENT] Contexto de evento alterado:', e.detail);
            this.currentEventId = e.detail.eventId;
            this.render();
        });

        window.addEventListener('eventContextCleared', () => {
            console.log('[NAV-COMPONENT] Contexto de evento limpo');
            this.currentEventId = null;
            this.render();
        });

        // Sidebar responsivo
        window.addEventListener('resize', () => {
            this.updateSidebarState();
        });

        // Estado inicial da sidebar
        this.updateSidebarState();
    }

    /**
     * Atualizar estado da sidebar (responsivo)
     */
    updateSidebarState() {
        if (!this.container) return;

        // Desktop (> 1024px): sidebar aberta
        if (window.innerWidth > 1024) {
            this.container.classList.add('active');
            this.container.classList.remove('collapsed');
        } else {
            // Mobile: sidebar fechada por padrão
            this.container.classList.remove('active');
            this.container.classList.add('collapsed');
        }
    }

    /**
     * Lidar com logout
     */
    handleLogout() {
        if (window.authSystem) {
            console.log('[NAV-COMPONENT] Logout iniciado');
            window.authSystem.signOut();
        } else {
            console.warn('[NAV-COMPONENT] AuthSystem não disponível');
            window.location.href = 'login.html';
        }
    }

    /**
     * Atualizar contexto de evento
     */
    updateEventContext(eventId, eventName = null) {
        this.currentEventId = eventId;
        this.service.setEventContext(eventId, eventName);
        this.render();
    }

    /**
     * Limpar contexto de evento
     */
    clearEventContext() {
        this.currentEventId = null;
        this.service.clearEventContext();
        this.render();
    }

    /**
     * Recarregar navegação
     */
    reload() {
        console.log('[NAV-COMPONENT] Recarregando navegação');
        this.render();
    }
}

// Criar instância global
if (typeof window !== 'undefined') {
    window.navigationComponent = new NavigationComponent();
}

// Export para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationComponent;
}

