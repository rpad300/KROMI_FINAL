/**
 * VisionKrono - Sistema de Navegação Global
 * Componente reutilizável para navegação consistente em todas as páginas
 */

window.Navigation = {
    currentPage: null,
    currentEvent: null,
    
    /**
     * Inicializa navegação para a página atual
     */
    init(pageName, eventId = null) {
        this.currentPage = pageName;
        this.currentEvent = eventId;
        this.renderNavigation();
        this.setupEventListeners();
    },
    
    /**
     * Inicializa navegação superior (top nav) para páginas com layout vertical
     */
    initTopNav(pageName, eventId = null) {
        this.currentPage = pageName;
        this.currentEvent = eventId;
        this.renderTopNavigation();
        this.setupEventListeners();
    },
    
    /**
     * Renderiza navegação na sidebar
     */
    renderNavigation() {
        const container = document.getElementById('navigationMenu');
        if (!container) return;
        
        // Nível 1: Gestão Geral
        let html = `
            <div style="margin-bottom: var(--spacing-6);">
                <div class="nav-category">Gestão Geral</div>
                ${this.navItem('events', '/events', '🏠', 'Home')}
                ${this.navItem('processor', '/image-processor', '🤖', 'Processador')}
                ${this.navItem('database', '/database-management', '🗄️', 'Gestão BD')}
            </div>
        `;
        
        // Nível 2: Opções do Evento (se evento selecionado)
        if (this.currentEvent) {
            html += `
                <div id="eventNavSection">
                    <div class="nav-separator"></div>
                    <div class="nav-category">Evento Atual</div>
                    ${this.navItem('detection', `/detection`, '📱', 'Detecção')}
                    ${this.navItem('classifications', `/classifications`, '🏆', 'Classificações')}
                    ${this.navItem('participants', `/participants`, '👥', 'Participantes')}
                    ${this.navItem('category-rankings', `/category-rankings`, '🏅', 'Por Escalão')}
                    <div class="nav-separator"></div>
                    <div class="nav-category">Configuração</div>
                    ${this.navItem('devices', `/devices`, '📱', 'Dispositivos')}
                    ${this.navItem('checkpoint-order', `/checkpoint-order`, '📍', 'Ordem Checkpoints')}
                    ${this.navItem('calibration', `/calibration`, '🔧', 'Calibração')}
                    ${this.navItem('config', `/config`, '⚙️', 'Configurações')}
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    /**
     * Renderiza navegação superior (top nav)
     */
    renderTopNavigation() {
        const container = document.getElementById('topNav');
        if (!container) return;
        
        let html = '';
        
        // Menu geral
        html += `
            <a href="/events" class="nav-item ${this.currentPage === 'events' ? 'active' : ''}">
                <i class="icon">🏠</i>
                <span class="text">Home</span>
            </a>
            <a href="/image-processor" class="nav-item ${this.currentPage === 'image-processor' ? 'active' : ''}">
                <i class="icon">🤖</i>
                <span class="text">Processador</span>
            </a>
            <a href="/database-management" class="nav-item ${this.currentPage === 'database-management' ? 'active' : ''}">
                <i class="icon">🗄️</i>
                <span class="text">Gestão BD</span>
            </a>
        `;
        
        // Menu de evento (se temos evento selecionado)
        if (this.currentEvent) {
            html += `
                <div style="margin-left: auto; display: flex; gap: var(--spacing-2);">
                    <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">EVENTO ATUAL:</span>
                    ${this.navItem('detection', `/detection`, '📱', 'Detecção')}
                    ${this.navItem('classifications', `/classifications`, '🏆', 'Classificações')}
                    ${this.navItem('calibration', `/calibration`, '🔧', 'Calibração')}
                    ${this.navItem('participants', `/participants`, '👥', 'Participantes')}
                    ${this.navItem('category-rankings', `/category-rankings`, '🏅', 'Classificação por Escalão')}
                    ${this.navItem('config', `/config`, '⚙️', 'Configurações')}
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    /**
     * Gera HTML para item de navegação
     */
    navItem(page, url, icon, label) {
        const isActive = this.currentPage === page ? 'active' : '';
        
        // Se temos evento selecionado, adicionar aos URLs das páginas de evento
        if (this.currentEvent && this.isEventPage(page)) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}event=${this.currentEvent}&eventName=${encodeURIComponent(this.currentEventName || 'Evento')}`;
        }
        
        return `
            <a href="${url}" class="nav-item ${isActive}">
                <i class="icon">${icon}</i>
                <span class="text">${label}</span>
            </a>
        `;
    },
    
    /**
     * Verifica se a página precisa do contexto do evento
     */
    isEventPage(page) {
        const eventPages = ['detection', 'classifications', 'calibration', 'participants', 'category-rankings', 'config', 'devices', 'checkpoint-order'];
        return eventPages.includes(page);
    },
    
    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Detectar evento da URL se aplicável
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        
        if (eventId && eventId !== this.currentEvent) {
            this.currentEvent = eventId;
            this.renderNavigation();
        }
    },
    
    /**
     * Atualiza navegação quando evento muda
     */
    updateEvent(eventId, eventName = null) {
        this.currentEvent = eventId;
        this.currentEventName = eventName;
        this.renderNavigation();
    },
    
    /**
     * Remove evento selecionado
     */
    clearEvent() {
        this.currentEvent = null;
        this.currentEventName = null;
        this.renderNavigation();
    },
    
    /**
     * Breadcrumbs dinâmicos
     */
    renderBreadcrumbs(items) {
        return `
            <div class="breadcrumbs">
                ${items.map((item, index) => `
                    <div class="breadcrumb-item">
                        ${index > 0 ? '<span class="breadcrumb-separator">›</span>' : ''}
                        ${index < items.length - 1 
                            ? `<a href="${item.url}" class="breadcrumb-link">${item.label}</a>`
                            : `<span class="breadcrumb-link">${item.label}</span>`
                        }
                    </div>
                `).join('')}
            </div>
        `;
    }
};

