/**
 * ==========================================
 * BRANDING & SEO MANAGER - Kromi.online
 * ==========================================
 * Gestão completa de branding, logos, metadados SEO
 * e geração com IA
 * ==========================================
 */

const BrandingSEO = {
    currentUser: null,
    currentPageId: null,
    supabase: null,
    
    async init() {
        console.log('🎨 Inicializando Branding & SEO Manager...');
        
        // Verificar autenticação (já validado pelo auth-helper, mas verificamos novamente)
        try {
            const sessionRes = await fetch('/api/auth/session', {
                credentials: 'include'
            });
            
            if (!sessionRes.ok) {
                console.error('Sessão inválida');
                return;
            }
            
            const session = await sessionRes.json();
            if (!session.user || !['admin', 'superadmin'].includes(session.user.role)) {
                console.error('Acesso negado - apenas admin');
                return;
            }
            
            this.currentUser = session.user;
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            return;
        }
        
        // Inicializar Supabase
        await this.initSupabase();
        
        // Carregar dados iniciais
        await this.loadInitialData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Branding & SEO Manager inicializado');
    },
    
    async initSupabase() {
        try {
            const configRes = await fetch('/api/config');
            const config = await configRes.json();
            
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
            
            console.log('✅ Supabase inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            this.showToast('Erro ao conectar ao Supabase', 'error');
        }
    },
    
    async loadInitialData() {
        // Carregar dados iniciais
        await Promise.all([
            this.loadBrandAssets(),
            this.loadPageRegistry(), // Esta função já faz sync automático
            this.loadMediaLibrary(),
            this.loadPlatformContext(),
            this.loadGlobalMetadata() // Carregar metadados globais
        ]);

        // Configurar auto-refresh da lista de páginas a cada 30 segundos
        // (só se não houver seleção ativa)
        setInterval(() => {
            if (!this.currentPageId) {
                this.loadPageRegistry();
            }
        }, 30000); // 30 segundos
    },
    
    async loadPlatformContext() {
        try {
            const response = await fetch('/api/branding/platform-context', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Ainda não existe contexto definido - isso é normal, não é erro
                    console.log('ℹ️ Contexto da plataforma ainda não definido');
                    return;
                }
                if (response.status === 401) {
                    console.error('Não autenticado');
                    return;
                }
                // Outros erros - log mas não bloqueia a aplicação
                console.warn('Aviso ao buscar contexto:', response.status);
                return;
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                const ctx = result.data;
                const setValue = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.value = value || '';
                };
                
                setValue('platformObjective', ctx.platform_objective);
                setValue('platformDescription', ctx.platform_description);
                setValue('targetAudience', ctx.target_audience);
                setValue('keyFeatures', Array.isArray(ctx.key_features) ? ctx.key_features.join('\n') : (ctx.key_features || ''));
                setValue('brandVoice', ctx.brand_voice);
                setValue('brandPersonality', ctx.brand_personality);
                setValue('industrySector', ctx.industry_sector);
                setValue('useCases', Array.isArray(ctx.use_cases) ? ctx.use_cases.join('\n') : (ctx.use_cases || ''));
                
                // Atualizar status
                const statusEl = document.getElementById('platformContextStatusText');
                if (statusEl) {
                    statusEl.textContent = ctx.status === 'published' ? 'Publicado' : 'Rascunho';
                    statusEl.style.color = ctx.status === 'published' ? 'var(--success)' : 'var(--warning)';
                }
            }
        } catch (error) {
            // Não mostrar erro se for apenas falta de contexto
            console.warn('Aviso ao carregar contexto da plataforma:', error.message);
        }
    },
    
    async savePlatformContext() {
        try {
            console.log('💾 Guardando contexto da plataforma...');
            
            const getValue = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : '';
            };
            
            const data = {
                platformObjective: getValue('platformObjective'),
                platformDescription: getValue('platformDescription'),
                targetAudience: getValue('targetAudience'),
                keyFeatures: getValue('keyFeatures').split('\n').map(f => f.trim()).filter(f => f),
                brandVoice: getValue('brandVoice'),
                brandPersonality: getValue('brandPersonality'),
                industrySector: getValue('industrySector'),
                useCases: getValue('useCases').split('\n').map(u => u.trim()).filter(u => u)
            };
            
            console.log('📤 Dados do contexto:', data);
            
            const response = await fetch('/api/branding/platform-context', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            console.log('📡 Resposta:', response.status, response.statusText);
            
            if (!response.ok) {
                let errorMessage = 'Erro ao guardar contexto';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                    console.error('❌ Erro da API:', error);
                } catch (e) {
                    const errorText = await response.text();
                    console.error('❌ Erro ao parsear:', errorText);
                    errorMessage = `HTTP ${response.status}: ${errorText}`;
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            console.log('✅ Resultado:', result);
            
            if (result.success) {
                this.showToast('Contexto da plataforma guardado com sucesso!', 'success');
                // Atualizar status
                const statusEl = document.getElementById('platformContextStatusText');
                if (statusEl) {
                    statusEl.textContent = 'Rascunho';
                    statusEl.style.color = 'var(--warning)';
                }
            } else {
                throw new Error(result.error || 'Erro ao guardar');
            }
        } catch (error) {
            console.error('❌ Erro ao guardar contexto:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async publishPlatformContext() {
        try {
            const response = await fetch('/api/branding/platform-context/publish', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao publicar contexto');
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Contexto da plataforma publicado com sucesso!', 'success');
                // Atualizar status
                const statusEl = document.getElementById('platformContextStatusText');
                if (statusEl) {
                    statusEl.textContent = 'Publicado';
                    statusEl.style.color = 'var(--success)';
                }
            } else {
                throw new Error(result.error || 'Erro ao publicar');
            }
        } catch (error) {
            console.error('Erro ao publicar contexto:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    // ==========================================
    // NAVEGAÇÃO ENTRE TABS
    // ==========================================
    switchTab(tabName) {
        // Esconder todos os tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remover active de todos os botões
        document.querySelectorAll('.tab-nav button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar tab selecionado
        const tabContent = document.getElementById(`tab-${tabName}`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Ativar botão
        event.target.classList.add('active');
        
        // Carregar dados específicos do tab
        if (tabName === 'media-library') {
            this.loadMediaLibrary();
        } else if (tabName === 'audit') {
            this.loadAuditLog();
        }
    },
    
    // ==========================================
    // LOGOS
    // ==========================================
    async loadLogos() {
        console.log('🔄 Carregando logos existentes...');
        
        try {
            const response = await fetch('/api/branding/brand-assets', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('✅ Logos carregados:', result.data);
                this.displayLogos(result.data);
                this.updateLogosStatus(result.data);
            } else {
                console.log('ℹ️ Nenhum logo encontrado');
                this.showToast('Nenhum logo encontrado', 'info');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar logos:', error);
            this.showToast(`Erro ao carregar logos: ${error.message}`, 'error');
        }
    },
    
    displayLogos(logos) {
        console.log('🖼️ Exibindo logos:', logos);
        
        // Mapear tipos de logo para IDs no HTML
        const logoPreviewMap = {
            'logo_primary': 'logoPrimaryPreview', // Mantido para compatibilidade
            'logo_primary_horizontal': 'logoPrimaryHorizontalPreview',
            'logo_primary_vertical': 'logoPrimaryVerticalPreview',
            'logo_secondary': 'logoSecondaryPreview', // Mantido para compatibilidade
            'logo_secondary_horizontal': 'logoSecondaryHorizontalPreview',
            'logo_secondary_vertical': 'logoSecondaryVerticalPreview',
            'favicon': 'faviconPreview',
            'app_icon': 'appIconPreview'
        };
        
        // Se receber dados agrupados, usar diretamente, senão agrupar
        let grouped = {};
        if (Array.isArray(logos)) {
            // Se for array, agrupar por tipo
            logos.forEach(logo => {
                if (!grouped[logo.type]) {
                    grouped[logo.type] = [];
                }
                grouped[logo.type].push(logo);
            });
        } else if (typeof logos === 'object' && logos !== null) {
            // Se for objeto, verificar se tem propriedade 'grouped' ou se já é um objeto agrupado
            if (logos.grouped && typeof logos.grouped === 'object') {
                // Caso 1: tem propriedade grouped (ex: {grouped: {...}})
                grouped = logos.grouped;
            } else if (!Array.isArray(logos) && Object.keys(logos).length > 0) {
                // Caso 2: já é um objeto agrupado diretamente (ex: {logo_primary_horizontal: [...]})
                // Verificar se as chaves parecem tipos de logo e os valores são arrays
                const firstKey = Object.keys(logos)[0];
                const firstValue = logos[firstKey];
                if (Array.isArray(firstValue) || (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue))) {
                    grouped = logos;
                } else {
                    // Não é um objeto agrupado válido
                    console.warn('⚠️ Objeto recebido não é um objeto agrupado válido:', logos);
                    grouped = {};
                }
            } else {
                // Objeto vazio ou inválido
                grouped = {};
            }
        } else {
            // Tipo não suportado
            console.warn('⚠️ Tipo de dados inesperado em displayLogos:', typeof logos, logos);
            grouped = {};
        }
        
        // Exibir TODOS os formatos de cada tipo
        Object.keys(grouped).forEach(type => {
            const formats = grouped[type];
            const previewId = logoPreviewMap[type] || `${type}Preview`;
            const previewContainer = document.getElementById(previewId);
            
            if (!previewContainer) {
                console.warn(`⚠️ Container não encontrado: ${previewId}`);
                return;
            }
            
            if (formats.length === 0) {
                previewContainer.innerHTML = '<p class="helper-text" style="padding: var(--spacing-3);">Nenhum formato carregado ainda. Carregue múltiplos formatos (SVG, PNG, WebP, JPG) para este tipo.</p>';
                previewContainer.style.display = 'block';
                return;
            }
            
            // Criar grid mostrando TODOS os formatos deste tipo
            console.log(`✅ Exibindo ${formats.length} formatos para ${type}`);
            previewContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: var(--spacing-3); margin-top: var(--spacing-3);">
                    ${formats.map(logo => `
                        <div class="variant-card" style="${logo.is_preferred ? 'border: 2px solid var(--primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);' : 'border: 1px solid var(--border-color);'}">
                            <div class="variant-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-2); padding-bottom: var(--spacing-2); border-bottom: 1px solid var(--border-color);">
                                <h4 class="variant-title" style="text-transform: uppercase; margin: 0; font-weight: 600; color: var(--primary);">${logo.format || 'N/A'}</h4>
                                ${logo.is_preferred ? '<span class="badge badge-primary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">⭐ Preferido</span>' : ''}
                            </div>
                            <div class="variant-preview" style="margin: var(--spacing-2) 0; text-align: center; min-height: 120px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: var(--spacing-2);">
                                <img src="${logo.url || logo.file_path}" alt="${type} ${logo.format}" style="max-width: 100%; max-height: 100px; height: auto; border-radius: var(--radius-sm);">
                            </div>
                            <div class="variant-info" style="margin-top: var(--spacing-2);">
                                ${logo.width && logo.height ? `<p style="margin: var(--spacing-1) 0;"><strong>Dimensões:</strong> ${logo.width}x${logo.height}px</p>` : '<p style="margin: var(--spacing-1) 0;"><strong>Tipo:</strong> Vetorial (SVG)</p>'}
                                <p style="margin: var(--spacing-1) 0;"><strong>Status:</strong> <span class="status-badge status-${logo.status || 'draft'}">${logo.status || 'draft'}</span></p>
                                <p class="helper-text" style="font-size: 0.75rem; margin-top: var(--spacing-1); word-break: break-all;">
                                    ${logo.file_path.split('/').pop()}
                                </p>
                            </div>
                            <div class="variant-actions" style="display: flex; gap: var(--spacing-2); flex-wrap: wrap; margin-top: var(--spacing-2); padding-top: var(--spacing-2); border-top: 1px solid var(--border-color);">
                                ${!logo.is_preferred ? `<button class="btn btn-sm btn-primary" onclick="BrandingSEO.setPreferredFormat('${logo.id}')" title="Tornar este o formato preferido">
                                    <i class="fas fa-star"></i> Preferir
                                </button>` : '<span class="badge badge-success" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;"><i class="fas fa-check-circle"></i> Formato Ativo</span>'}
                                <button class="btn btn-sm btn-danger" onclick="BrandingSEO.deleteLogo('${logo.id}')" title="Eliminar este formato">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            previewContainer.style.display = 'block';
        });
        
        // Sempre mostrar secção de variantes, mesmo sem variantes
        const variantsSection = document.getElementById('logoVariantsSection');
        if (variantsSection) {
            variantsSection.style.display = 'block';
        }
        
        // Carregar variantes se existirem
        const logosArray = Array.isArray(logos) ? logos : (logos.data || []);
        this.loadLogoVariants(logosArray);
        
        console.log('✅ Todos os formatos exibidos por tipo');
    },
    
    async setPreferredFormat(assetId) {
        try {
            this.showToast('A definir formato preferido...', 'info');
            
            const response = await fetch(`/api/branding/brand-assets/${assetId}/set-preferred`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Formato preferido atualizado!', 'success');
                // Recarregar logos para mostrar atualização
                await this.loadBrandAssets();
            } else {
                throw new Error(result.error || 'Erro ao definir formato preferido');
            }
        } catch (error) {
            console.error('Erro ao definir formato preferido:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async loadLogoVariants(logos) {
        console.log('🔄 Carregando variantes de logos...');
        try {
            const response = await fetch('/api/branding/logo-variants', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.warn('⚠️ Erro ao buscar variantes:', response.status);
                return;
            }
            
            const result = await response.json();
            if (result.success && result.data) {
                console.log(`✅ ${result.data.length} variantes encontradas`);
                this.displayLogoVariantsNew(result.data);
            } else {
                console.log('ℹ️ Nenhuma variante encontrada');
                // Mostrar mensagem nas categorias explicando quais variantes serão geradas
                const categoryMessages = {
                    desktop: 'PNG: 512x512, 256x256 | WebP: 512x512, 256x256',
                    tablet: 'PNG: 384x384, 192x192 | WebP: 384x384',
                    mobile: 'PNG: 256x256, 128x128 | WebP: 256x256',
                    favicon: 'PNG: 32x32, 16x16, 48x48',
                    appIcon: 'PNG: 180x180, 152x152, 144x144, 120x120, 76x76, 60x60, 40x40, 29x29, 20x20'
                };
                
                ['desktop', 'tablet', 'mobile', 'favicon', 'appIcon'].forEach(category => {
                    const grid = document.getElementById(`${category}Variants`);
                    if (grid) {
                        grid.innerHTML = `
                            <div class="variant-card" style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-5);">
                                <p class="helper-text">
                                    <strong>Variantes que serão geradas:</strong><br>
                                    ${categoryMessages[category]}
                                </p>
                                <p class="helper-text" style="margin-top: var(--spacing-2);">
                                    Clique em "Gerar Todas as Variantes" para criar todas as dimensões automaticamente.
                                </p>
                            </div>
                        `;
                    }
                });
                const variantsSection = document.getElementById('logoVariantsSection');
                if (variantsSection) {
                    variantsSection.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar variantes:', error);
        }
    },
    
    displayLogoVariants(media) {
        const variantsSection = document.getElementById('logoVariantsSection');
        const variantsGrid = document.getElementById('logoVariantsGrid');
        
        if (!variantsSection || !variantsGrid) return;
        
        // Filtrar apenas variantes de logos
        const logoVariants = media.filter(item => 
            item.source_type === 'brand_asset' && 
            item.variant_key && 
            item.variant_key.includes('logo')
        );
        
        if (logoVariants.length === 0) {
            variantsSection.style.display = 'none';
            return;
        }
        
        // Agrupar por tipo de logo
        const variantsByType = {};
        logoVariants.forEach(variant => {
            const logoType = variant.variant_key.split('_')[0] + '_' + variant.variant_key.split('_')[1];
            if (!variantsByType[logoType]) {
                variantsByType[logoType] = [];
            }
            variantsByType[logoType].push(variant);
        });
        
        // Gerar HTML das variantes
        let variantsHTML = '';
        Object.keys(variantsByType).forEach(logoType => {
            const variants = variantsByType[logoType];
            const typeName = logoType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            variantsHTML += `
                <div class="variant-card">
                    <div class="variant-header">
                        <div class="variant-title">${typeName}</div>
                        <div class="variant-size">${variants.length} variantes</div>
                    </div>
                    <div class="variant-preview">
                        <img src="${variants[0].url}" alt="${typeName}">
                    </div>
                    <div class="variant-info">
                        <p><strong>Formatos:</strong> ${[...new Set(variants.map(v => v.format.toUpperCase()))].join(', ')}</p>
                        <p><strong>Dimensões:</strong> ${variants.map(v => `${v.width}x${v.height}`).join(', ')}</p>
                    </div>
                    <div class="variant-actions">
                        <button class="btn btn-secondary btn-sm" onclick="BrandingSEO.viewVariants('${logoType}')">
                            <i class="fas fa-eye"></i> Ver Todas
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="BrandingSEO.regenerateVariants('${logoType}')">
                            <i class="fas fa-sync"></i> Regenerar
                        </button>
                    </div>
                </div>
            `;
        });
        
        variantsGrid.innerHTML = variantsHTML;
        variantsSection.style.display = 'block';
    },
    
    displayLogoVariantsNew(media) {
        console.log('🖼️ Exibindo variantes de logos (nova versão):', media);
        
        const variantsSection = document.getElementById('logoVariantsSection');
        if (!variantsSection) return;
        
        // Filtrar apenas variantes de logos
        const logoVariants = media.filter(item => 
            item.source_type === 'brand_asset' && 
            item.variant_key && 
            item.variant_key.includes('logo')
        );
        
        if (logoVariants.length === 0) {
            // Mostrar mensagem em todas as categorias
            ['desktop', 'tablet', 'mobile', 'favicon', 'appIcon'].forEach(category => {
                const grid = document.getElementById(`${category}Variants`);
                if (grid) {
                    grid.innerHTML = '<p class="helper-text">Nenhuma variante encontrada. Clique em "Gerar Todas as Variantes" para criar.</p>';
                }
            });
            variantsSection.style.display = 'block';
            return;
        }
        
        // Organizar variantes por categoria
        const categories = {
            desktop: [],
            tablet: [],
            mobile: [],
            favicon: [],
            appIcon: []
        };
        
        logoVariants.forEach(variant => {
            const key = variant.variant_key.toLowerCase();
            if (key.includes('desktop')) {
                categories.desktop.push(variant);
            } else if (key.includes('tablet')) {
                categories.tablet.push(variant);
            } else if (key.includes('mobile') || key.includes('app-')) {
                if (key.includes('app-')) {
                    categories.appIcon.push(variant);
                } else {
                    categories.mobile.push(variant);
                }
            } else if (key.includes('favicon')) {
                categories.favicon.push(variant);
            }
        });
        
        // Renderizar cada categoria
        Object.keys(categories).forEach(category => {
            const grid = document.getElementById(`${category}Variants`);
            if (!grid) return;
            
            const variants = categories[category];
            if (variants.length === 0) {
                grid.innerHTML = '<p class="helper-text">Nenhuma variante desta categoria encontrada.</p>';
                return;
            }
            
            grid.innerHTML = variants.map(variant => `
                <div class="variant-card">
                    <div class="variant-header">
                        <h4 class="variant-title">${variant.variant_key}</h4>
                        <span class="variant-size">${variant.width}x${variant.height}</span>
                    </div>
                    <div class="variant-preview">
                        <img src="${variant.public_url}" alt="${variant.variant_key}" style="max-width: 100%; height: auto; border-radius: var(--radius-sm);">
                    </div>
                    <div class="variant-info">
                        <p><strong>Formato:</strong> ${variant.format.toUpperCase()}</p>
                        <p><strong>Tamanho:</strong> ${variant.width}x${variant.height}px</p>
                        <p><strong>Gerado:</strong> ${new Date(variant.created_at).toLocaleDateString('pt-PT')}</p>
                    </div>
                    <div class="variant-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.open('${variant.public_url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Ver
                        </button>
                    </div>
                </div>
            `).join('');
        });
        
        variantsSection.style.display = 'block';
        console.log('✅ Variantes organizadas por categoria:', Object.keys(categories).map(cat => `${cat}: ${categories[cat].length}`).join(', '));
    },
    
    updateLogosStatus(logos) {
        const statusContainer = document.getElementById('logosStatus');
        if (!statusContainer) {
            console.warn('⚠️ Container de status não encontrado');
            return;
        }
        
        // Mapear tipos de logo para IDs no HTML
        const logoTypeMap = {
            'logo_primary': 'logoPrimaryHorizontalStatus', // Compatibilidade
            'logo_primary_horizontal': 'logoPrimaryHorizontalStatus',
            'logo_primary_vertical': 'logoPrimaryVerticalStatus',
            'logo_secondary': 'logoSecondaryHorizontalStatus', // Compatibilidade
            'logo_secondary_horizontal': 'logoSecondaryHorizontalStatus',
            'logo_secondary_vertical': 'logoSecondaryVerticalStatus',
            'favicon': 'faviconStatus',
            'app_icon': 'appIconStatus'
        };
        
        // Agrupar logos por tipo e contar formatos
        const logosByType = {};
        logos.forEach(logo => {
            if (!logosByType[logo.type]) {
                logosByType[logo.type] = [];
            }
            logosByType[logo.type].push(logo);
        });
        
        // Atualizar cada status - mostrar quantos formatos existem
        Object.keys(logoTypeMap).forEach(type => {
            const statusId = logoTypeMap[type];
            const statusElement = document.getElementById(statusId);
            if (statusElement) {
                if (logosByType[type] && logosByType[type].length > 0) {
                    const formatCount = logosByType[type].length;
                    const preferredFormat = logosByType[type].find(l => l.is_preferred);
                    const formatText = preferredFormat ? `${formatCount} formato(s) (${preferredFormat.format.toUpperCase()} ⭐)` : `${formatCount} formato(s)`;
                    statusElement.textContent = formatText;
                    statusElement.className = 'status-value loaded';
                } else {
                    statusElement.textContent = 'Não carregado';
                    statusElement.className = 'status-value not-loaded';
                }
            } else {
                console.warn(`⚠️ Elemento de status não encontrado: ${statusId}`);
            }
        });
        
        statusContainer.style.display = 'grid';
        console.log('✅ Status dos logos atualizado');
    },
    
    async handleLogoUpload(type, input) {
        const file = input.files[0];
        if (!file) return;
        
        // Validar tipo e tamanho
        const validation = this.validateLogoFile(file, type);
        if (!validation.valid) {
            this.showToast(validation.error, 'error');
            return;
        }
        
        // Mapear tipo para ID do preview correto
        const logoPreviewMap = {
            'logo_primary': 'logoPrimaryHorizontalPreview', // Compatibilidade
            'logo_primary_horizontal': 'logoPrimaryHorizontalPreview',
            'logo_primary_vertical': 'logoPrimaryVerticalPreview',
            'logo_secondary': 'logoSecondaryHorizontalPreview', // Compatibilidade
            'logo_secondary_horizontal': 'logoSecondaryHorizontalPreview',
            'logo_secondary_vertical': 'logoSecondaryVerticalPreview',
            'favicon': 'faviconPreview',
            'app_icon': 'appIconPreview'
        };
        
        const previewId = logoPreviewMap[type] || `${type}Preview`;
        const previewContainer = document.getElementById(previewId);
        
        if (!previewContainer) {
            console.error('⚠️ Container de preview não encontrado:', previewId);
            this.showToast('Erro ao mostrar preview', 'error');
            return;
        }
        
        // Mostrar preview imediatamente
        const reader = new FileReader();
        reader.onload = (e) => {
            // Obter dimensões da imagem
            const img = new Image();
            img.onload = () => {
                previewContainer.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-3);">
                        <img src="${e.target.result}" class="preview-image" alt="${type}" style="max-width: 300px; max-height: 300px; width: auto; height: auto; border-radius: var(--radius-base); box-shadow: 0 2px 8px rgba(0,0,0,0.2); background: var(--bg-primary); padding: var(--spacing-2);">
                        <div class="preview-meta" style="margin-top: var(--spacing-3);">
                            <p><strong>Nome:</strong> ${file.name}</p>
                            <p><strong>Dimensões:</strong> ${img.width}x${img.height}px</p>
                            <p><strong>Tamanho:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
                            <p><strong>Formato:</strong> ${file.type || file.name.split('.').pop().toUpperCase()}</p>
                            <div style="margin-top: var(--spacing-3); display: flex; gap: var(--spacing-2); justify-content: center;">
                                <button class="btn btn-primary btn-sm" onclick="BrandingSEO.uploadLogo('${type}', '${previewId}')">
                                    <i class="fas fa-upload"></i> Carregar
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="BrandingSEO.clearLogoPreview('${type}')">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                previewContainer.style.display = 'block';
            };
            img.onerror = () => {
                // Se não conseguir carregar como imagem, mostrar info básica
                previewContainer.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-3);">
                        <div style="padding: var(--spacing-4); background: var(--bg-secondary); border-radius: var(--radius-base);">
                            <i class="fas fa-file-image" style="font-size: 48px; color: var(--primary); margin-bottom: var(--spacing-2);"></i>
                            <p><strong>Nome:</strong> ${file.name}</p>
                            <p><strong>Tamanho:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
                            <p><strong>Formato:</strong> ${file.type || file.name.split('.').pop().toUpperCase()}</p>
                            <div style="margin-top: var(--spacing-3); display: flex; gap: var(--spacing-2); justify-content: center;">
                                <button class="btn btn-primary btn-sm" onclick="BrandingSEO.uploadLogo('${type}', '${previewId}')">
                                    <i class="fas fa-upload"></i> Carregar
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="BrandingSEO.clearLogoPreview('${type}')">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        habagatang</div>
                    </div>
                `;
                previewContainer.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            this.showToast('Erro ao ler ficheiro', 'error');
        };
        reader.readAsDataURL(file);
    },
    
    clearLogoPreview(type) {
        // Mapear tipo para ID do preview correto
        const logoPreviewMap = {
            'logo_primary': 'logoPrimaryHorizontalPreview', // Compatibilidade
            'logo_primary_horizontal': 'logoPrimaryHorizontalPreview',
            'logo_primary_vertical': 'logoPrimaryVerticalPreview',
            'logo_secondary': 'logoSecondaryHorizontalPreview', // Compatibilidade
            'logo_secondary_horizontal': 'logoSecondaryHorizontalPreview',
            'logo_secondary_vertical': 'logoSecondaryVerticalPreview',
            'favicon': 'faviconPreview',
            'app_icon': 'appIconPreview'
        };
        
        const previewId = logoPreviewMap[type] || `${type}Preview`;
        const previewContainer = document.getElementById(previewId);
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
        }
        
        // Limpar input
        const logoInputMap = {
            'logo_primary': 'logoPrimaryHorizontalInput', // Compatibilidade
            'logo_primary_horizontal': 'logoPrimaryHorizontalInput',
            'logo_primary_vertical': 'logoPrimaryVerticalInput',
            'logo_secondary': 'logoSecondaryHorizontalInput', // Compatibilidade
            'logo_secondary_horizontal': 'logoSecondaryHorizontalInput',
            'logo_secondary_vertical': 'logoSecondaryVerticalInput',
            'favicon': 'faviconInput',
            'app_icon': 'appIconInput'
        };
        const inputId = logoInputMap[type];
        if (inputId) {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = '';
            }
        }
    },
    
    validateLogoFile(file, type) {
        const maxSize = 2 * 1024 * 1024; // 2 MB
        
        if (file.size > maxSize) {
            return { valid: false, error: 'Ficheiro muito grande. Máximo 2 MB.' };
        }
        
        const allowedTypes = {
            'logo_primary': ['image/svg+xml', 'image/svg', 'image/png', 'image/webp', 'image/jpeg', 'image/jpg'],
            'logo_primary_horizontal': ['image/svg+xml', 'image/svg', 'image/png', 'image/webp', 'image/jpeg', 'image/jpg'],
            'logo_primary_vertical': ['image/svg+xml', 'image/svg', 'image/png', 'image/webp', 'image/jpeg', 'image/jpg'],
            'logo_secondary': ['image/svg+xml', 'image/svg', 'image/png', 'image/webp', 'image/jpeg', 'image/jpg'],
            'logo_secondary_horizontal': ['image/svg+xml', 'image/svg', 'image/png', 'image/webp', 'image/jpeg', 'image/jpg'],
            'logo_secondary_vertical': ['image/svg+xml', 'image/svg', 'image/png', 'image/webp', 'image/jpeg', 'image/jpg'],
            'favicon': ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml', 'image/svg'],
            'app_icon': ['image/png', 'image/svg+xml', 'image/svg']
        };
        
        if (!allowedTypes[type]?.includes(file.type)) {
            return { valid: false, error: `Formato não suportado para ${type}.` };
        }
        
        return { valid: true };
    },
    
    async uploadLogo(type, previewId) {
        // Mapear tipo para ID do input correto
        const logoInputMap = {
            'logo_primary': 'logoPrimaryHorizontalInput', // Compatibilidade
            'logo_primary_horizontal': 'logoPrimaryHorizontalInput',
            'logo_primary_vertical': 'logoPrimaryVerticalInput',
            'logo_secondary': 'logoSecondaryHorizontalInput', // Compatibilidade
            'logo_secondary_horizontal': 'logoSecondaryHorizontalInput',
            'logo_secondary_vertical': 'logoSecondaryVerticalInput',
            'favicon': 'faviconInput',
            'app_icon': 'appIconInput'
        };
        
        // Mapear tipo para IDs dos campos de dimensões
        const dimensionFieldsMap = {
            'logo_primary_horizontal': { width: 'logoPrimaryHorizontalWidth', height: 'logoPrimaryHorizontalHeight' },
            'logo_primary_vertical': { width: 'logoPrimaryVerticalWidth', height: 'logoPrimaryVerticalHeight' },
            'logo_secondary_horizontal': { width: 'logoSecondaryHorizontalWidth', height: 'logoSecondaryHorizontalHeight' },
            'logo_secondary_vertical': { width: 'logoSecondaryVerticalWidth', height: 'logoSecondaryVerticalHeight' },
            'favicon': { size: 'faviconSize' },
            'app_icon': { size: 'appIconSize' }
        };
        
        const inputId = logoInputMap[type] || `${type}Input`;
        const fileInput = document.getElementById(inputId);
        
        if (!fileInput?.files[0]) {
            this.showToast('Nenhum ficheiro selecionado', 'error');
            return;
        }
        
        let file = fileInput.files[0];
        
        // Obter dimensões especificadas pelo utilizador
        const dimensionFields = dimensionFieldsMap[type];
        let targetWidth = null;
        let targetHeight = null;
        
        if (dimensionFields) {
            if (dimensionFields.width && dimensionFields.height) {
                // Logos - largura e altura
                const widthInput = document.getElementById(dimensionFields.width);
                const heightInput = document.getElementById(dimensionFields.height);
                targetWidth = widthInput?.value ? parseInt(widthInput.value) : null;
                targetHeight = heightInput?.value ? parseInt(heightInput.value) : null;
            } else if (dimensionFields.size) {
                // Favicon/App Icon - tamanho único
                const sizeInput = document.getElementById(dimensionFields.size);
                const size = sizeInput?.value ? parseInt(sizeInput.value) : null;
                if (size) {
                    targetWidth = size;
                    targetHeight = size;
                }
            }
        }
        
        // Se dimensões foram especificadas e o ficheiro é uma imagem raster (não SVG)
        if ((targetWidth || targetHeight) && file.type !== 'image/svg+xml' && file.type !== 'image/svg') {
            try {
                this.showToast('Redimensionando imagem...', 'info');
                
                // Ler ficheiro como ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                let sharpBuffer = Buffer.from(arrayBuffer);
                
                // Carregar sharp (precisa estar disponível no frontend ou fazer no backend)
                // Por enquanto, vamos enviar as dimensões para o backend processar
                console.log(`📐 Dimensões desejadas: ${targetWidth || 'auto'}x${targetHeight || 'auto'}`);
            } catch (error) {
                console.warn('⚠️ Erro ao processar dimensões:', error);
                // Continuar com upload normal
            }
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        // Enviar dimensões desejadas se especificadas
        if (targetWidth) formData.append('targetWidth', targetWidth.toString());
        if (targetHeight) formData.append('targetHeight', targetHeight.toString());
        
        try {
            this.showToast('A carregar logo...', 'info');
            
            const response = await fetch('/api/branding/upload-logo', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Logo carregado com sucesso!', 'success');
                // Recarregar logos para mostrar o novo
                await this.loadBrandAssets();
            } else {
                throw new Error(result.error || 'Erro ao carregar logo');
            }
        } catch (error) {
            console.error('Erro ao carregar logo:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async loadBrandAssets() {
        console.log('🔄 Carregando brand assets...');
        try {
            const response = await fetch('/api/branding/brand-assets', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Não autenticado');
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                console.log('✅ Brand assets carregados:', result.data.length);
                // Usar displayLogos com dados agrupados
                this.displayLogos(result.grouped || result.data);
                this.updateLogosStatus(result.data);
                // Carregar variantes também
                this.loadLogoVariants(result.data);
            } else {
                console.log('ℹ️ Nenhum brand asset encontrado');
                // Mostrar secção mesmo sem logos
                const statusContainer = document.getElementById('logosStatus');
                if (statusContainer) {
                    statusContainer.style.display = 'grid';
                }
                // Mostrar secção de variantes mesmo sem logos
                const variantsSection = document.getElementById('logoVariantsSection');
                if (variantsSection) {
                    variantsSection.style.display = 'block';
                    // Mostrar informações sobre as variantes que serão geradas
                    const categoryMessages = {
                        desktop: 'PNG: 512x512, 256x256 | WebP: 512x512, 256x256',
                        tablet: 'PNG: 384x384, 192x192 | WebP: 384x384',
                        mobile: 'PNG: 256x256, 128x128 | WebP: 256x256',
                        favicon: 'PNG: 32x32, 16x16, 48x48',
                        appIcon: 'PNG: 180x180, 152x152, 144x144, 120x120, 76x76, 60x60, 40x40, 29x29, 20x20'
                    };
                    
                    ['desktop', 'tablet', 'mobile', 'favicon', 'appIcon'].forEach(category => {
                        const grid = document.getElementById(`${category}Variants`);
                        if (grid) {
                            grid.innerHTML = `
                                <div class="variant-card" style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-5);">
                                    <p class="helper-text">
                                        <strong>Variantes que serão geradas:</strong><br>
                                        ${categoryMessages[category]}
                                    </p>
                                    <p class="helper-text" style="margin-top: var(--spacing-2);">
                                        Primeiro carregue os logos principais, depois clique em "Gerar Todas as Variantes".
                                    </p>
                                </div>
                            `;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar brand assets:', error);
        }
    },
    
    async deleteLogo(logoId) {
        if (!confirm('Tem certeza que deseja eliminar este logo?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/branding/brand-assets/${logoId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Logo eliminado com sucesso!', 'success');
                // Recarregar logos
                await this.loadBrandAssets();
            } else {
                throw new Error(result.error || 'Erro ao eliminar logo');
            }
        } catch (error) {
            console.error('Erro ao eliminar logo:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async generateAllVariants() {
        this.showToast('A gerar todas as variantes...', 'info');
        
        try {
            const response = await fetch('/api/branding/generate-logo-variants', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Variantes geradas com sucesso!', 'success');
                // Recarregar logos e variantes
                await this.loadBrandAssets();
            } else {
                throw new Error(result.error || 'Erro ao gerar variantes');
            }
        } catch (error) {
            console.error('Erro ao gerar variantes:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async regenerateVariants(logoType) {
        this.showToast(`A regenerar variantes para ${logoType}...`, 'info');
        
        try {
            const response = await fetch(`/api/branding/regenerate-logo-variants/${logoType}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Variantes regeneradas com sucesso!', 'success');
                // Recarregar logos e variantes
                await this.loadBrandAssets();
            } else {
                throw new Error(result.error || 'Erro ao regenerar variantes');
            }
        } catch (error) {
            console.error('Erro ao regenerar variantes:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async publishLogos() {
        this.showToast('A publicar logos...', 'info');
        
        try {
            const response = await fetch('/api/branding/publish-logos', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Logos publicados com sucesso!', 'success');
                // Recarregar logos
                await this.loadBrandAssets();
            } else {
                throw new Error(result.error || 'Erro ao publicar logos');
            }
        } catch (error) {
            console.error('Erro ao publicar logos:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    viewVariants(logoType) {
        // Implementar modal ou página para ver todas as variantes
        this.showToast(`Ver variantes de ${logoType} - Em desenvolvimento`, 'info');
    },
    
    // ==========================================
    // METADADOS GLOBAIS
    // ==========================================
    async generateGlobalMetadata() {
        console.log('🤖 Gerando metadados globais com IA...');
        
        try {
            this.showToast('A gerar metadados globais com IA...', 'info');
            
            const response = await fetch('/api/branding/generate-global-metadata', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.populateGlobalMetadataForm(result.data);
                this.showToast('Metadados globais gerados com IA!', 'success');
            } else {
                throw new Error(result.error || 'Erro ao gerar metadados globais');
            }
        } catch (error) {
            console.error('Erro ao gerar metadados globais:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    populateGlobalMetadataForm(data) {
        console.log('📝 Preenchendo formulário de metadados globais:', data);
        
        // Função auxiliar para definir valor de forma segura
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = (value !== undefined && value !== null) ? String(value) : '';
            } else {
                console.warn(`⚠️ Campo não encontrado: ${id}`);
            }
        };
        
        // Mapear campos do banco (snake_case) para o formulário
        // O banco retorna: site_title, site_description, og_site_name, canonical_url, robots_directives
        // A IA retorna: siteTitle, siteDescription, ogSiteName, canonicalUrl, robotsDirectives
        const title = data.siteTitle || data.site_title || '';
        const description = data.siteDescription || data.site_description || '';
        const keywords = data.keywords || [];
        const ogName = data.ogSiteName || data.og_site_name || 'Kromi.online';
        const canonical = data.canonicalUrl || data.canonical_url || 'https://kromi.online';
        const robots = data.robotsDirectives || data.robots_directives || 'index,follow';
        
        // Preencher campos
        setValue('globalSiteTitle', title);
        setValue('globalSiteDescription', description);
        setValue('globalKeywords', Array.isArray(keywords) ? keywords.join(', ') : (keywords || ''));
        setValue('ogSiteName', ogName);
        setValue('globalCanonical', canonical);
        setValue('globalRobots', robots);
        
        // Atualizar contadores de caracteres
        this.updateGlobalCharCounts();
        
        console.log('✅ Formulário de metadados globais preenchido:', {
            title,
            description,
            keywords: keywords.length
        });
    },
    
    updateGlobalCharCounts() {
        // Atualizar contador do título
        const titleInput = document.getElementById('globalSiteTitle');
        const titleCount = document.getElementById('globalTitleCount');
        if (titleInput && titleCount) {
            const count = titleInput.value.length;
            titleCount.textContent = `${count} / 60`;
            titleCount.className = `char-count ${count > 60 ? 'error' : count > 50 ? 'warning' : ''}`;
        }
        
        // Atualizar contador da descrição
        const descInput = document.getElementById('globalSiteDescription');
        const descCount = document.getElementById('globalDescCount');
        if (descInput && descCount) {
            const count = descInput.value.length;
            descCount.textContent = `${count} / 160`;
            descCount.className = `char-count ${count > 160 ? 'error' : count > 140 ? 'warning' : ''}`;
        }
    },
    
    async saveGlobalMetadata() {
        console.log('💾 Guardando metadados globais...');
        
        // Recolher dados do formulário
        const getValue = (id) => {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`⚠️ Campo não encontrado: ${id}`);
                return '';
            }
            return el.value || '';
        };
        
        // Verificar valores diretamente dos elementos
        const titleEl = document.getElementById('globalSiteTitle');
        const descEl = document.getElementById('globalSiteDescription');
        
        console.log('🔍 Debug - Elementos DOM:', {
            titleEl: titleEl ? { exists: true, value: titleEl.value, length: titleEl.value.length } : { exists: false },
            descEl: descEl ? { exists: true, value: descEl.value, length: descEl.value.length } : { exists: false }
        });
        
        const siteTitle = getValue('globalSiteTitle');
        const siteDescription = getValue('globalSiteDescription');
        
        console.log('🔍 Debug - Valores recolhidos:', {
            siteTitle,
            siteDescription,
            titleLength: siteTitle ? siteTitle.length : 0,
            descLength: siteDescription ? siteDescription.length : 0
        });
        
        const data = {
            siteTitle: siteTitle,
            siteDescription: siteDescription,
            keywords: getValue('globalKeywords').split(',').map(k => k.trim()).filter(k => k),
            ogSiteName: getValue('ogSiteName'),
            canonicalUrl: getValue('globalCanonical'),
            robotsDirectives: getValue('globalRobots') || 'index,follow'
        };
        
        console.log('📤 Dados a enviar:', data);
        
        // Validar dados mínimos
        if (!data.siteTitle || !data.siteDescription) {
            this.showToast('Título e descrição são obrigatórios', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/branding/global-metadata', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            console.log('📥 Resposta recebida:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Resultado:', result);
            
            if (result.success) {
                this.showToast('Metadados globais guardados com sucesso!', 'success');
                this.updateGlobalMetadataStatus('draft');
            } else {
                throw new Error(result.error || 'Erro ao guardar metadados globais');
            }
        } catch (error) {
            console.error('❌ Erro ao guardar metadados globais:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
            throw error; // Re-throw para saveAll() poder capturar
        }
    },
    
    async publishGlobalMetadata() {
        console.log('📤 Publicando metadados globais...');
        
        try {
            const response = await fetch('/api/branding/global-metadata/publish', {
                method: 'POST',
                credentials: 'include'
            });
            
            console.log('📥 Resposta de publish:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta de publish:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Resultado de publish:', result);
            
            if (result.success) {
                this.showToast('Metadados globais publicados com sucesso!', 'success');
                this.updateGlobalMetadataStatus('published');
                // Recarregar para garantir que temos os dados atualizados
                await this.loadGlobalMetadata();
            } else {
                throw new Error(result.error || 'Erro ao publicar metadados globais');
            }
        } catch (error) {
            console.error('Erro ao publicar metadados globais:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async loadGlobalMetadata() {
        console.log('📊 Carregando metadados globais...');
        
        try {
            const response = await fetch('/api/branding/global-metadata', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ Nenhum metadado global encontrado');
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.populateGlobalMetadataForm(result.data);
                this.updateGlobalMetadataStatus(result.data.status || 'draft');
            }
        } catch (error) {
            console.error('Erro ao carregar metadados globais:', error);
        }
    },
    
    updateGlobalMetadataStatus(status) {
        const statusElement = document.getElementById('globalMetadataStatusText');
        if (statusElement) {
            statusElement.textContent = status === 'published' ? 'Publicado' : 'Rascunho';
            statusElement.style.color = status === 'published' ? 'var(--success)' : 'var(--warning)';
        }
    },
    
    setupEventListeners() {
        // Contadores de caracteres
        const globalTitle = document.getElementById('globalSiteTitle');
        const globalDesc = document.getElementById('globalSiteDescription');
        const pageTitle = document.getElementById('pageTitle');
        const pageDesc = document.getElementById('pageDescription');
        
        // Event listeners para metadados globais
        if (globalTitle) {
            globalTitle.addEventListener('input', () => this.updateGlobalCharCounts());
        }
        if (globalDesc) {
            globalDesc.addEventListener('input', () => this.updateGlobalCharCounts());
        }
        
        if (globalTitle) {
            globalTitle.addEventListener('input', () => {
                const count = globalTitle.value.length;
                const countEl = document.getElementById('globalTitleCount');
                if (countEl) {
                    countEl.textContent = `${count} / 60`;
                    countEl.className = count > 60 ? 'char-count error' : (count > 50 ? 'char-count warning' : 'char-count');
                }
                this.updateMetaPreview();
            });
        }
        
        if (globalDesc) {
            globalDesc.addEventListener('input', () => {
                const count = globalDesc.value.length;
                const countEl = document.getElementById('globalDescCount');
                if (countEl) {
                    countEl.textContent = `${count} / 160`;
                    countEl.className = count > 160 ? 'char-count error' : (count < 140 ? 'char-count warning' : 'char-count');
                }
                this.updateMetaPreview();
            });
        }
        
        if (pageTitle) {
            pageTitle.addEventListener('input', () => {
                const count = pageTitle.value.length;
                const countEl = document.getElementById('pageTitleCount');
                if (countEl) {
                    countEl.textContent = `${count} / 60`;
                    countEl.className = count > 60 ? 'char-count error' : (count > 50 ? 'char-count warning' : 'char-count');
                }
                this.updateMetaPreview();
            });
        }
        
        if (pageDesc) {
            pageDesc.addEventListener('input', () => {
                const count = pageDesc.value.length;
                const countEl = document.getElementById('pageDescCount');
                if (countEl) {
                    countEl.textContent = `${count} / 160`;
                    countEl.className = count > 160 ? 'char-count error' : (count < 140 ? 'char-count warning' : 'char-count');
                }
                this.updateMetaPreview();
            });
        }
    },
    
    updateMetaPreview() {
        const title = document.getElementById('pageTitle')?.value || 
                      document.getElementById('globalSiteTitle')?.value || 
                      'Título da Página';
        const description = document.getElementById('pageDescription')?.value || 
                           document.getElementById('globalSiteDescription')?.value || 
                           'Descrição da página...';
        const url = document.getElementById('pageCanonical')?.value || 
                   document.getElementById('globalCanonical')?.value || 
                   'https://kromi.online';
        
        const preview = document.getElementById('metaPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="preview-card-header">
                    <div class="preview-card-title">${title}</div>
                    <div class="preview-card-url">${url}</div>
                </div>
                <div class="preview-card-description">${description}</div>
            `;
        }
    },
    
    // ==========================================
    // REGISTRO DE PÁGINAS
    // ==========================================
    async loadPageRegistry() {
        try {
            const response = await fetch('/api/branding/pages', {
                credentials: 'include' // Incluir cookies
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Não autenticado');
                    window.location.href = '/src/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                const selectors = [
                    document.getElementById('pageSelector'),
                    document.getElementById('thumbnailPageSelector'),
                    document.getElementById('aiPageSelector')
                ];
                
                selectors.forEach(selector => {
                    if (!selector) return;
                    
                    // Limpar opções existentes (exceto primeira)
                    while (selector.options.length > 1) {
                        selector.remove(1);
                    }
                    
                    // Adicionar páginas
                    result.data.forEach(page => {
                        const option = document.createElement('option');
                        option.value = page.id;
                        option.textContent = `${page.label} (${page.route})`;
                        selector.appendChild(option);
                    });
                });
            } else {
                console.warn('Nenhuma página encontrada. Adicione páginas primeiro.');
            }
        } catch (error) {
            console.error('Erro ao carregar páginas:', error);
            this.showToast('Erro ao carregar páginas', 'error');
        }
    },
    
    async addPage() {
        const route = prompt('Digite a rota da página (ex: /about, /products):');
        if (!route) return;
        
        // Validar formato da rota
        if (!route.startsWith('/')) {
            this.showToast('A rota deve começar com /', 'warning');
            return;
        }
        
        const label = prompt('Digite o nome da página:');
        if (!label) return;
        
        try {
            const response = await fetch('/api/branding/pages', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ route, label })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Página adicionada!', 'success');
                // Recarregar lista imediatamente
                await this.loadPageRegistry();
            } else {
                this.showToast(result.error || 'Erro ao adicionar página', 'error');
            }
        } catch (error) {
            console.error('Erro ao adicionar página:', error);
            this.showToast('Erro ao adicionar página', 'error');
        }
    },
    
    async onPageChange() {
        const pageId = document.getElementById('pageSelector')?.value;
        console.log('🔄 Página alterada para:', pageId);
        
        if (!pageId) {
            this.resetPageMetaForm();
            document.getElementById('pageMetaForm').style.display = 'none';
            const generateBtn = document.getElementById('generateMetadataBtn');
            if (generateBtn) generateBtn.disabled = true;
            return;
        }
        
        // SEMPRE carregar dados da base de dados quando muda a página
        await this.loadPageMetaFromDatabase(pageId);
    },
    
    async loadPageMetaFromDatabase(pageId) {
        console.log('📊 Carregando metadados da base de dados para página:', pageId);
        
        const generateBtn = document.getElementById('generateMetadataBtn');
        if (generateBtn) generateBtn.disabled = true;
        
        this.currentPageId = pageId;
        
        try {
            const response = await fetch(`/api/branding/page-meta/${pageId}`, {
                credentials: 'include'
            });
            
            console.log('📡 Resposta da API:', response.status, response.statusText);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('❌ Não autenticado');
                    this.showToast('Sessão expirada. Faça login novamente.', 'error');
                    return;
                }
                // Se 404, mostrar formulário vazio (página sem metadados ainda)
                if (response.status === 404) {
                    console.log('ℹ️ Nenhum metadado encontrado para esta página - mostrando formulário vazio');
                    this.resetPageMetaForm();
                    document.getElementById('pageMetaForm').style.display = 'block';
                    if (generateBtn) generateBtn.disabled = false;
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Dados carregados da base de dados:', result);
            
            if (result.success && result.data) {
                this.populatePageMetaForm(result.data);
                console.log('📝 Formulário preenchido com dados da base de dados');
            } else {
                console.warn('⚠️ Resposta sem dados válidos');
                this.resetPageMetaForm();
            }
            
            document.getElementById('pageMetaForm').style.display = 'block';
            if (generateBtn) generateBtn.disabled = false;
            this.updateMetaPreview();
            
        } catch (error) {
            console.error('❌ Erro ao carregar metadados da base de dados:', error);
            this.showToast(`Erro ao carregar metadados: ${error.message}`, 'error');
            this.resetPageMetaForm();
            document.getElementById('pageMetaForm').style.display = 'block';
            if (generateBtn) generateBtn.disabled = false;
        }
    },
    
    async loadPageMeta() {
        // Esta função agora é apenas para compatibilidade - usar onPageChange() em vez disso
        console.warn('⚠️ loadPageMeta() está deprecated - usar onPageChange()');
        await this.onPageChange();
    },
    
    populatePageMetaForm(meta) {
        // Função auxiliar para definir valor de forma segura
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                // Converter undefined/null para string vazia
                el.value = (value !== undefined && value !== null) ? String(value) : '';
            } else {
                console.warn(`⚠️ Campo não encontrado: ${id}`);
            }
        };
        
        console.log('📝 Preenchendo formulário com dados:', meta);
        
        // Campos básicos
        setValue('pageTitle', meta.title);
        setValue('pageDescription', meta.description);
        setValue('pageKeywords', Array.isArray(meta.keywords) ? meta.keywords.join(', ') : (meta.keywords || ''));
        setValue('pageCanonical', meta.canonical_url);
        setValue('pageRobots', meta.robots_directives || 'index,follow');
        setValue('pageDeepLink', meta.deep_link);
        
        // Open Graph
        setValue('ogTitle', meta.og_title);
        setValue('ogDescription', meta.og_description);
        setValue('ogType', meta.og_type || 'website');
        
        // Redes sociais (TODOS os campos, mesmo novos)
        setValue('facebookTitle', meta.facebook_title);
        setValue('facebookDescription', meta.facebook_description);
        setValue('instagramTitle', meta.instagram_title);
        setValue('instagramDescription', meta.instagram_description);
        setValue('linkedinTitle', meta.linkedin_title);
        setValue('linkedinDescription', meta.linkedin_description);
        setValue('twitterTitle', meta.twitter_title);
        setValue('twitterDescription', meta.twitter_description);
        setValue('twitterCard', meta.twitter_card || 'summary_large_image');
        setValue('googleTitle', meta.google_title);
        setValue('googleDescription', meta.google_description);
        setValue('tiktokTitle', meta.tiktok_title);
        setValue('tiktokDescription', meta.tiktok_description);
        setValue('whatsappTitle', meta.whatsapp_title);
        setValue('whatsappDescription', meta.whatsapp_description);
        setValue('telegramTitle', meta.telegram_title);
        setValue('telegramDescription', meta.telegram_description);
        
        console.log('✅ Formulário preenchido');
        
        // Atualizar contadores de caracteres
        this.updateCharCounts();
    },
    
    resetPageMetaForm() {
        // Função auxiliar para resetar valor de forma segura
        const resetValue = (id, defaultValue = '') => {
            const el = document.getElementById(id);
            if (el) el.value = defaultValue;
        };
        
        // Campos básicos
        resetValue('pageTitle');
        resetValue('pageDescription');
        resetValue('pageKeywords');
        resetValue('pageCanonical');
        resetValue('pageRobots', 'index,follow');
        resetValue('pageDeepLink');
        
        // Open Graph
        resetValue('ogTitle');
        resetValue('ogDescription');
        resetValue('ogType', 'website');
        
        // Redes sociais
        resetValue('facebookTitle');
        resetValue('facebookDescription');
        resetValue('instagramTitle');
        resetValue('instagramDescription');
        resetValue('linkedinTitle');
        resetValue('linkedinDescription');
        resetValue('twitterTitle');
        resetValue('twitterDescription');
        resetValue('twitterCard', 'summary_large_image');
        resetValue('googleTitle');
        resetValue('googleDescription');
        resetValue('tiktokTitle');
        resetValue('tiktokDescription');
        resetValue('whatsappTitle');
        resetValue('whatsappDescription');
        resetValue('telegramTitle');
        resetValue('telegramDescription');
        
        this.updateCharCounts();
    },
    
    updateCharCounts() {
        const titleEl = document.getElementById('pageTitle');
        const descEl = document.getElementById('pageDescription');
        if (titleEl) {
            const count = titleEl.value.length;
            const countEl = document.getElementById('pageTitleCount');
            if (countEl) countEl.textContent = `${count} / 60`;
        }
        if (descEl) {
            const count = descEl.value.length;
            const countEl = document.getElementById('pageDescCount');
            if (countEl) countEl.textContent = `${count} / 160`;
        }
    },
    
    async generateFullMetadata() {
        const pageId = this.currentPageId || document.getElementById('pageSelector')?.value;
        
        if (!pageId) {
            this.showToast('Selecione uma página primeiro', 'warning');
            return;
        }
        
        const generateBtn = document.getElementById('generateMetadataBtn');
        const originalText = generateBtn?.innerHTML;
        const pageMetaForm = document.getElementById('pageMetaForm');
        
        try {
            // Mostrar loading
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
            }
            
            this.showToast('A gerar metadados com IA...', 'info');
            
            const response = await fetch(`/api/branding/generate-full-metadata/${pageId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao gerar metadados');
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Garantir que o formulário está visível
                if (pageMetaForm) {
                    pageMetaForm.style.display = 'block';
                }
                
                // Aguardar um frame para garantir que o DOM está atualizado
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Preencher formulário com dados gerados
                this.populatePageMetaForm(result.data);
                this.updateMetaPreview();
                this.showToast('Metadados gerados com sucesso! Revise e ajuste se necessário.', 'success');
            } else {
                throw new Error('Resposta inválida do servidor');
            }
            
        } catch (error) {
            console.error('Erro ao gerar metadados:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        } finally {
            // Restaurar botão
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalText || '<i class="fas fa-magic"></i> Gerar com IA';
            }
        }
    },
    
    async savePageMeta() {
        console.log('💾 savePageMeta chamado');
        console.log('📄 currentPageId:', this.currentPageId);
        console.log('📄 pageSelector value:', document.getElementById('pageSelector')?.value);
        
        // Tentar obter pageId de múltiplas fontes
        const pageId = this.currentPageId || document.getElementById('pageSelector')?.value;
        
        if (!pageId) {
            this.showToast('Selecione uma página primeiro', 'warning');
            return;
        }
        
        // Atualizar currentPageId se necessário
        if (!this.currentPageId) {
            this.currentPageId = pageId;
        }
        
        // Recolher todos os dados do formulário
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        
        const data = {
            pageId: this.currentPageId,
            title: getValue('pageTitle'),
            description: getValue('pageDescription'),
            keywords: getValue('pageKeywords').split(',').map(k => k.trim()).filter(k => k),
            canonical: getValue('pageCanonical'),
            robots: getValue('pageRobots') || 'index,follow',
            deepLink: getValue('pageDeepLink'),
            ogTitle: getValue('ogTitle'),
            ogDescription: getValue('ogDescription'),
            ogType: getValue('ogType') || 'website',
            facebookTitle: getValue('facebookTitle'),
            facebookDescription: getValue('facebookDescription'),
            instagramTitle: getValue('instagramTitle'),
            instagramDescription: getValue('instagramDescription'),
            linkedinTitle: getValue('linkedinTitle'),
            linkedinDescription: getValue('linkedinDescription'),
            twitterTitle: getValue('twitterTitle'),
            twitterDescription: getValue('twitterDescription'),
            twitterCard: getValue('twitterCard') || 'summary_large_image',
            googleTitle: getValue('googleTitle'),
            googleDescription: getValue('googleDescription'),
            tiktokTitle: getValue('tiktokTitle'),
            tiktokDescription: getValue('tiktokDescription'),
            whatsappTitle: getValue('whatsappTitle'),
            whatsappDescription: getValue('whatsappDescription'),
            telegramTitle: getValue('telegramTitle'),
            telegramDescription: getValue('telegramDescription')
        };
        
        console.log('📤 Dados a enviar:', data);
        
        try {
            const response = await fetch('/api/branding/page-meta', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            console.log('📡 Status da resposta:', response.status, response.statusText);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                console.error('❌ Erro da API:', errorData);
                throw new Error(errorData.error || `Erro HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Resultado:', result);
            
            if (result.success) {
                this.showToast('Metadados guardados com sucesso!', 'success');
                // Atualizar preview
                if (typeof this.updateMetaPreview === 'function') {
                    this.updateMetaPreview();
                }
            } else {
                throw new Error(result.error || 'Erro ao guardar');
            }
        } catch (error) {
            console.error('❌ Erro ao guardar metadados:', error);
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    async publishPageMeta() {
        if (!this.currentPageId) {
            this.showToast('Selecione uma página primeiro', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/branding/publish-page-meta/${this.currentPageId}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Metadados publicados!', 'success');
            } else {
                this.showToast(result.error || 'Erro ao publicar', 'error');
            }
        } catch (error) {
            console.error('Erro ao publicar metadados:', error);
            this.showToast('Erro ao publicar metadados', 'error');
        }
    },
    
    // ==========================================
    // THUMBNAILS
    // ==========================================
    async loadThumbnails() {
        const pageId = document.getElementById('thumbnailPageSelector')?.value;
        if (!pageId) {
            document.getElementById('thumbnailForm').style.display = 'none';
            return;
        }
        
        this.currentPageId = pageId;
        
        try {
            const response = await fetch(`/api/branding/thumbnails/${pageId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Não autenticado');
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Mapeamento de usage para preview e alt IDs
                const usageMap = {
                    'og_image': { preview: 'ogImagePreview', alt: 'ogImageAlt' },
                    'facebook_image': { preview: 'facebookImagePreview', alt: 'facebookImageAlt' },
                    'twitter_image': { preview: 'twitterImagePreview', alt: 'twitterImageAlt' },
                    'instagram_image': { preview: 'instagramImagePreview', alt: 'instagramImageAlt' },
                    'linkedin_image': { preview: 'linkedinImagePreview', alt: 'linkedinImageAlt' },
                    'google_image': { preview: 'googleImagePreview', alt: 'googleImageAlt' },
                    'tiktok_image': { preview: 'tiktokImagePreview', alt: 'tiktokImageAlt' },
                    'whatsapp_image': { preview: 'whatsappImagePreview', alt: 'whatsappImageAlt' },
                    'telegram_image': { preview: 'telegramImagePreview', alt: 'telegramImageAlt' }
                };
                
                result.data.forEach(thumb => {
                    const mapping = usageMap[thumb.usage];
                    if (mapping) {
                        const preview = document.getElementById(mapping.preview);
                        const altInput = document.getElementById(mapping.alt);
                        
                        if (preview) {
                            preview.innerHTML = `<img src="${thumb.url}" class="preview-image" style="max-width: 100%; height: auto; border-radius: var(--radius-base);">`;
                            preview.style.display = 'block';
                        }
                        
                        if (altInput) {
                            altInput.value = thumb.alt_text || '';
                        }
                    }
                });
            }
            
            document.getElementById('thumbnailForm').style.display = 'block';
        } catch (error) {
            console.error('Erro ao carregar thumbnails:', error);
        }
    },
    
    async handleThumbnailUpload(usage, input) {
        const file = input.files[0];
        if (!file) return;
        
        // Validar dimensões (basic validation, real validation on server)
        const validation = this.validateThumbnailFile(file, usage);
        if (!validation.valid) {
            this.showToast(validation.error, 'error');
            return;
        }
        
        const previewId = `${usage}Preview`;
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.getElementById(previewId);
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <img src="${e.target.result}" class="preview-image" alt="${usage}">
                    <div class="preview-meta">
                        <p><strong>Nome:</strong> ${file.name}</p>
                        <p><strong>Tamanho:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
                        <button class="btn btn-primary btn-sm" onclick="BrandingSEO.uploadThumbnail('${usage}', '${previewId}')" style="margin-top: var(--spacing-2);">
                            <i class="fas fa-upload"></i> Carregar
                        </button>
                    </div>
                `;
                previewContainer.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },
    
    validateThumbnailFile(file, usage) {
        // Tamanhos máximos por tipo
        const maxSizes = {
            'tiktok_image': 2 * 1024 * 1024, // 2 MB para TikTok
            'default': 1.5 * 1024 * 1024 // 1.5 MB padrão
        };
        
        const maxSize = maxSizes[usage] || maxSizes.default;
        
        if (file.size > maxSize) {
            const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
            return { valid: false, error: `Ficheiro muito grande. Máximo ${maxMB} MB.` };
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Formato não suportado. Use JPG ou PNG.' };
        }
        
        // Dimensões recomendadas por plataforma
        const dimensions = {
            'facebook_image': { width: 1200, height: 630, name: 'Facebook/OG (1200x630px)' },
            'og_image': { width: 1200, height: 630, name: 'Open Graph (1200x630px)' },
            'instagram_image': { width: 1080, height: 1080, name: 'Instagram (1080x1080px ou 1080x566px)' },
            'linkedin_image': { width: 1200, height: 627, name: 'LinkedIn (1200x627px)' },
            'twitter_image': { width: 1200, height: 675, name: 'Twitter (1200x675px)' },
            'google_image': { width: 1200, height: 675, name: 'Google (1200x675px)' },
            'tiktok_image': { width: 1080, height: 1920, name: 'TikTok (1080x1920px - VERTICAL)' },
            'whatsapp_image': { width: 1200, height: 630, name: 'WhatsApp (1200x630px)' },
            'telegram_image': { width: 1200, height: 630, name: 'Telegram (1200x630px)' }
        };
        
        return { valid: true, dimensions: dimensions[usage] };
    },
    
    // Mapeamento de usage para input ID
    getThumbnailInputId(usage) {
        const mapping = {
            'og_image': 'ogImageInput',
            'facebook_image': 'facebookImageInput',
            'twitter_image': 'twitterImageInput',
            'instagram_image': 'instagramImageInput',
            'linkedin_image': 'linkedinImageInput',
            'google_image': 'googleImageInput',
            'tiktok_image': 'tiktokImageInput',
            'whatsapp_image': 'whatsappImageInput',
            'telegram_image': 'telegramImageInput'
        };
        return mapping[usage] || `${usage}Input`;
    },
    
    // Mapeamento de usage para alt text ID
    getThumbnailAltId(usage) {
        const mapping = {
            'og_image': 'ogImageAlt',
            'facebook_image': 'facebookImageAlt',
            'twitter_image': 'twitterImageAlt',
            'instagram_image': 'instagramImageAlt',
            'linkedin_image': 'linkedinImageAlt',
            'google_image': 'googleImageAlt',
            'tiktok_image': 'tiktokImageAlt',
            'whatsapp_image': 'whatsappImageAlt',
            'telegram_image': 'telegramImageAlt'
        };
        return mapping[usage] || `${usage}Alt`;
    },
    
    async handleThumbnailUpload(usage, fileInput) {
        if (!this.currentPageId) {
            this.showToast('Selecione uma página primeiro', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        if (!file) return;
        
        // Validar ficheiro
        const validation = this.validateThumbnailFile(file, usage);
        if (!validation.valid) {
            this.showToast(validation.error, 'warning');
            return;
        }
        
        const altTextId = this.getThumbnailAltId(usage);
        const altText = document.getElementById(altTextId)?.value || '';
        
        // Alt text é obrigatório para todas exceto WhatsApp/Telegram que são opcionais
        const optionalPlatforms = ['whatsapp_image', 'telegram_image'];
        if (!optionalPlatforms.includes(usage) && !altText) {
            this.showToast('Alt text é obrigatório', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pageId', this.currentPageId);
        formData.append('usage', usage);
        formData.append('altText', altText);
        
        try {
            const response = await fetch('/api/branding/upload-thumbnail', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Thumbnail carregado com sucesso!', 'success');
                // Mostrar preview
                const previewId = `${usage}Preview`;
                const previewDiv = document.getElementById(previewId);
                if (previewDiv) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.borderRadius = 'var(--radius-base)';
                    previewDiv.innerHTML = '';
                    previewDiv.appendChild(img);
                    previewDiv.style.display = 'block';
                }
                await this.loadThumbnails();
            } else {
                this.showToast(result.error || 'Erro ao carregar thumbnail', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar thumbnail:', error);
            this.showToast('Erro ao carregar thumbnail', 'error');
        }
    },
    
    async uploadThumbnail(usage, previewId) {
        // Função de compatibilidade - usar handleThumbnailUpload em vez disso
        const inputId = this.getThumbnailInputId(usage);
        const fileInput = document.getElementById(inputId);
        if (!fileInput) {
            console.warn(`Input não encontrado para ${usage}`);
            return;
        }
        await this.handleThumbnailUpload(usage, fileInput);
    },
    
    async saveThumbnails() {
        // Thumbnails são salvos no upload, este método pode ser usado para atualizar alt_text, etc.
        this.showToast('Thumbnails já foram guardados', 'info');
    },
    
    async publishThumbnails() {
        if (!this.currentPageId) {
            this.showToast('Selecione uma página primeiro', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/branding/publish-thumbnails/${this.currentPageId}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Thumbnails publicados!', 'success');
            } else {
                this.showToast(result.error || 'Erro ao publicar', 'error');
            }
        } catch (error) {
            console.error('Erro ao publicar thumbnails:', error);
            this.showToast('Erro ao publicar thumbnails', 'error');
        }
    },
    
    async generateAltTextWithAI(usage) {
        console.log('🤖 Gerando Alt Text com IA para:', usage);
        
        // Obter ficheiro de imagem do input
        const inputId = this.getThumbnailInputId(usage);
        const fileInput = document.getElementById(inputId);
        
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
            this.showToast('Selecione uma imagem primeiro', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const altInputId = this.getThumbnailAltId(usage);
        const altInput = document.getElementById(altInputId);
        
        if (!altInput) {
            console.error('Campo de alt text não encontrado:', altInputId);
            return;
        }
        
        // Mostrar loading
        const originalValue = altInput.value;
        altInput.value = '🔄 A gerar com IA...';
        altInput.disabled = true;
        
        try {
            // Converter imagem para base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Image = e.target.result;
                
                try {
                    const response = await fetch('/api/branding/generate-alt-text', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageBase64: base64Image,
                            imageType: file.type,
                            usage: usage,
                            pageId: this.currentPageId
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success && result.altText) {
                        altInput.value = result.altText;
                        this.showToast('Alt Text gerado com IA!', 'success');
                    } else {
                        throw new Error(result.error || 'Erro ao gerar alt text');
                    }
                } catch (error) {
                    console.error('Erro ao gerar alt text:', error);
                    altInput.value = originalValue;
                    this.showToast(`Erro: ${error.message}`, 'error');
                } finally {
                    altInput.disabled = false;
                }
            };
            
            reader.onerror = () => {
                altInput.value = originalValue;
                altInput.disabled = false;
                this.showToast('Erro ao ler imagem', 'error');
            };
            
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('Erro ao gerar alt text:', error);
            altInput.value = originalValue;
            altInput.disabled = false;
            this.showToast(`Erro: ${error.message}`, 'error');
        }
    },
    
    // ==========================================
    // GERAÇÃO COM IA
    // ==========================================
    async loadAIPage() {
        const pageId = document.getElementById('aiPageSelector')?.value;
        if (!pageId) {
            document.getElementById('aiGenerationForm').style.display = 'none';
            return;
        }
        
        this.currentPageId = pageId;
        document.getElementById('aiGenerationForm').style.display = 'block';
    },
    
    async generateWithAI() {
        if (!this.currentPageId) {
            this.showToast('Selecione uma página primeiro', 'warning');
            return;
        }
        
        const draftText = document.getElementById('aiDraftText')?.value;
        if (!draftText) {
            this.showToast('Digite um draft ou contexto', 'warning');
            return;
        }
        
        const taskType = document.getElementById('aiTaskType')?.value;
        
        try {
            const response = await fetch('/api/branding/generate-ai', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: this.currentPageId,
                    draftText,
                    taskType
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Se retornou jobId, fazer polling
                if (result.jobId && !result.data) {
                    this.pollAIJob(result.jobId);
                } else if (result.data) {
                    this.displayAIResults(result.data.variations || result.data);
                } else {
                    this.showToast('Geração iniciada. Resultados serão carregados...', 'info');
                    // Fazer polling após 3 segundos
                    setTimeout(() => {
                        if (result.jobId) {
                            this.pollAIJob(result.jobId);
                        }
                    }, 3000);
                }
            } else {
                this.showToast(result.error || 'Erro ao gerar com IA', 'error');
            }
        } catch (error) {
            console.error('Erro ao gerar com IA:', error);
            this.showToast('Erro ao gerar com IA', 'error');
        }
    },
    
    async pollAIJob(jobId) {
        try {
            const maxAttempts = 10;
            let attempts = 0;
            
            const poll = async () => {
                attempts++;
                const response = await fetch(`/api/branding/ai-job/${jobId}`, {
                    credentials: 'include'
                });
                
                if (!response.ok) return;
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    if (result.data.status === 'succeeded' && result.data.result_json) {
                        this.displayAIResults(result.data.result_json.variations || result.data.result_json);
                        return;
                    } else if (result.data.status === 'failed') {
                        this.showToast(result.data.error_message || 'Erro na geração', 'error');
                        return;
                    }
                }
                
                // Continuar polling se ainda não terminou
                if (attempts < maxAttempts && (!result.data || result.data.status === 'running' || result.data.status === 'queued')) {
                    setTimeout(poll, 2000);
                } else if (attempts >= maxAttempts) {
                    this.showToast('Timeout na geração. Tente novamente.', 'warning');
                }
            };
            
            poll();
        } catch (error) {
            console.error('Erro ao fazer polling:', error);
            this.showToast('Erro ao verificar geração', 'error');
        }
    },
    
    displayAIResults(results) {
        const container = document.getElementById('aiResultsList');
        const resultsDiv = document.getElementById('aiResults');
        
        if (!container || !resultsDiv) return;
        
        container.innerHTML = '';
        
        if (Array.isArray(results)) {
            results.forEach((result, index) => {
                const item = document.createElement('div');
                item.className = 'ai-suggestion-item';
                item.textContent = result;
                item.onclick = () => {
                    document.querySelectorAll('.ai-suggestion-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    
                    // Aplicar ao campo apropriado
                    const taskType = document.getElementById('aiTaskType')?.value;
                    if (taskType === 'title_variations') {
                        document.getElementById('pageTitle').value = result;
                    } else if (taskType === 'desc_variations') {
                        document.getElementById('pageDescription').value = result;
                    }
                    
                    this.updateMetaPreview();
                };
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p>Sem resultados</p>';
        }
        
        resultsDiv.style.display = 'block';
    },
    
    // ==========================================
    // MEDIA LIBRARY
    // ==========================================
    async loadMediaLibrary() {
        try {
            const response = await fetch('/api/branding/media-library', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Não autenticado');
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.renderMediaLibrary(result.data);
            }
        } catch (error) {
            console.error('Erro ao carregar media library:', error);
        }
    },
    
    renderMediaLibrary(media) {
        const grid = document.getElementById('mediaLibraryGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        media.forEach(item => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';
            mediaItem.innerHTML = `
                <img src="${item.url}" alt="${item.type || item.usage || 'media'}">
                <div class="media-item-info">
                    <p><strong>${item.type || item.usage || 'Media'}</strong></p>
                    <p class="helper-text">${item.format} - ${item.width}x${item.height}</p>
                    <p><span class="status-badge status-${item.status}">${item.status}</span></p>
                </div>
            `;
            grid.appendChild(mediaItem);
        });
    },
    
    filterMediaLibrary() {
        const filter = document.getElementById('mediaFilter')?.value;
        // Implementar filtro
        this.loadMediaLibrary(); // Re-carregar com filtro
    },
    
    // ==========================================
    // AUDITORIA
    // ==========================================
    async loadAuditLog() {
        try {
            const entityFilter = document.getElementById('auditEntityFilter')?.value || '';
            const url = `/api/branding/audit-log${entityFilter ? `?entity=${entityFilter}` : ''}`;
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Não autenticado');
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.renderAuditLog(result.data);
            }
        } catch (error) {
            console.error('Erro ao carregar audit log:', error);
        }
    },
    
    renderAuditLog(entries) {
        const timeline = document.getElementById('auditTimeline');
        if (!timeline) return;
        
        timeline.innerHTML = '';
        
        entries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'audit-entry';
            
            const date = new Date(entry.created_at).toLocaleString('pt-PT');
            entryDiv.innerHTML = `
                <h4>${entry.action.toUpperCase()} - ${entry.entity}</h4>
                <p class="helper-text">${date}</p>
                ${entry.diff_json ? `<pre style="font-size: var(--font-size-xs); margin-top: var(--spacing-2);">${JSON.stringify(entry.diff_json, null, 2)}</pre>` : ''}
            `;
            
            timeline.appendChild(entryDiv);
        });
    },
    
    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    async saveAll() {
        console.log('💾 Guardar Tudo - Salvando todas as alterações...');
        
        const promises = [];
        
        // Sempre guardar metadados globais
        promises.push(this.saveGlobalMetadata().catch(err => {
            console.error('Erro ao guardar metadados globais:', err);
            return { error: 'Metadados globais', message: err.message };
        }));
        
        // Guardar contexto da plataforma se existir
        const contextObjective = document.getElementById('platformObjective')?.value;
        if (contextObjective) {
            promises.push(this.savePlatformContext().catch(err => {
                console.error('Erro ao guardar contexto:', err);
                return { error: 'Contexto da plataforma', message: err.message };
            }));
        }
        
        // Guardar metadados da página apenas se houver página selecionada
        if (this.currentPageId) {
            promises.push(this.savePageMeta().catch(err => {
                console.error('Erro ao guardar metadados da página:', err);
                return { error: 'Metadados da página', message: err.message };
            }));
        }
        
        const results = await Promise.all(promises);
        const errors = results.filter(r => r && r.error);
        
        if (errors.length > 0) {
            const errorMessages = errors.map(e => `${e.error}: ${e.message}`).join(', ');
            this.showToast(`Algumas alterações não foram guardadas: ${errorMessages}`, 'error');
        } else {
            this.showToast('Todas as alterações guardadas com sucesso!', 'success');
        }
    },
    
    async deleteAsset(assetId) {
        if (!confirm('Tem certeza que deseja eliminar este asset?')) return;
        
        try {
            const response = await fetch(`/api/branding/brand-assets/${assetId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Asset eliminado!', 'success');
                await this.loadBrandAssets();
            } else {
                this.showToast(result.error || 'Erro ao eliminar', 'error');
            }
        } catch (error) {
            console.error('Erro ao eliminar asset:', error);
            this.showToast('Erro ao eliminar asset', 'error');
        }
    },
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '10000';
        toast.style.padding = 'var(--spacing-3) var(--spacing-5)';
        toast.style.borderRadius = 'var(--radius-base)';
        toast.style.color = 'white';
        toast.style.boxShadow = 'var(--shadow-lg)';
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        toast.style.background = colors[type] || colors.info;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Exportar para acesso global
window.BrandingSEO = BrandingSEO;

