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

})();

