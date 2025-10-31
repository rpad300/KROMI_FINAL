/**
 * Logo Loader - Sistema de Carregamento Inteligente de Logos
 * ===========================================================
 * 
 * Carrega logos automaticamente conforme:
 * - Orientação do dispositivo (horizontal/vertical)
 * - Tipo de logo (primary/secondary)
 * - Cache local para melhor performance
 */

class LogoLoader {
    constructor() {
        this.cache = {
            logos: {},
            timestamp: {},
            cacheDuration: 5 * 60 * 1000 // 5 minutos
        };
        this.isMobile = this.detectMobile();
        this.orientation = this.getOrientation();
        
        // Listener para mudanças de orientação
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.orientation = this.getOrientation();
                this.clearCache(); // Limpar cache quando orientação muda
            }, 100);
        });
        
        // Listener para resize (detectar mudança de orientação)
        window.addEventListener('resize', () => {
            const newOrientation = this.getOrientation();
            if (newOrientation !== this.orientation) {
                this.orientation = newOrientation;
                this.clearCache();
            }
        });
    }
    
    /**
     * Detetar se é dispositivo móvel
     */
    detectMobile() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Obter orientação atual
     */
    getOrientation() {
        if (window.innerWidth > window.innerHeight) {
            return 'horizontal';
        }
        return 'vertical';
    }
    
    /**
     * Limpar cache
     */
    clearCache() {
        this.cache.logos = {};
        this.cache.timestamp = {};
    }
    
    /**
     * Obter logo com cache
     * @param {string} type - 'primary' ou 'secondary'
     * @param {string|null} orientation - 'horizontal', 'vertical', ou null (auto-detect)
     * @param {boolean} forceRefresh - Forçar atualização ignorando cache
     * @returns {Promise<Object|null>}
     */
    async getLogo(type = 'primary', orientation = null, forceRefresh = false) {
        // Determinar orientação
        const finalOrientation = orientation || this.getOptimalOrientation();
        const cacheKey = `${type}_${finalOrientation}`;
        
        // Verificar cache
        if (!forceRefresh && this.cache.logos[cacheKey]) {
            const cachedTime = this.cache.timestamp[cacheKey];
            if (Date.now() - cachedTime < this.cacheDuration) {
                console.log(`[LogoLoader] Usando logo do cache: ${cacheKey}`);
                return this.cache.logos[cacheKey];
            }
        }
        
        try {
            // Buscar logo do servidor
            const response = await fetch(`/api/branding/logo/${type}/${finalOrientation}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[LogoLoader] Logo ${cacheKey} não encontrado`);
                    return null;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Guardar no cache
                this.cache.logos[cacheKey] = result.data;
                this.cache.timestamp[cacheKey] = Date.now();
                console.log(`[LogoLoader] Logo carregado e cacheado: ${cacheKey}`);
                return result.data;
            }
            
            return null;
        } catch (error) {
            console.error(`[LogoLoader] Erro ao carregar logo ${cacheKey}:`, error);
            return null;
        }
    }
    
    /**
     * Determinar orientação ótima baseada no contexto
     */
    getOptimalOrientation() {
        // Para headers e navbars, sempre horizontal
        // Para mobile em modo retrato, usar vertical se disponível
        // Para desktop, usar horizontal
        
        if (this.isMobile && this.orientation === 'vertical') {
            return 'vertical';
        }
        
        return 'horizontal';
    }
    
    /**
     * Renderizar logo em elemento HTML
     * @param {string|HTMLElement} selector - Seletor ou elemento DOM
     * @param {Object} options - Opções de renderização
     * @returns {Promise<boolean>}
     */
    async renderLogo(selector, options = {}) {
        const {
            type = 'secondary', // Padrão: logo secundário (monocromático) para fundos escuros
            orientation = null,
            alt = 'Logo',
            className = 'site-logo',
            width = null,
            height = null,
            style = {},
            fallback = null,
            onError = null
        } = options;
        
        const element = typeof selector === 'string' 
            ? document.querySelector(selector)
            : selector;
        
        if (!element) {
            console.warn(`[LogoLoader] Elemento não encontrado: ${selector}`);
            return false;
        }
        
        const logo = await this.getLogo(type, orientation);
        
        if (!logo || !logo.url) {
            if (fallback) {
                element.innerHTML = fallback;
            } else {
                // Fallback para texto
                element.textContent = alt;
            }
            
            if (onError) {
                onError('Logo não encontrado');
            }
            return false;
        }
        
        // Criar elemento img
        const img = document.createElement('img');
        img.src = logo.url;
        img.alt = alt;
        img.className = className;
        
        if (width) img.width = width;
        if (height) img.height = height;
        
        // Aplicar estilos
        Object.assign(img.style, {
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            ...style
        });
        
        // Tratamento de erro
        img.onerror = (error) => {
            console.error(`[LogoLoader] Erro ao carregar imagem: ${logo.url}`, error);
            console.error(`[LogoLoader] Tentando fallback para: ${type}_${orientation || 'auto'}`);
            
            // Tentar fallback para logo primário se secundário falhar
            if (type === 'secondary') {
                console.log('[LogoLoader] Tentando logo primário como fallback...');
                this.getLogo('primary', orientation).then(primaryLogo => {
                    if (primaryLogo && primaryLogo.url) {
                        img.src = primaryLogo.url;
                        img.onerror = null; // Remover handler para evitar loop
                        console.log('[LogoLoader] Fallback para logo primário bem-sucedido');
                    } else {
                        // Se primário também falhar, usar fallback de texto
                        if (fallback) {
                            element.innerHTML = fallback;
                        } else {
                            element.textContent = alt;
                        }
                        if (onError) {
                            onError('Nenhum logo disponível');
                        }
                    }
                }).catch(() => {
                    // Se tudo falhar, usar fallback
                    if (fallback) {
                        element.innerHTML = fallback;
                    } else {
                        element.textContent = alt;
                    }
                    if (onError) {
                        onError('Erro ao carregar logo');
                    }
                });
            } else {
                // Se não for secondary, usar fallback direto
                if (fallback) {
                    element.innerHTML = fallback;
                } else {
                    element.textContent = alt;
                }
                if (onError) {
                    onError('Erro ao carregar imagem');
                }
            }
        };
        
        // Limpar conteúdo anterior e adicionar imagem
        element.innerHTML = '';
        element.appendChild(img);
        
        return true;
    }
    
    /**
     * Obter URL do logo (método síncrono usando cache)
     * @param {string} type - 'primary' ou 'secondary'
     * @param {string|null} orientation - 'horizontal', 'vertical', ou null
     * @returns {string|null}
     */
    getLogoUrl(type = 'primary', orientation = null) {
        const finalOrientation = orientation || this.getOptimalOrientation();
        const cacheKey = `${type}_${finalOrientation}`;
        
        if (this.cache.logos[cacheKey]) {
            return this.cache.logos[cacheKey].url || null;
        }
        
        return null;
    }
    
    /**
     * Atualizar favicon dinamicamente
     */
    async updateFavicon() {
        try {
            const response = await fetch('/api/branding/logo/favicon', {
                credentials: 'include'
            });
            
            if (!response.ok) return;
            
            const result = await response.json();
            if (result.success && result.data && result.data.url) {
                // Atualizar todos os links de favicon
                let faviconLink = document.querySelector('link[rel="icon"]')
                    || document.querySelector('link[rel="shortcut icon"]');
                
                if (!faviconLink) {
                    faviconLink = document.createElement('link');
                    faviconLink.rel = 'icon';
                    document.head.appendChild(faviconLink);
                }
                
                faviconLink.href = result.data.url;
                faviconLink.type = `image/${result.data.format || 'png'}`;
                
                // Atualizar apple-touch-icon também
                let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
                if (!appleIcon) {
                    appleIcon = document.createElement('link');
                    appleIcon.rel = 'apple-touch-icon';
                    document.head.appendChild(appleIcon);
                }
                appleIcon.href = result.data.url;
                
                console.log('[LogoLoader] Favicon atualizado');
            }
        } catch (error) {
            console.warn('[LogoLoader] Erro ao atualizar favicon:', error);
        }
    }
    
    /**
     * Pré-carregar todos os logos
     */
    async preloadLogos() {
        console.log('[LogoLoader] Pré-carregando logos...');
        
        // Pré-carregar logos (priorizando secundário para fundos escuros)
        const logosToLoad = [
            { type: 'secondary', orientation: 'horizontal' }, // Prioridade: logo monocromático
            { type: 'secondary', orientation: 'vertical' },
            { type: 'primary', orientation: 'horizontal' }, // Fallback
            { type: 'primary', orientation: 'vertical' }
        ];
        
        const promises = logosToLoad.map(({ type, orientation }) => 
            this.getLogo(type, orientation).catch(err => {
                console.warn(`[LogoLoader] Erro ao pré-carregar logo ${type}_${orientation}:`, err);
                return null;
            })
        );
        
        await Promise.all(promises);
        console.log('[LogoLoader] Pré-carregamento concluído');
    }
}

// Criar e expor imediatamente para uso global (ANTES de qualquer inicialização assíncrona)
window.LogoLoader = LogoLoader;

// Instância global
const logoLoader = new LogoLoader();
window.logoLoader = logoLoader;

// Log para debug
console.log('[LogoLoader] LogoLoader criado e exposto globalmente:', typeof window.logoLoader, typeof window.logoLoader?.renderLogo);

// Disparar evento customizado para indicar que LogoLoader está pronto
if (typeof window.dispatchEvent !== 'undefined') {
    const event = new CustomEvent('logoLoaderReady', { 
        detail: { logoLoader: logoLoader, LogoLoader: LogoLoader } 
    });
    window.dispatchEvent(event);
    console.log('[LogoLoader] Evento logoLoaderReady disparado');
}

// Auto-inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Pré-carregar logos e atualizar favicon após um pequeno delay
        setTimeout(async () => {
            await Promise.all([
                logoLoader.preloadLogos(),
                logoLoader.updateFavicon()
            ]);
        }, 500);
    });
} else {
    setTimeout(async () => {
        await Promise.all([
            logoLoader.preloadLogos(),
            logoLoader.updateFavicon()
        ]);
    }, 500);
}

