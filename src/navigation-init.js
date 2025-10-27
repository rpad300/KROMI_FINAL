/**
 * VisionKrono - Inicialização Automática de Navegação
 * Inclui este script em todas as páginas para ativar a navegação unificada
 * 
 * @version 2025.10.26
 */

(function() {
    'use strict';

    console.log('[NAV-INIT] Inicializando sistema de navegação...');

    /**
     * Inicializar navegação quando DOM estiver pronto
     */
    async function initNavigation() {
        try {
            // 1. Aguardar AuthClient
            console.log('[NAV-INIT] Aguardando AuthClient...');
            await waitForAuthClient();

            // 2. Inicializar NavigationService
            console.log('[NAV-INIT] Inicializando NavigationService...');
            if (window.navigationService) {
                await window.navigationService.init();
            } else {
                throw new Error('NavigationService não encontrado');
            }

            // 3. Inicializar NavigationComponent
            console.log('[NAV-INIT] Inicializando NavigationComponent...');
            if (window.navigationComponent) {
                await window.navigationComponent.init();
            } else {
                throw new Error('NavigationComponent não encontrado');
            }

            console.log('[NAV-INIT] ✅ Sistema de navegação pronto');

            // Disparar evento de navegação pronta
            window.dispatchEvent(new CustomEvent('navigationReady'));

        } catch (error) {
            console.error('[NAV-INIT] ❌ Erro ao inicializar navegação:', error);
            
            // Mostrar mensagem de erro na sidebar se existir
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.innerHTML = `
                    <div class="nav-error">
                        <p>⚠️ Erro ao carregar navegação</p>
                        <p style="font-size: 0.75rem; margin-top: 0.5rem;">
                            ${error.message}
                        </p>
                        <button onclick="location.reload()" style="margin-top: 1rem;">
                            🔄 Recarregar
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Aguardar AuthClient estar disponível
     */
    function waitForAuthClient() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout ao aguardar AuthClient'));
            }, 10000); // 10s timeout

            const tick = () => {
                if (window.authSystem?.currentUser !== undefined) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(tick, 100);
                }
            };
            tick();
        });
    }

    /**
     * Inicializar quando DOM estiver pronto
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        // DOM já está pronto
        initNavigation();
    }

    /**
     * Utilidades globais para manipulação de navegação
     */
    window.NavigationUtils = {
        /**
         * Navegar para um evento específico
         */
        goToEvent(eventId, eventName = null) {
            if (window.navigationComponent) {
                window.navigationComponent.updateEventContext(eventId, eventName);
            }
        },

        /**
         * Voltar ao dashboard global (sem contexto de evento)
         */
        goToGlobalDashboard() {
            if (window.navigationComponent) {
                window.navigationComponent.clearEventContext();
            }
            window.location.href = 'index-kromi.html';
        },

        /**
         * Recarregar navegação (útil após mudanças de permissões)
         */
        reloadNavigation() {
            if (window.navigationComponent) {
                window.navigationComponent.reload();
            }
        },

        /**
         * Obter contexto de evento atual
         */
        getCurrentEvent() {
            if (window.navigationService) {
                return window.navigationService.getCurrentEventContext();
            }
            return null;
        },

        /**
         * Verificar se página atual requer contexto de evento
         */
        requiresEventContext() {
            if (window.navigationService) {
                return window.navigationService.currentRouteRequiresEvent();
            }
            return false;
        }
    };

    console.log('[NAV-INIT] Utilidades de navegação disponíveis em window.NavigationUtils');

    /**
     * Configurar funcionalidade de toggle mobile
     */
    function setupMobileToggle() {
        const sidebar = document.getElementById('sidebar');
        
        if (!sidebar) {
            console.log('[NAV-INIT] Sidebar não encontrado (ainda)');
            return;
        }
        
        // 1. Criar ou obter botão menuToggle no header
        let menuToggle = document.getElementById('menuToggle');
        
        if (!menuToggle) {
            // Criar botão automaticamente se não existir
            const headerLeft = document.querySelector('.header-left');
            if (headerLeft) {
                menuToggle = document.createElement('button');
                menuToggle.id = 'menuToggle';
                menuToggle.className = 'btn btn-icon btn-secondary';
                menuToggle.style.display = 'none';
                menuToggle.innerHTML = '<i>☰</i>';
                menuToggle.setAttribute('aria-label', 'Abrir menu');
                
                // Inserir como primeiro filho
                headerLeft.insertBefore(menuToggle, headerLeft.firstChild);
                console.log('[NAV-INIT] ✅ Botão menuToggle criado automaticamente');
            }
        }
        
        // 2. Configurar toggle do header (menuToggle)
        if (menuToggle && !menuToggle.dataset.toggleInit) {
            menuToggle.dataset.toggleInit = 'true';
            
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isOpen = sidebar.classList.toggle('sidebar-open');
                console.log('[NAV-INIT] Sidebar', isOpen ? 'aberto' : 'fechado');
                toggleOverlay(isOpen);
            });
            
            console.log('[NAV-INIT] ✅ menuToggle configurado');
        }
        
        // 3. Configurar toggle dentro da sidebar (sidebarToggle)
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle && !sidebarToggle.dataset.toggleInit) {
            sidebarToggle.dataset.toggleInit = 'true';
            
            sidebarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                sidebar.classList.remove('sidebar-open');
                console.log('[NAV-INIT] Sidebar fechado (botão interno)');
                toggleOverlay(false);
            });
            
            console.log('[NAV-INIT] ✅ sidebarToggle configurado');
        }
        
        console.log('[NAV-INIT] ✅ Toggle mobile completo');
    }
    
    /**
     * Criar/remover overlay quando sidebar abre
     */
    function toggleOverlay(show) {
        const existingOverlay = document.getElementById('sidebar-overlay');
        
        if (show) {
            if (!existingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'sidebar-overlay active';
                overlay.addEventListener('click', () => {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('sidebar-open');
                    }
                    toggleOverlay(false);
                });
                document.body.appendChild(overlay);
            } else {
                existingOverlay.classList.add('active');
            }
        } else {
            if (existingOverlay) {
                existingOverlay.classList.remove('active');
                setTimeout(() => existingOverlay.remove(), 300);
            }
        }
    }
    
    /**
     * Inicializar toggle após navegação estar pronta
     */
    window.addEventListener('navigationReady', () => {
        // Aguardar um tick para garantir que o DOM está completo
        setTimeout(() => {
            setupMobileToggle();
        }, 100);
    });
    
    // Tentar configurar também quando DOM carregar (fallback)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(setupMobileToggle, 500);
        });
    } else {
        setTimeout(setupMobileToggle, 500);
    }

})();

