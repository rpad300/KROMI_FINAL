/**
 * ==========================================
 * BRANDING & SEO ROUTES - Kromi.online
 * ==========================================
 * 
 * Endpoints REST para gestão de branding e SEO
 * Autenticação via cookies HttpOnly (server-side)
 * 
 * Versão: 1.0
 * Data: 2025-01-XX
 * ==========================================
 */

const multer = require('multer');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp'); // Para processamento de imagens
const pagesScanner = require('./branding-pages-scanner');
const getAIUsageTracker = require('./ai-usage-tracker');

module.exports = function(app, sessionManager) {
    console.log('🎨 Carregando rotas de branding e SEO...');
    
    // Inicializar AI Cost Tracker para rastrear custos de IA
    const aiTracker = getAIUsageTracker();
    
    // Inicializar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
        console.error('❌ NEXT_PUBLIC_SUPABASE_URL não configurado');
        return;
    }
    
    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    if (!supabaseKey) {
        console.error('❌ Nenhuma chave Supabase configurada');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    // Cliente admin para criar buckets (usa service role se disponível)
    const supabaseAdmin = supabaseServiceKey 
        ? createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })
        : supabase; // Fallback para supabase normal se não houver service role
    
    // Middleware: Verificar autenticação e role admin
    function requireAuth(req, res, next) {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado',
                code: 'NO_SESSION'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            res.clearCookie('sid');
            return res.status(401).json({
                success: false,
                error: 'Sessão inválida ou expirada',
                code: 'INVALID_SESSION'
            });
        }
        
        // Verificar role
        const userRole = session.userProfile?.role;
        
        if (!userRole || !['admin', 'superadmin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado. Apenas administradores.',
                code: 'FORBIDDEN',
                requiredRoles: ['admin', 'superadmin'],
                currentRole: userRole
            });
        }
        
        // Adicionar sessão ao request
        req.userSession = session;
        req.userId = session.userId;
        next();
    }
    
    // Configurar multer para upload
    const storage = multer.memoryStorage();
    const upload = multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
        fileFilter: (req, file, cb) => {
            const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/svg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Formato de ficheiro não suportado'), false);
            }
        }
    });
    
    // Função helper: gerar variantes de imagem
    async function generateImageVariants(buffer, originalFormat, targetSizes) {
        const variants = [];
        
        for (const size of targetSizes) {
            try {
                let processed;
                const { width, height, format } = size;
                
                if (format === 'webp') {
                    processed = await sharp(buffer)
                        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .webp({ quality: 85 })
                        .toBuffer();
                } else if (format === 'png') {
                    processed = await sharp(buffer)
                        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .png()
                        .toBuffer();
                } else {
                    continue;
                }
                
                variants.push({
                    buffer: processed,
                    width,
                    height,
                    format
                });
            } catch (error) {
                console.error(`Erro ao gerar variante ${size.width}x${size.height}:`, error);
            }
        }
        
        return variants;
    }
    
    // ==========================================
    // BRAND ASSETS (Logos)
    // ==========================================
    
    // Listar brand assets
    app.get('/api/branding/brand-assets', requireAuth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('site_brand_assets')
                .select('*')
                .is('deleted_at', null)
                .order('type', { ascending: true })
                .order('is_preferred', { ascending: false }) // Preferidos primeiro
                .order('format', { ascending: true })
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Adicionar URLs dos ficheiros
            const assetsWithUrls = await Promise.all((data || []).map(async (asset) => {
                const bucket = asset.type === 'favicon' || asset.type === 'app_icon' 
                    ? 'favicons-and-manifest' 
                    : 'media-originals';
                
                const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(asset.file_path);
                
                return {
                    ...asset,
                    url: urlData?.publicUrl || asset.file_path
                };
            }));
            
            // Agrupar por tipo para facilitar uso no frontend
            const groupedByType = {};
            assetsWithUrls.forEach(asset => {
                if (!groupedByType[asset.type]) {
                    groupedByType[asset.type] = [];
                }
                groupedByType[asset.type].push(asset);
            });
            
            res.json({ 
                success: true, 
                data: assetsWithUrls,
                grouped: groupedByType // Dados agrupados por tipo para facilitar
            });
        } catch (error) {
            console.error('Erro ao listar brand assets:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Upload logo
    app.post('/api/branding/upload-logo', requireAuth, upload.single('file'), async (req, res) => {
        try {
            console.log('📤 Upload de logo iniciado');
            console.log('📋 Request info:', {
                hasFile: !!req.file,
                body: req.body,
                userId: req.userId,
                fileInfo: req.file ? {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                } : null
            });
            
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Ficheiro não fornecido' });
            }
            
            if (!req.userId) {
                console.error('❌ req.userId não definido!');
                return res.status(401).json({ success: false, error: 'Utilizador não autenticado' });
            }
            
            const { type, targetWidth, targetHeight } = req.body;
            if (!type || !['logo_primary', 'logo_primary_horizontal', 'logo_primary_vertical', 
                           'logo_secondary', 'logo_secondary_horizontal', 'logo_secondary_vertical',
                           'favicon', 'app_icon', 'wordmark'].includes(type)) {
                return res.status(400).json({ success: false, error: 'Tipo de logo inválido' });
            }
            
            let file = req.file;
            
            // Se dimensões foram especificadas, redimensionar a imagem antes do upload
            if ((targetWidth || targetHeight) && file.mimetype !== 'image/svg+xml' && file.mimetype !== 'image/svg') {
                try {
                    console.log(`📐 Redimensionando imagem para: ${targetWidth || 'auto'}x${targetHeight || 'auto'}`);
                    let processedBuffer = file.buffer;
                    let sharpInstance = sharp(processedBuffer);
                    
                    // Obter dimensões originais
                    const metadata = await sharpInstance.metadata();
                    const originalWidth = metadata.width;
                    const originalHeight = metadata.height;
                    
                    // Determinar dimensões finais
                    let finalWidth = targetWidth ? parseInt(targetWidth) : null;
                    let finalHeight = targetHeight ? parseInt(targetHeight) : null;
                    
                    // Se apenas uma dimensão foi especificada, calcular a outra mantendo proporção
                    if (finalWidth && !finalHeight) {
                        finalHeight = Math.round((originalHeight / originalWidth) * finalWidth);
                    } else if (!finalWidth && finalHeight) {
                        finalWidth = Math.round((originalWidth / originalHeight) * finalHeight);
                    }
                    
                    // Redimensionar
                    if (finalWidth && finalHeight) {
                        processedBuffer = await sharpInstance
                            .resize(finalWidth, finalHeight, {
                                fit: 'contain',
                                background: { r: 0, g: 0, b: 0, alpha: 0 }
                            })
                            .toBuffer();
                        
                        console.log(`✅ Imagem redimensionada: ${originalWidth}x${originalHeight} -> ${finalWidth}x${finalHeight}`);
                        file.buffer = processedBuffer;
                        file.size = processedBuffer.length;
                    }
                } catch (error) {
                    console.warn('⚠️ Erro ao redimensionar imagem:', error.message);
                    // Continuar com imagem original
                }
            }
            const fileExt = file.originalname.split('.').pop().toLowerCase();
            
            // Normalizar formato para corresponder aos valores permitidos na BD
            let format = fileExt;
            // Manter jpg como jpg (não converter)
            if (!['png', 'svg', 'webp', 'ico', 'jpg'].includes(format)) {
                // Tentar inferir do mimetype
                if (file.mimetype === 'image/svg+xml' || file.mimetype === 'image/svg') format = 'svg';
                else if (file.mimetype === 'image/webp') format = 'webp';
                else if (file.mimetype === 'image/x-icon' || file.mimetype === 'image/vnd.microsoft.icon') format = 'ico';
                else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') format = 'jpg';
                else format = 'png'; // Default
            }
            
            const fileName = `${type}/${Date.now()}.${fileExt}`;
            
            console.log(`📄 Informações do ficheiro:`, {
                originalname: file.originalname,
                mimetype: file.mimetype,
                fileExt,
                format,
                size: file.size
            });
            
            // Determinar bucket
            // Opção 1: Usar bucket KROMI único (se configurado via env)
            // Opção 2: Usar buckets específicos por tipo (padrão)
            const useKromiBucket = process.env.BRANDING_USE_KROMI_BUCKET === 'true' || 
                                   process.env.BRANDING_STORAGE_BUCKET === 'KROMI';
            
            let bucket;
            if (useKromiBucket) {
                // Usar bucket KROMI único para todos os tipos
                bucket = 'KROMI';
            } else if (type === 'favicon' || type === 'app_icon') {
                // Buckets específicos por tipo (padrão)
                bucket = 'favicons-and-manifest';
            } else {
                // Para logos e outros
                bucket = 'media-originals';
            }
            
            // Upload original
            console.log(`📤 Uploadando logo: ${fileName} para bucket ${bucket} (${file.size} bytes)`);
            
            // Usar cliente admin (service role) para upload, que tem mais permissões
            const uploadClient = supabaseAdmin || supabase;
            
            const { data: uploadData, error: uploadError } = await uploadClient
                .storage
                .from(bucket)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });
            
            if (uploadError) {
                console.error('❌ Erro no upload para Supabase Storage:', uploadError);
                
                // Se o erro for bucket não encontrado, dar instruções claras
                if (uploadError.message && (uploadError.message.includes('not found') || uploadError.message.includes('Bucket not found')) || uploadError.statusCode === '404' || uploadError.status === 400) {
                    const errorMessage = `Bucket "${bucket}" não encontrado!\n\n` +
                        `📦 Por favor, crie os buckets necessários no Supabase Dashboard:\n\n` +
                        `1. Ir para: https://supabase.com/dashboard\n` +
                        `2. Selecionar o projeto\n` +
                        `3. Ir para: Storage > New Bucket\n\n` +
                        `Buckets necessários:\n` +
                        `- media-originals (privado, 5MB)\n` +
                        `- media-processed (público, 5MB)\n` +
                        `- favicons-and-manifest (público, 1MB)\n\n` +
                        `📖 Veja instruções detalhadas em: docs/CRIAR-BUCKETS-STORAGE.md`;
                    
                    return res.status(400).json({ 
                        success: false, 
                        error: errorMessage,
                        code: 'BUCKET_NOT_FOUND',
                        requiredBuckets: ['media-originals', 'media-processed', 'favicons-and-manifest']
                    });
                }
                
                throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
            }
            
            console.log(`✅ Upload concluído: ${uploadData.path}`);
            
            // Obter dimensões da imagem
            let width, height;
            try {
                const isSvg = file.mimetype === 'image/svg+xml' || file.mimetype === 'image/svg' || fileExt === 'svg';
                const isIco = file.mimetype === 'image/x-icon' || file.mimetype === 'image/vnd.microsoft.icon' || fileExt === 'ico';
                
                if (!isSvg && !isIco) {
                    try {
                        const metadata = await sharp(file.buffer).metadata();
                        width = metadata.width;
                        height = metadata.height;
                        console.log(`📏 Dimensões detectadas: ${width}x${height}`);
                    } catch (sharpError) {
                        console.warn('⚠️ Erro ao obter dimensões com Sharp:', sharpError.message);
                        // Continuar sem dimensões
                    }
                } else {
                    console.log(`ℹ️ Formato ${isSvg ? 'SVG' : 'ICO'} - dimensões não detectadas`);
                }
            } catch (e) {
                console.warn('⚠️ Não foi possível obter dimensões:', e.message);
            }
            
            // Verificar se já existe um formato preferido para este tipo
            let isPreferred = true; // Por padrão, o primeiro será preferido
            try {
                const { data: existingPreferred, error: checkError } = await supabase
                    .from('site_brand_assets')
                    .select('id, format, is_preferred')
                    .eq('type', type)
                    .eq('is_preferred', true)
                    .is('deleted_at', null)
                    .maybeSingle();
                
                if (checkError) {
                    console.warn('⚠️ Erro ao verificar formato preferido (pode ser coluna não existente):', checkError.message);
                    // Se a coluna não existe, não usar is_preferred
                    isPreferred = false;
                } else {
                    // Se não existe formato preferido, este será o preferido
                    // Se já existe, este não será preferido
                    isPreferred = !existingPreferred;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao verificar formato preferido:', error.message);
                isPreferred = false; // Em caso de erro, não marcar como preferido
            }
            
            // Criar registo na base de dados
            console.log(`💾 Criando registo na base de dados para tipo: ${type}, formato: ${format}, preferido: ${isPreferred}`);
            
            // Construir objeto de inserção, tentando incluir is_preferred se possível
            const insertData = {
                type,
                file_path: uploadData.path,
                format: format, // Usar formato normalizado (png, svg, webp, ico, jpg)
                width: width || null,
                height: height || null,
                status: 'draft',
                created_by: req.userId,
                updated_by: req.userId
            };
            
            // Tentar adicionar is_preferred apenas se não houver erro
            // Se a coluna não existir, a inserção ainda funcionará sem este campo
            try {
                insertData.is_preferred = isPreferred;
            } catch (e) {
                // Ignorar se não conseguir adicionar
            }
            
            console.log('📝 Dados a inserir:', JSON.stringify(insertData, null, 2));
            
            // Tentar inserir com is_preferred primeiro
            let assetData;
            let dbError;
            let insertAttempt = await supabase
                .from('site_brand_assets')
                .insert(insertData)
                .select()
                .single();
            
            assetData = insertAttempt.data;
            dbError = insertAttempt.error;
            
            // Se houver erro relacionado com is_preferred, tentar sem esse campo
            if (dbError && (dbError.message.includes('is_preferred') || dbError.message.includes('column') || dbError.code === '42703')) {
                console.warn('⚠️ Erro com is_preferred, tentando sem este campo:', dbError.message);
                delete insertData.is_preferred;
                
                const retryAttempt = await supabase
                    .from('site_brand_assets')
                    .insert(insertData)
                    .select()
                    .single();
                
                assetData = retryAttempt.data;
                dbError = retryAttempt.error;
            }
            
            if (dbError) {
                console.error('❌ Erro ao inserir na base de dados:', dbError);
                console.error('❌ Detalhes do erro:', JSON.stringify(dbError, null, 2));
                throw new Error(`Erro na base de dados: ${dbError.message || JSON.stringify(dbError)}`);
            }
            
            console.log(`✅ Registo criado: ${assetData.id}`);
            
            // Gerar variantes para logos (apenas para imagens raster, não SVG)
            const isSvgForVariants = file.mimetype === 'image/svg+xml' || file.mimetype === 'image/svg' || fileExt === 'svg';
            if (type.includes('logo') && !isSvgForVariants) {
                try {
                    console.log('🔄 Gerando variantes de logo...');
                    const variants = await generateImageVariants(file.buffer, fileExt, [
                        { width: 512, height: 512, format: 'png' },
                        { width: 256, height: 256, format: 'png' },
                        { width: 512, height: 512, format: 'webp' },
                        { width: 256, height: 256, format: 'webp' }
                    ]);
                    
                    console.log(`✅ ${variants.length} variantes geradas`);
                    
                    // Guardar variantes no bucket media-processed
                    for (const variant of variants) {
                        try {
                            const variantPath = `${type}/variants/${variant.width}x${variant.height}.${variant.format}`;
                            
                            await supabase.storage.from('media-processed').upload(variantPath, variant.buffer, {
                                contentType: `image/${variant.format}`,
                                upsert: true
                            });
                            
                            // Registar variante
                            await supabase.from('media_variants').insert({
                                source_asset_id: assetData.id,
                                source_type: 'brand_asset',
                                variant_key: `${type}_${variant.width}_${variant.format}`,
                                file_path: variantPath,
                                format: variant.format,
                                width: variant.width,
                                height: variant.height,
                                generated_by: 'automatic'
                            });
                        } catch (variantError) {
                            console.warn(`⚠️ Erro ao guardar variante ${variant.width}x${variant.height}:`, variantError.message);
                            // Continuar com outras variantes
                        }
                    }
                } catch (variantGenError) {
                    console.warn('⚠️ Erro ao gerar variantes (continuando sem variantes):', variantGenError.message);
                    // Não bloquear o upload principal se as variantes falharem
                }
            }
            
            res.json({ success: true, data: assetData });
        } catch (error) {
            console.error('❌ Erro ao carregar logo:', error);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Request body:', req.body);
            console.error('❌ File info:', req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : 'Nenhum ficheiro recebido');
            res.status(500).json({ 
                success: false, 
                error: error.message || 'Erro ao carregar logo',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });
    
    // Marcar formato como preferido
    app.post('/api/branding/brand-assets/:id/set-preferred', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            
            // Obter o asset para saber o tipo
            const { data: asset, error: assetError } = await supabase
                .from('site_brand_assets')
                .select('type')
                .eq('id', id)
                .is('deleted_at', null)
                .single();
            
            if (assetError || !asset) {
                return res.status(404).json({ success: false, error: 'Asset não encontrado' });
            }
            
            // Primeiro, desmarcar todos os outros formatos do mesmo tipo
            await supabase
                .from('site_brand_assets')
                .update({ is_preferred: false, updated_by: req.userId })
                .eq('type', asset.type)
                .neq('id', id)
                .is('deleted_at', null);
            
            // Marcar este como preferido
            const { data: updated, error: updateError } = await supabase
                .from('site_brand_assets')
                .update({ is_preferred: true, updated_by: req.userId })
                .eq('id', id)
                .select()
                .single();
            
            if (updateError) throw updateError;
            
            res.json({ success: true, data: updated });
        } catch (error) {
            console.error('Erro ao marcar formato como preferido:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Eliminar brand asset
    app.delete('/api/branding/brand-assets/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            
            // Soft delete
            const { error } = await supabase
                .from('site_brand_assets')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            
            if (error) throw error;
            
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao eliminar asset:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // PAGE REGISTRY
    // ==========================================
    
    // Listar páginas (com sincronização automática)
    app.get('/api/branding/pages', requireAuth, async (req, res) => {
        try {
            // Sincronizar páginas do projeto com o registo
            const allPages = await pagesScanner.syncPagesWithRegistry(supabase);
            
            res.json({ success: true, data: allPages });
        } catch (error) {
            console.error('Erro ao listar páginas:', error);
            
            // Fallback: retornar apenas páginas registadas
            try {
                const { data, error: fallbackError } = await supabase
                    .from('page_registry')
                    .select('*')
                    .is('deleted_at', null)
                    .order('route');
                
                if (fallbackError) throw fallbackError;
                
                res.json({ success: true, data: data || [] });
            } catch (fallbackError) {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    });
    
    // Endpoint para forçar sincronização manual
    app.post('/api/branding/pages/sync', requireAuth, async (req, res) => {
        try {
            const pages = await pagesScanner.syncPagesWithRegistry(supabase);
            res.json({ 
                success: true, 
                data: pages,
                message: `Sincronização completa. ${pages.length} páginas registadas.`
            });
        } catch (error) {
            console.error('Erro ao sincronizar páginas:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Criar página
    app.post('/api/branding/pages', requireAuth, async (req, res) => {
        try {
            const { route, label } = req.body;
            
            if (!route || !label) {
                return res.status(400).json({ success: false, error: 'Route e label são obrigatórios' });
            }
            
            const { data, error } = await supabase
                .from('page_registry')
                .insert({ route, label })
                .select()
                .single();
            
            if (error) throw error;
            
            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao criar página:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // PAGE META
    // ==========================================
    
    // Obter metadados de página
    app.get('/api/branding/page-meta/:pageId', requireAuth, async (req, res) => {
        try {
            const { pageId } = req.params;
            
            const { data, error } = await supabase
                .from('page_meta')
                .select('*, page_registry(*)')
                .eq('page_id', pageId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            
            res.json({ success: true, data: data || null });
        } catch (error) {
            console.error('Erro ao obter page meta:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Guardar/atualizar metadados
    app.post('/api/branding/page-meta', requireAuth, async (req, res) => {
        try {
            const { pageId, title, description, keywords, canonical, robots, deepLink, 
                    ogTitle, ogDescription, ogType, twitterTitle, twitterDescription, twitterCard,
                    facebookTitle, facebookDescription, instagramTitle, instagramDescription,
                    linkedinTitle, linkedinDescription, googleTitle, googleDescription,
                    tiktokTitle, tiktokDescription, whatsappTitle, whatsappDescription,
                    telegramTitle, telegramDescription } = req.body;
            
            if (!pageId) {
                return res.status(400).json({ success: false, error: 'pageId é obrigatório' });
            }
            
            // Verificar se existe
            const { data: existing } = await supabase
                .from('page_meta')
                .select('id')
                .eq('page_id', pageId)
                .is('deleted_at', null)
                .single();
            
            const metaData = {
                page_id: pageId,
                title,
                description,
                keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
                canonical_url: canonical,
                robots_directives: robots || 'index,follow',
                og_title: ogTitle,
                og_description: ogDescription,
                og_type: ogType || 'website',
                og_site_name: 'kromi.online',
                twitter_title: twitterTitle,
                twitter_description: twitterDescription,
                twitter_card: twitterCard || 'summary_large_image',
                facebook_title: facebookTitle || null,
                facebook_description: facebookDescription || null,
                instagram_title: instagramTitle || null,
                instagram_description: instagramDescription || null,
                linkedin_title: linkedinTitle || null,
                linkedin_description: linkedinDescription || null,
                google_title: googleTitle || null,
                google_description: googleDescription || null,
                tiktok_title: tiktokTitle || null,
                tiktok_description: tiktokDescription || null,
                whatsapp_title: whatsappTitle || null,
                whatsapp_description: whatsappDescription || null,
                telegram_title: telegramTitle || null,
                telegram_description: telegramDescription || null,
                updated_by: req.userId
            };
            
            let result;
            if (existing) {
                // Atualizar
                const { data, error } = await supabase
                    .from('page_meta')
                    .update(metaData)
                    .eq('id', existing.id)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            } else {
                // Criar
                metaData.created_by = req.userId;
                const { data, error } = await supabase
                    .from('page_meta')
                    .insert(metaData)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            }
            
            // Log para debug
            console.log('💾 Metadados guardados:', {
                pageId,
                metaId: result.id,
                platformFields: {
                    facebook: { title: facebookTitle, desc: facebookDescription },
                    instagram: { title: instagramTitle, desc: instagramDescription },
                    linkedin: { title: linkedinTitle, desc: linkedinDescription },
                    twitter: { title: twitterTitle, desc: twitterDescription },
                    google: { title: googleTitle, desc: googleDescription },
                    tiktok: { title: tiktokTitle, desc: tiktokDescription },
                    whatsapp: { title: whatsappTitle, desc: whatsappDescription },
                    telegram: { title: telegramTitle, desc: telegramDescription }
                }
            });
            
            // Atualizar deep_link na page_registry se fornecido
            if (deepLink) {
                await supabase
                    .from('page_registry')
                    .update({ deep_link: deepLink })
                    .eq('id', pageId);
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Erro ao guardar page meta:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Publicar metadados
    app.post('/api/branding/publish-page-meta/:pageId', requireAuth, async (req, res) => {
        try {
            const { pageId } = req.params;
            
            // Buscar meta_id da página
            const { data: metaData, error: metaError } = await supabase
                .from('page_meta')
                .select('id')
                .eq('page_id', pageId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (metaError) {
                return res.status(404).json({ success: false, error: 'Metadados não encontrados para esta página' });
            }
            
            // Atualizar status diretamente (mais simples que RPC)
            const { error } = await supabase
                .from('page_meta')
                .update({ 
                    status: 'published',
                    updated_by: req.userId
                })
                .eq('id', metaData.id);
            
            if (error) throw error;
            
            // Registrar no audit log
            await supabase.from('branding_audit_log').insert({
                entity: 'page_meta',
                entity_id: metaData.id,
                action: 'publish',
                actor_id: req.userId
            });
            
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao publicar page meta:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // THUMBNAILS
    // ==========================================
    
    // Listar thumbnails de página
    app.get('/api/branding/thumbnails/:pageId', requireAuth, async (req, res) => {
        try {
            const { pageId } = req.params;
            
            const { data, error } = await supabase
                .from('page_thumbnails')
                .select('*')
                .eq('page_id', pageId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Adicionar URLs
            const thumbsWithUrls = data.map(thumb => {
                const { data: urlData } = supabase.storage.from('media-originals').getPublicUrl(thumb.file_path);
                return {
                    ...thumb,
                    url: urlData?.publicUrl || thumb.file_path
                };
            });
            
            res.json({ success: true, data: thumbsWithUrls });
        } catch (error) {
            console.error('Erro ao listar thumbnails:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Upload thumbnail
    app.post('/api/branding/upload-thumbnail', requireAuth, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Ficheiro não fornecido' });
            }
            
            const { pageId, usage, altText } = req.body;
            
            if (!pageId || !usage || !altText) {
                return res.status(400).json({ success: false, error: 'pageId, usage e altText são obrigatórios' });
            }
            
            const file = req.file;
            const fileExt = file.originalname.split('.').pop().toLowerCase();
            const fileName = `thumbnails/${pageId}/${usage}/${Date.now()}.${fileExt}`;
            
            // Upload
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('media-originals')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });
            
            if (uploadError) throw uploadError;
            
            // Obter dimensões
            const metadata = await sharp(file.buffer).metadata();
            
            // Criar registo
            const { data: thumbData, error: dbError } = await supabase
                .from('page_thumbnails')
                .insert({
                    page_id: pageId,
                    usage,
                    file_path: uploadData.path,
                    format: fileExt,
                    width: metadata.width,
                    height: metadata.height,
                    alt_text: altText,
                    status: 'draft',
                    created_by: req.userId,
                    updated_by: req.userId
                })
                .select()
                .single();
            
            if (dbError) throw dbError;
            
            // Gerar variantes WebP otimizadas para todas as plataformas com dimensões específicas
            const targetSizes = {
                'facebook_image': { width: 1200, height: 630 },
                'og_image': { width: 1200, height: 630 },
                'instagram_image': { width: 1080, height: 1080 },
                'linkedin_image': { width: 1200, height: 627 },
                'twitter_image': { width: 1200, height: 675 },
                'google_image': { width: 1200, height: 675 },
                'tiktok_image': { width: 1080, height: 1920 },
                'whatsapp_image': { width: 1200, height: 630 },
                'telegram_image': { width: 1200, height: 630 }
            };
            
            const targetSize = targetSizes[usage];
            if (targetSize) {
                try {
                    const variant = await sharp(file.buffer)
                        .resize(targetSize.width, targetSize.height, { fit: 'cover' })
                        .webp({ quality: 85 })
                        .toBuffer();
                    
                    const variantPath = `thumbnails/${pageId}/${usage}/variant.webp`;
                    await supabase.storage.from('media-processed').upload(variantPath, variant, {
                        contentType: 'image/webp',
                        upsert: true
                    });
                    console.log(`✅ Variante WebP gerada para ${usage}: ${targetSize.width}x${targetSize.height}`);
                } catch (variantError) {
                    console.warn(`⚠️ Erro ao gerar variante para ${usage}:`, variantError.message);
                    // Continuar mesmo se falhar a variante
                }
            }
            
            res.json({ success: true, data: thumbData });
        } catch (error) {
            console.error('Erro ao carregar thumbnail:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Publicar thumbnails
    app.post('/api/branding/publish-thumbnails/:pageId', requireAuth, async (req, res) => {
        try {
            const { pageId } = req.params;
            
            const { error } = await supabase
                .from('page_thumbnails')
                .update({ status: 'published' })
                .eq('page_id', pageId);
            
            if (error) throw error;
            
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao publicar thumbnails:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // GERAÇÃO DE ALT TEXT COM IA
    // ==========================================
    
    // Gerar Alt Text para imagem usando Gemini Vision
    app.post('/api/branding/generate-alt-text', requireAuth, async (req, res) => {
        try {
            const { imageBase64, imageType, usage, pageId } = req.body;
            
            if (!imageBase64) {
                return res.status(400).json({ success: false, error: 'Imagem não fornecida' });
            }
            
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!geminiKey) {
                return res.status(500).json({ success: false, error: 'GEMINI_API_KEY não configurada' });
            }
            
            // Extrair base64 puro (remover data:image/...;base64,)
            const base64Data = imageBase64.includes(',') 
                ? imageBase64.split(',')[1] 
                : imageBase64;
            
            // Obter contexto da página se disponível
            let pageContext = '';
            if (pageId) {
                try {
                    const { data: pageData } = await supabase
                        .from('page_registry')
                        .select('route, label')
                        .eq('id', pageId)
                        .single();
                    
                    if (pageData) {
                        pageContext = `Esta imagem é para a página "${pageData.label}" (${pageData.route})`;
                    }
                } catch (e) {
                    console.warn('Erro ao buscar contexto da página:', e.message);
                }
            }
            
            // Mapeamento de usage para contexto da plataforma
            const platformContext = {
                'facebook_image': 'Facebook/Open Graph - público geral, compartilhamento social',
                'instagram_image': 'Instagram - público jovem, foco visual e estético',
                'linkedin_image': 'LinkedIn - público profissional, contexto empresarial',
                'twitter_image': 'Twitter - público informado, contexto de notícias e trending',
                'google_image': 'Google Search - contexto de busca, SEO',
                'tiktok_image': 'TikTok - público Gen Z, contexto de entretenimento',
                'whatsapp_image': 'WhatsApp - compartilhamento pessoal/informal',
                'telegram_image': 'Telegram - público tech-savvy, contexto tecnológico',
                'og_image': 'Open Graph - padrão para redes sociais'
            };
            
            const platformInfo = platformContext[usage] || 'rede social';
            
            // Buscar contexto publicado da plataforma
            let platformGlobalContext = '';
            try {
                const { data: contextData } = await supabase
                    .from('platform_context')
                    .select('platform_objective, platform_description, target_audience')
                    .eq('platform_name', 'kromi.online')
                    .eq('status', 'published')
                    .is('deleted_at', null)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (contextData) {
                    platformGlobalContext = `

CONTEXTO DA PLATAFORMA:
- Objetivo: ${contextData.platform_objective || 'Não definido'}
- Descrição: ${contextData.platform_description || 'Não definido'}
- Público-Alvo: ${contextData.target_audience || 'Não definido'}`;
                }
            } catch (e) {
                console.warn('Erro ao buscar contexto global:', e.message);
            }
            
            // Construir prompt para Gemini
            const prompt = `Gera um texto alternativo (alt text) em português para esta imagem que será usada em ${platformInfo}.

REGRAS IMPORTANTES:
- Alt text deve ter entre 75 a 125 caracteres
- Deve ser descritivo, preciso e acessível
- Não inclui palavras como "imagem de", "foto de", "imagem mostra"
- Foca no conteúdo, função e contexto da imagem
- Usa português pt-PT
- Adapta o tom ao contexto: ${platformInfo}
${pageContext ? `- Contexto da página: ${pageContext}` : ''}
${platformGlobalContext}

O alt text deve ajudar utilizadores com deficiência visual a entender o conteúdo e contexto da imagem, enquanto também melhora SEO.

Responde APENAS com o alt text, sem explicações, sem aspas, sem markdown. Apenas o texto.`;
            
            // Usar Gemini Vision API
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(geminiKey);
            
            // Tentar modelos em ordem
            const modelsToTry = [
                'gemini-2.0-flash-exp',
                'gemini-1.5-pro',
                'gemini-1.5-flash-latest',
                'gemini-pro'
            ];
            
            let altText = null;
            let lastError = null;
            
            for (const modelName of modelsToTry) {
                try {
                    console.log(`🎯 Gerando alt text com modelo: ${modelName}`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const startTime = Date.now();
                    
                    // Gemini Vision requer formato específico
                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: imageType || 'image/jpeg'
                            }
                        }
                    ]);
                    
                    const response = await result.response;
                    const duration = Date.now() - startTime;
                    altText = response.text().trim();
                    
                    // Rastrear custo (Administração)
                    try {
                        const usage = response.usageMetadata || {};
                        await aiTracker.trackGeminiCall({
                            model: modelName,
                            inputTokens: usage.promptTokenCount || 1000,
                            outputTokens: usage.candidatesTokenCount || 100,
                            eventId: null,
                            duration,
                            timestamp: new Date()
                        });
                    } catch (trackError) {
                        console.error('❌ Erro ao rastrear custo alt text:', trackError.message);
                    }
                    
                    // Limpar possíveis aspas ou markdown que o modelo possa adicionar
                    altText = altText.replace(/^["']|["']$/g, '').trim();
                    altText = altText.replace(/^\*\*|\*\*$/g, '').trim();
                    
                    console.log(`✅ Alt text gerado: "${altText}"`);
                    break;
                } catch (modelError) {
                    lastError = modelError;
                    console.warn(`⚠️ Modelo ${modelName} falhou:`, modelError.message);
                    continue;
                }
            }
            
            if (!altText) {
                throw new Error(`Todos os modelos falharam. Último erro: ${lastError?.message || 'Desconhecido'}`);
            }
            
            res.json({ success: true, altText });
            
        } catch (error) {
            console.error('Erro ao gerar alt text:', error);
            res.status(500).json({ 
                success: false, 
                error: `Erro ao gerar alt text: ${error.message}` 
            });
        }
    });
    
    // ==========================================
    // CONTEXTO DA PLATAFORMA
    // ==========================================
    
    // Obter contexto da plataforma
    app.get('/api/branding/platform-context', requireAuth, async (req, res) => {
        try {
            // Buscar contexto publicado ou draft
            const { data, error } = await supabase
                .from('platform_context')
                .select('*')
                .eq('platform_name', 'kromi.online')
                .is('deleted_at', null)
                .order('status', { ascending: false }) // published primeiro
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (error) {
                console.error('Erro ao buscar contexto:', error);
                throw error;
            }
            
            if (!data) {
                // Não encontrado - retornar 404 mas com estrutura correta
                return res.status(404).json({ success: false, error: 'Contexto não encontrado' });
            }
            
            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao buscar contexto:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Guardar/atualizar contexto da plataforma
    app.post('/api/branding/platform-context', requireAuth, async (req, res) => {
        try {
            const { platformObjective, platformDescription, targetAudience, keyFeatures, 
                    brandVoice, brandPersonality, industrySector, useCases } = req.body;
            
            // Verificar se existe
            const { data: existing, error: checkError } = await supabase
                .from('platform_context')
                .select('id')
                .eq('platform_name', 'kromi.online')
                .is('deleted_at', null)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }
            
            const contextData = {
                platform_name: 'kromi.online',
                platform_objective: platformObjective || null,
                platform_description: platformDescription || null,
                target_audience: targetAudience || null,
                key_features: Array.isArray(keyFeatures) ? keyFeatures : (keyFeatures || []),
                brand_voice: brandVoice || null,
                brand_personality: brandPersonality || null,
                industry_sector: industrySector || null,
                use_cases: Array.isArray(useCases) ? useCases : (useCases || []),
                updated_by: req.userId
            };
            
            let result;
            if (existing && existing.id) {
                // Atualizar
                const { data, error } = await supabase
                    .from('platform_context')
                    .update(contextData)
                    .eq('id', existing.id)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
                console.log('✅ Contexto atualizado:', result.id);
            } else {
                // Criar
                contextData.created_by = req.userId;
                contextData.status = 'draft'; // Por defeito é draft
                const { data, error } = await supabase
                    .from('platform_context')
                    .insert(contextData)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
                console.log('✅ Contexto criado:', result.id);
            }
            
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Erro ao guardar contexto:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Publicar contexto da plataforma
    app.post('/api/branding/platform-context/publish', requireAuth, async (req, res) => {
        try {
            const { data: existing, error: checkError } = await supabase
                .from('platform_context')
                .select('id, status')
                .eq('platform_name', 'kromi.online')
                .is('deleted_at', null)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }
            
            if (!existing || !existing.id) {
                return res.status(404).json({ success: false, error: 'Contexto não encontrado. Guarde primeiro.' });
            }
            
            const { data, error } = await supabase
                .from('platform_context')
                .update({ 
                    status: 'published',
                    updated_by: req.userId
                })
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            
            // Log no audit
            await supabase.from('branding_audit_log').insert({
                entity: 'platform_context',
                entity_id: existing.id,
                action: existing.status === 'published' ? 'update' : 'publish',
                actor_id: req.userId
            });
            
            console.log('✅ Contexto publicado:', data.id);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao publicar contexto:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // GERAÇÃO COM IA
    // ==========================================
    
    // Gerar metadados completos com IA (Gemini)
    app.post('/api/branding/generate-full-metadata/:pageId', requireAuth, async (req, res) => {
        try {
            const { pageId } = req.params;
            
            if (!pageId) {
                return res.status(400).json({ success: false, error: 'pageId é obrigatório' });
            }
            
            // Buscar informações da página
            const { data: pageData, error: pageError } = await supabase
                .from('page_registry')
                .select('route, label')
                .eq('id', pageId)
                .single();
            
            if (pageError || !pageData) {
                return res.status(404).json({ success: false, error: 'Página não encontrada' });
            }
            
            // Obter API key do Gemini
            const geminiKey = process.env.GEMINI_API_KEY;
            
            if (!geminiKey) {
                return res.status(500).json({ success: false, error: 'Gemini API key não configurada' });
            }
            
            // Ler conteúdo do ficheiro HTML
            const fs = require('fs');
            const path = require('path');
            let htmlContent = '';
            
            try {
                // Determinar caminho do ficheiro baseado na rota
                let filePath;
                if (pageData.route === '/') {
                    filePath = path.join(__dirname, 'src', 'index-kromi.html');
                } else if (pageData.route.startsWith('/') && pageData.route.endsWith('.html')) {
                    // Rota já tem .html
                    filePath = path.join(__dirname, 'src', pageData.route.replace(/^\//, ''));
                } else if (pageData.route.startsWith('/')) {
                    // Rota sem .html, tentar adicionar
                    filePath = path.join(__dirname, 'src', pageData.route.replace(/^\//, '') + '.html');
                } else {
                    filePath = path.join(__dirname, 'src', pageData.route);
                }
                
                // Verificar se ficheiro existe
                if (fs.existsSync(filePath)) {
                    htmlContent = fs.readFileSync(filePath, 'utf8');
                    console.log(`📄 HTML lido COMPLETO (sem limpeza): ${(htmlContent.length / 1024).toFixed(2)} KB do ficheiro ${filePath}`);
                    
                    // NÃO limpar HTML - enviar tudo como está (scripts, estilos, comentários, etc.)
                    // O Gemini pode processar HTML completo e extrair informações de todo o conteúdo
                    // Manter apenas trim() para remover espaços no início/fim se necessário
                    htmlContent = htmlContent.trim();
                    
                    // Limitar tamanho baseado nos limites do Gemini
                    // Gemini 1.5/2.0/2.5: até 1 milhão de tokens (≈4MB de texto)
                    // Para ser conservador e deixar espaço para o prompt, usamos 2MB de HTML
                    // Isso dá cerca de 500k tokens de HTML + espaço para o prompt
                    const MAX_HTML_SIZE = 2000000; // 2MB = ~500k tokens (deixa espaço para prompt de ~500k tokens)
                    
                    if (htmlContent.length > MAX_HTML_SIZE) {
                        const truncatedLength = htmlContent.length;
                        htmlContent = htmlContent.substring(0, MAX_HTML_SIZE);
                        console.log(`✂️ HTML truncado: ${truncatedLength.toLocaleString()} → ${htmlContent.length.toLocaleString()} caracteres (primeiros ${(MAX_HTML_SIZE/1024).toFixed(0)}KB devido ao limite do Gemini)`);
                        htmlContent += '\n... (conteúdo truncado para manter dentro do limite de tokens do Gemini)';
                    }
                    
                    if (htmlContent.length <= MAX_HTML_SIZE) {
                        console.log(`✅ HTML completo preparado para envio (sem limpeza): ${(htmlContent.length / 1024).toFixed(2)} KB`);
                    }
                } else {
                    console.warn(`⚠️ Ficheiro HTML não encontrado: ${filePath}`);
                    // Continuar sem HTML se ficheiro não existir
                }
            } catch (fileError) {
                console.warn('Erro ao ler ficheiro HTML:', fileError.message);
                // Continuar sem HTML se houver erro
            }
            
            // Buscar contexto publicado da plataforma
            let platformContext = '';
            try {
                const { data: contextData, error: contextError } = await supabase
                    .from('platform_context')
                    .select('*')
                    .eq('platform_name', 'kromi.online')
                    .eq('status', 'published')
                    .is('deleted_at', null)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (contextError) {
                    console.warn('⚠️ Erro ao buscar contexto da plataforma:', contextError.message);
                }
                
                if (contextData) {
                    console.log('✅ Contexto da plataforma encontrado e incluído no prompt do Gemini');
                    platformContext = `

CONTEXTO DA PLATAFORMA (usa esta informação para adaptar todos os metadados):
- Objetivo: ${contextData.platform_objective || 'Não definido'}
- Descrição: ${contextData.platform_description || 'Não definido'}
- Público-Alvo: ${contextData.target_audience || 'Não definido'}
- Características Principais: ${Array.isArray(contextData.key_features) ? contextData.key_features.join(', ') : (contextData.key_features || 'Não definido')}
- Tom/Voz da Marca: ${contextData.brand_voice || 'Não definido'}
- Personalidade da Marca: ${contextData.brand_personality || 'Não definido'}
- Setor/Indústria: ${contextData.industry_sector || 'Não definido'}
- Casos de Uso: ${Array.isArray(contextData.use_cases) ? contextData.use_cases.join(', ') : (contextData.use_cases || 'Não definido')}

IMPORTANTE: Considera este contexto ao gerar todos os metadados. Adapta os textos para refletir o objetivo, público-alvo, tom e personalidade da plataforma. Usa o contexto para criar mensagens mais precisas e alinhadas com a identidade da marca em cada plataforma social.`;
                } else {
                    console.log('ℹ️ Nenhum contexto publicado encontrado - gerando metadados sem contexto específico da plataforma');
                }
            } catch (contextError) {
                console.warn('⚠️ Erro ao buscar contexto da plataforma:', contextError.message);
                // Continuar sem contexto se não estiver disponível
            }
            
            // Construir prompt profissional para Gemini
            let prompt = `Prompt para geração de metadados SEO em JSON, com qualidade de marketing

Objetivo
Gerar um único objeto JSON válido, em português, com metadados SEO e social, totalmente coerentes com o HTML fornecido. O foco é precisão, relevância e limites de caracteres.

Entrada
INFORMAÇÕES DA PÁGINA:
- Rota: ${pageData.route}
- Nome/Label: ${pageData.label}
${platformContext}

[COLE AQUI O CONTEÚDO HTML COMPLETO DA PÁGINA]
${htmlContent ? `\`\`\`html\n${htmlContent}\n\`\`\`` : '(Conteúdo HTML não disponível - usar apenas rota e label)'}

Instruções de qualidade

Analisa o HTML e identifica, de forma factual, o tema principal, intenção da página, público e proposta de valor.

Usa apenas informação presente no HTML. Não inventes atributos, números, benefícios ou ofertas.

Segue os limites de caracteres. Se necessário, reescreve e reduz.

Português pt-PT, tom profissional, claro e orientado a ação.

Evita duplicação entre title, description e OG/Twitter. Cada campo deve acrescentar.

Inclui palavras-chave reais do HTML. Prioriza termos com evidência de foco semântico, headings, âncoras e texto próximo de CTAs.

Mantém coerência de marca. Usa "kromi.online" como og_site_name.

Não inclui blocos de código nem qualquer texto fora do JSON.

Regras de conteúdo
• Title: 50 a 60 caracteres. Focado em benefício e intenção de pesquisa. Sem ponto final.
• Description: 140 a 160 caracteres. Benefício claro, diferenciação e CTA curto.
• Keywords: 6 a 10 termos, ordem por relevância, todos existentes no HTML, minúsculas, sem repetições, sem stopwords.
• Canonical: usa domínio https://kromi.online e infere a rota a partir de <link rel="canonical">, <meta property="og:url"> ou URL internas. Se não houver, usa a rota mais curta plausível com base no HTML.
• Robots: "index,follow", exceto se o HTML indicar página vazia, filtrada, privada ou duplicada. Nesses casos usa "noindex,nofollow".
• OG e Redes Sociais: Gera conteúdo ÚNICO e ADAPTADO para cada plataforma, respeitando limites mas criando mensagens diferentes conforme o público e características de cada rede:

  - Facebook (og_title, og_description): Tom profissional mas amigável, foco em comunidade e relacionamentos. Público: 25-65 anos, mix pessoal/profissional.
  
  - Instagram (instagram_title, instagram_description): Tom inspirador e visual, uso de hashtags implícitas, foco em estética e estilo de vida. Público: 18-34 anos, criativo, focado em imagem.
  
  - LinkedIn (linkedin_title, linkedin_description): Tom profissional e empresarial, foco em valor profissional, networking e carreira. Público: 25-55 anos, executivos e profissionais.
  
  - Twitter (twitter_title, twitter_description): Tom direto, conciso e urgente, pode usar emojis, foco em trending e notícias. Público: 18-49 anos, informado e engajado.
  
  - Google (google_title, google_description): Tom neutro e informativo, foco em palavras-chave relevantes e intenção de busca. Público: Todos, contexto de pesquisa.
  
  - TikTok (tiktok_title, tiktok_description): Tom jovem, dinâmico e casual, uso de linguagem atual, foco em entretenimento e tendências. Público: 16-24 anos, Gen Z, nativos digitais.
  
  - WhatsApp (whatsapp_title, whatsapp_description): Tom pessoal e conversacional, mensagem clara e direta para partilha entre contactos. Público: Todos os grupos etários, comunicação pessoal/profissional informal.
  
  - Telegram (telegram_title, telegram_description): Tom tecnológico e informativo, foco em privacidade e funcionalidade, público tech-savvy. Público: 18-45 anos, interessados em tecnologia e privacidade.

IMPORTANTE: Cada plataforma deve ter uma versão ÚNICA do título e descrição, adaptada ao seu público e características. Não uses o mesmo texto para todas.
• Structured data: usa Schema.org adequado ao tipo de página identificado no HTML.

Event: inclui pelo menos name, description, startDate, endDate, location.name, addressLocality, url.

Product: inclui name, description, sku se houver, brand se houver, offers.price e offers.priceCurrency se houver.

Article ou WebPage: mantém name e description, e inclui headline quando fizer sentido.

Só adiciona propriedades que existam no HTML.
• Normalização: remove espaços duplos, aspas tortas, emojis e UTM da canonical. Escapa aspas dentro de strings.

Validação antes de responder
• Confirma contagem de caracteres de TODOS os campos de título e descrição:
  - title, description (padrão)
  - og_title, og_description (Open Graph)
  - facebook_title, facebook_description (se diferentes de OG)
  - instagram_title, instagram_description (se diferentes de OG)
  - linkedin_title, linkedin_description (se diferentes de OG)
  - twitter_title, twitter_description (Twitter)
  - google_title, google_description (se diferentes do padrão)
  - tiktok_title, tiktok_description (se diferentes de OG)
  - whatsapp_title, whatsapp_description (se diferentes de OG)
  - telegram_title, telegram_description (se diferentes de OG)
• Garante JSON estrito, com aspas duplas, sem vírgulas finais e sem quebras de formato.
• Se faltar informação essencial, prioriza clareza e veracidade, mantendo limites e sem inventar.
• Para campos de plataformas sociais (Facebook, Instagram, LinkedIn, Twitter, Google, TikTok, WhatsApp, Telegram), deves SEMPRE gerar conteúdo ÚNICO e ADAPTADO para cada uma. Cada plataforma tem público, tom e contexto diferentes - aproveita essas diferenças para criar mensagens mais efetivas.

Esquema e output obrigatório
Responde apenas com um único JSON válido, com TODAS estas chaves preenchidas com conteúdo ÚNICO para cada plataforma:

IMPORTANTE: 
• Deves SEMPRE incluir TODAS as chaves abaixo preenchidas.
• Cada plataforma (Facebook, Instagram, LinkedIn, Twitter, Google, TikTok, WhatsApp, Telegram) deve ter título e descrição ÚNICOS e ADAPTADOS ao seu público e estilo.
• NÃO uses o mesmo texto para todas as plataformas - adapta conforme as características descritas acima.
• Se uma plataforma precisa de tom mais formal, usa tom formal. Se precisa de tom mais casual, usa tom casual.
• Considera o contexto: LinkedIn = profissional, TikTok = jovem e dinâmico, WhatsApp = pessoal, etc.

{
  "title": "... 50-60 caracteres ...",
  "description": "... 140-160 caracteres com CTA ...",
  "keywords": ["termo1", "termo2", "termo3", "termo4", "termo5", "termo6"],
  "robots_directives": "index,follow",
  "canonical_url": "https://kromi.online${pageData.route}",
  "og_title": "... 55-60 caracteres ...",
  "og_description": "... 155-160 caracteres ...",
  "og_type": "website",
  "og_site_name": "kromi.online",
  "twitter_title": "... 55-60 caracteres - TOM DIRETO E CONCISO, pode usar emojis, foco em trending ...",
  "twitter_description": "... 155-160 caracteres - Descrição adaptada ao público Twitter (18-49 anos, informado, engajado, contexto de notícias) ...",
  "twitter_card": "summary_large_image",
  "facebook_title": "... 55-60 caracteres - TOM PROFISSIONAL AMIGÁVEL, foco em comunidade ...",
  "facebook_description": "... 155-160 caracteres - Descrição adaptada ao público Facebook (25-65 anos, mix pessoal/profissional) ...",
  "instagram_title": "... 55-60 caracteres - TOM INSPIRADOR E VISUAL, pode sugerir hashtags ...",
  "instagram_description": "... 155-160 caracteres - Descrição adaptada ao público Instagram (18-34 anos, criativo, focado em estética) ...",
  "linkedin_title": "... 55-60 caracteres - TOM PROFISSIONAL E EMPRESARIAL, valor para carreira ...",
  "linkedin_description": "... 155-160 caracteres - Descrição adaptada ao público LinkedIn (25-55 anos, executivos, foco em networking) ...",
  "google_title": "... 50-60 caracteres - TOM NEUTRO E INFORMATIVO, otimizado para busca ...",
  "google_description": "... 140-160 caracteres - Descrição otimizada para resultados de pesquisa (público geral, contexto de busca) ...",
  "tiktok_title": "... 55-60 caracteres - TOM JOVEM E DINÂMICO, linguagem atual e tendências ...",
  "tiktok_description": "... 155-160 caracteres - Descrição adaptada ao público TikTok (16-24 anos, Gen Z, entretenimento) ...",
  "whatsapp_title": "... 55-60 caracteres - TOM PESSOAL E CONVERSACIONAL, mensagem clara para partilha ...",
  "whatsapp_description": "... 155-160 caracteres - Descrição adaptada para WhatsApp (público geral, comunicação pessoal/informal) ...",
  "telegram_title": "... 55-60 caracteres - TOM TECNOLÓGICO E INFORMATIVO, foco em funcionalidade ...",
  "telegram_description": "... 155-160 caracteres - Descrição adaptada ao público Telegram (18-45 anos, tech-savvy, privacidade) ...",
  "structured_data_json": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${pageData.label}",
    "description": "Descrição baseada no conteúdo",
    "url": "https://kromi.online${pageData.route}"
  }
}

Notas finais
• Não incluas exemplos, explicações ou markdown.
• A resposta tem de ser apenas o JSON, pronto a colar.
• TODAS as chaves devem estar presentes no JSON, todas PREENCHIDAS (não vazias).
• Cada plataforma DEVE ter conteúdo ÚNICO adaptado ao seu público e características.
• Usa a informação do HTML para entender o tema e adapta o tom conforme a plataforma:
  * LinkedIn: formal, profissional, valor empresarial
  * Facebook: amigável, comunitário, acessível
  * Instagram: inspirador, visual, estético
  * Twitter: direto, atual, envolvido
  * TikTok: jovem, dinâmico, tendências
  * WhatsApp: pessoal, conversacional, claro
  * Telegram: tecnológico, informativo, funcional
  * Google: neutro, otimizado para busca, informativo`;

            try {
                // Usar Gemini API com modelo mais robusto (Gemini 2.5)
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(geminiKey);
                
                // Tentar modelos em ordem de preferência (mais recente primeiro)
                const modelsToTry = [
                    'gemini-2.5-flash-exp',
                    'gemini-2.0-flash-exp',
                    'gemini-1.5-pro',
                    'gemini-1.5-flash-latest',
                    'gemini-pro'
                ];
                
                let result, text;
                let lastError;
                
                // Log do tamanho do prompt antes de enviar
                console.log(`📤 Prompt completo: ${(prompt.length / 1024).toFixed(2)} KB`);
                if (htmlContent) {
                    console.log(`   - HTML incluído: ${(htmlContent.length / 1024).toFixed(2)} KB`);
                }
                
                for (const modelName of modelsToTry) {
                    try {
                        console.log(`🎯 Tentando modelo Gemini: ${modelName}`);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const startTime = Date.now();
                        result = await model.generateContent(prompt);
                        const response = await result.response;
                        const duration = Date.now() - startTime;
                        text = response.text();
                        console.log(`✅ Sucesso com modelo: ${modelName}`);
                        
                        // Rastrear custo da chamada de IA (Administração - sem event_id)
                        try {
                            const usage = response.usageMetadata || {};
                            await aiTracker.trackGeminiCall({
                                model: modelName,
                                inputTokens: usage.promptTokenCount || Math.ceil(prompt.length / 4),
                                outputTokens: usage.candidatesTokenCount || Math.ceil(text.length / 4),
                                eventId: null,  // NULL = Administração
                                duration,
                                timestamp: new Date()
                            });
                        } catch (trackError) {
                            console.error('❌ Erro ao rastrear custo:', trackError.message);
                        }
                        
                        break; // Sucesso, sair do loop
                    } catch (modelError) {
                        lastError = modelError;
                        console.warn(`⚠️ Modelo ${modelName} falhou:`, modelError.message);
                        continue; // Tentar próximo modelo
                    }
                }
                
                if (!text) {
                    throw new Error(`Todos os modelos falharam. Último erro: ${lastError?.message || 'Desconhecido'}`);
                }
                
                // Extrair JSON da resposta (pode vir com markdown ou texto extra)
                let jsonText = text.trim();
                
                // Remover markdown code blocks se existirem (json, html, etc)
                jsonText = jsonText.replace(/```json\n?/gi, '')
                    .replace(/```html\n?/gi, '')
                    .replace(/```\n?/g, '')
                    .trim();
                
                // Remover texto antes/depois do JSON se houver
                // Tentar encontrar JSON no texto (procura o primeiro { até o último })
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }
                
                // Limpar possíveis caracteres extras
                jsonText = jsonText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
                
                // Parse JSON
                let metadata;
                try {
                    metadata = JSON.parse(jsonText);
                } catch (parseError) {
                    console.error('Erro ao fazer parse do JSON do Gemini:', parseError);
                    console.error('Texto recebido:', jsonText);
                    throw new Error('Formato de resposta inválido do Gemini. Tente novamente.');
                }
                
                // Validar campos obrigatórios
                if (!metadata.title || !metadata.description) {
                    throw new Error('Resposta do Gemini incompleta');
                }
                
                // Garantir que todos os campos opcionais existem (mesmo que vazios)
                // Se o Gemini omitir alguns campos, adicionamos como vazios
                const requiredFields = [
                    'title', 'description', 'keywords', 'robots_directives', 'canonical_url',
                    'og_title', 'og_description', 'og_type', 'og_site_name',
                    'twitter_title', 'twitter_description', 'twitter_card',
                    'facebook_title', 'facebook_description',
                    'instagram_title', 'instagram_description',
                    'linkedin_title', 'linkedin_description',
                    'google_title', 'google_description',
                    'tiktok_title', 'tiktok_description',
                    'whatsapp_title', 'whatsapp_description',
                    'telegram_title', 'telegram_description',
                    'structured_data_json'
                ];
                
                // Adicionar campos faltantes como vazios/null
                requiredFields.forEach(field => {
                    if (!(field in metadata)) {
                        if (field === 'keywords') {
                            metadata[field] = [];
                        } else if (field === 'structured_data_json') {
                            metadata[field] = null;
                        } else {
                            metadata[field] = '';
                        }
                    }
                });
                
                // Retornar metadados gerados
                res.json({ success: true, data: metadata });
                
            } catch (geminiError) {
                console.error('Erro ao gerar com Gemini:', geminiError);
                res.status(500).json({ 
                    success: false, 
                    error: `Erro ao gerar metadados: ${geminiError.message}` 
                });
            }
            
        } catch (error) {
            console.error('Erro ao gerar metadados completos:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    app.post('/api/branding/generate-ai', requireAuth, async (req, res) => {
        try {
            const { pageId, draftText, taskType } = req.body;
            
            if (!pageId || !draftText || !taskType) {
                return res.status(400).json({ success: false, error: 'pageId, draftText e taskType são obrigatórios' });
            }
            
            // Obter API keys do .env
            const openaiKey = process.env.OPENAI_API_KEY;
            const geminiKey = process.env.GEMINI_API_KEY;
            
            if (!openaiKey && !geminiKey) {
                return res.status(500).json({ success: false, error: 'Nenhuma API key de IA configurada' });
            }
            
            // Criar job
            const { data: jobData, error: jobError } = await supabase
                .from('ai_generation_jobs')
                .insert({
                    target_table: 'page_meta',
                    target_id: pageId,
                    input_prompt: draftText,
                    draft_text: draftText,
                    task_type: taskType,
                    provider: openaiKey ? 'openai' : 'google',
                    status: 'queued'
                })
                .select()
                .single();
            
            if (jobError) throw jobError;
            
            // Executar geração (em background, não bloquear resposta)
            generateWithAI(jobData.id, draftText, taskType, openaiKey || geminiKey, openaiKey ? 'openai' : 'google')
                .catch(error => {
                    console.error('Erro na geração com IA:', error);
                    supabase.from('ai_generation_jobs').update({
                        status: 'failed',
                        error_message: error.message,
                        updated_at: new Date().toISOString()
                    }).eq('id', jobData.id);
                });
            
            // Retornar job ID para polling (cliente faz polling)
            res.json({ success: true, jobId: jobData.id });
        } catch (error) {
            console.error('Erro ao gerar com IA:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Função auxiliar: gerar com IA
    async function generateWithAI(jobId, prompt, taskType, apiKey, provider) {
        try {
            await supabase.from('ai_generation_jobs').update({ status: 'running' }).eq('id', jobId);
            
            let result;
            
            if (provider === 'openai') {
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey });
                
                const systemPrompt = taskType === 'title_variations' 
                    ? 'Gera 3 variações de título SEO (50-60 caracteres cada)'
                    : taskType === 'desc_variations'
                    ? 'Gera 3 variações de descrição meta (140-160 caracteres cada)'
                    : 'Gera texto SEO completo com título e descrição';
                
                const startTime = Date.now();
                const response = await openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7
                });
                const duration = Date.now() - startTime;
                
                // Rastrear custo OpenAI (Administração)
                try {
                    const usage = response.usage || {};
                    await aiTracker.trackOpenAICall({
                        model: 'gpt-4',
                        inputTokens: usage.prompt_tokens || 0,
                        outputTokens: usage.completion_tokens || 0,
                        eventId: null,
                        duration,
                        timestamp: new Date()
                    });
                } catch (trackError) {
                    console.error('❌ Erro ao rastrear custo OpenAI:', trackError.message);
                }
                
                const content = response.choices[0].message.content;
                
                if (taskType === 'title_variations' || taskType === 'desc_variations') {
                    // Extrair variações
                    result = content.split('\n').filter(line => line.trim()).map(line => line.replace(/^\d+\.\s*/, '').trim());
                } else {
                    result = content;
                }
            } else {
                // Gemini
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                
                const systemPrompt = taskType === 'title_variations' 
                    ? 'Gera 3 variações de título SEO (50-60 caracteres cada)'
                    : taskType === 'desc_variations'
                    ? 'Gera 3 variações de descrição meta (140-160 caracteres cada)'
                    : 'Gera texto SEO completo com título e descrição';
                
                const startTime = Date.now();
                const result_gen = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
                const duration = Date.now() - startTime;
                const content = result_gen.response.text();
                
                // Rastrear custo Gemini (Administração)
                try {
                    const usage = result_gen.response.usageMetadata || {};
                    await aiTracker.trackGeminiCall({
                        model: 'gemini-pro',
                        inputTokens: usage.promptTokenCount || Math.ceil((systemPrompt + prompt).length / 4),
                        outputTokens: usage.candidatesTokenCount || Math.ceil(content.length / 4),
                        eventId: null,
                        duration,
                        timestamp: new Date()
                    });
                } catch (trackError) {
                    console.error('❌ Erro ao rastrear custo Gemini:', trackError.message);
                }
                
                if (taskType === 'title_variations' || taskType === 'desc_variations') {
                    result = content.split('\n').filter(line => line.trim()).map(line => line.replace(/^\d+\.\s*/, '').trim());
                } else {
                    result = content;
                }
            }
            
            // Guardar resultado
            await supabase.from('ai_generation_jobs').update({
                status: 'succeeded',
                result_json: { variations: result }
            }).eq('id', jobId);
            
            return result;
        } catch (error) {
            throw error;
        }
    }
    
    // ==========================================
    // LOGO VARIANTS GENERATION
    // ==========================================
    
    // Gerar todas as variantes de logos
    app.post('/api/branding/generate-logo-variants', requireAuth, async (req, res) => {
        try {
            // Buscar todos os logos existentes (incluindo horizontais e verticais)
            const { data: logos, error: logosError } = await supabase
                .from('site_brand_assets')
                .select('*')
                .in('type', ['logo_primary', 'logo_primary_horizontal', 'logo_primary_vertical',
                             'logo_secondary', 'logo_secondary_horizontal', 'logo_secondary_vertical'])
                .is('deleted_at', null);
            
            if (logosError) throw logosError;
            
            if (!logos || logos.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Nenhum logo encontrado para gerar variantes' 
                });
            }
            
            let generatedCount = 0;
            const errors = [];
            
            for (const logo of logos) {
                try {
                    // Detetar orientação do logo
                    const isHorizontal = logo.type.includes('horizontal') || 
                                        (logo.type === 'logo_primary' || logo.type === 'logo_secondary');
                    const isVertical = logo.type.includes('vertical');
                    const isLogo = logo.type.includes('logo') && 
                                  !logo.type.includes('favicon') && 
                                  !logo.type.includes('app_icon');
                    
                    // Baixar imagem original primeiro para obter dimensões
                    const bucket = logo.type === 'favicon' || logo.type === 'app_icon' 
                        ? 'favicons-and-manifest' 
                        : 'media-originals';
                    
                    const { data: imageData, error: downloadError } = await supabase.storage
                        .from(bucket)
                        .download(logo.file_path);
                    
                    if (downloadError) {
                        errors.push(`Erro ao baixar ${logo.type}: ${downloadError.message}`);
                        continue;
                    }
                    
                    const imageBuffer = Buffer.from(await imageData.arrayBuffer());
                    
                    // Obter dimensões originais da imagem
                    const metadata = await sharp(imageBuffer).metadata();
                    const originalWidth = metadata.width || logo.width || 512;
                    const originalHeight = metadata.height || logo.height || 512;
                    const aspectRatio = originalWidth / originalHeight;
                    
                    // Detetar orientação real da imagem se não especificada no tipo
                    let detectedOrientation = 'horizontal';
                    if (isVertical) {
                        detectedOrientation = 'vertical';
                    } else if (aspectRatio < 1) {
                        detectedOrientation = 'vertical';
                    } else if (aspectRatio > 1) {
                        detectedOrientation = 'horizontal';
                    }
                    
                    // Definir variantes baseadas na orientação
                    let variants = [];
                    
                    if (isLogo) {
                        if (detectedOrientation === 'horizontal' || isHorizontal) {
                            // Variantes horizontais - manter proporção horizontal
                            variants = [
                                // Desktop horizontal
                                { width: 512, height: Math.round(512 / aspectRatio), format: 'png', name: 'desktop' },
                                { width: 256, height: Math.round(256 / aspectRatio), format: 'png', name: 'desktop-small' },
                                { width: 512, height: Math.round(512 / aspectRatio), format: 'webp', name: 'desktop-webp' },
                                { width: 256, height: Math.round(256 / aspectRatio), format: 'webp', name: 'desktop-small-webp' },
                                
                                // Tablet horizontal
                                { width: 384, height: Math.round(384 / aspectRatio), format: 'png', name: 'tablet' },
                                { width: 192, height: Math.round(192 / aspectRatio), format: 'png', name: 'tablet-small' },
                                { width: 384, height: Math.round(384 / aspectRatio), format: 'webp', name: 'tablet-webp' },
                                
                                // Mobile horizontal
                                { width: 256, height: Math.round(256 / aspectRatio), format: 'png', name: 'mobile' },
                                { width: 128, height: Math.round(128 / aspectRatio), format: 'png', name: 'mobile-small' },
                                { width: 256, height: Math.round(256 / aspectRatio), format: 'webp', name: 'mobile-webp' }
                            ];
                        } else {
                            // Variantes verticais - manter proporção vertical
                            variants = [
                                // Desktop vertical
                                { width: Math.round(512 * aspectRatio), height: 512, format: 'png', name: 'desktop' },
                                { width: Math.round(256 * aspectRatio), height: 256, format: 'png', name: 'desktop-small' },
                                { width: Math.round(512 * aspectRatio), height: 512, format: 'webp', name: 'desktop-webp' },
                                { width: Math.round(256 * aspectRatio), height: 256, format: 'webp', name: 'desktop-small-webp' },
                                
                                // Tablet vertical
                                { width: Math.round(384 * aspectRatio), height: 384, format: 'png', name: 'tablet' },
                                { width: Math.round(192 * aspectRatio), height: 192, format: 'png', name: 'tablet-small' },
                                { width: Math.round(384 * aspectRatio), height: 384, format: 'webp', name: 'tablet-webp' },
                                
                                // Mobile vertical
                                { width: Math.round(256 * aspectRatio), height: 256, format: 'png', name: 'mobile' },
                                { width: Math.round(128 * aspectRatio), height: 128, format: 'png', name: 'mobile-small' },
                                { width: Math.round(256 * aspectRatio), height: 256, format: 'webp', name: 'mobile-webp' }
                            ];
                        }
                    } else {
                        // Favicon e App Icon - sempre quadrados
                        variants = [
                            // Favicon sizes
                            { width: 32, height: 32, format: 'png', name: 'favicon-32' },
                            { width: 16, height: 16, format: 'png', name: 'favicon-16' },
                            { width: 48, height: 48, format: 'png', name: 'favicon-48' },
                            
                            // App icon sizes
                            { width: 180, height: 180, format: 'png', name: 'app-180' },
                            { width: 152, height: 152, format: 'png', name: 'app-152' },
                            { width: 144, height: 144, format: 'png', name: 'app-144' },
                            { width: 120, height: 120, format: 'png', name: 'app-120' },
                            { width: 76, height: 76, format: 'png', name: 'app-76' },
                            { width: 60, height: 60, format: 'png', name: 'app-60' },
                            { width: 40, height: 40, format: 'png', name: 'app-40' },
                            { width: 29, height: 29, format: 'png', name: 'app-29' },
                            { width: 20, height: 20, format: 'png', name: 'app-20' }
                        ];
                    }
                    
                    // Gerar variantes
                    for (const variant of variants) {
                        try {
                            const variantBuffer = await sharp(imageBuffer)
                                .resize(variant.width, variant.height, {
                                    fit: 'contain',
                                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                                    withoutEnlargement: true
                                })
                                .toFormat(variant.format)
                                .toBuffer();
                            
                            // Upload da variante
                            const variantPath = `${logo.type}/variants/${variant.name}_${variant.width}x${variant.height}.${variant.format}`;
                            
                            await supabase.storage.from('media-processed').upload(variantPath, variantBuffer, {
                                contentType: `image/${variant.format}`,
                                upsert: true
                            });
                            
                            // Registar variante na base de dados
                            await supabase.from('media_variants').upsert({
                                source_asset_id: logo.id,
                                source_type: 'brand_asset',
                                variant_key: `${logo.type}_${variant.name}`,
                                file_path: variantPath,
                                format: variant.format,
                                width: variant.width,
                                height: variant.height,
                                generated_by: 'automatic'
                            });
                            
                            generatedCount++;
                        } catch (variantError) {
                            errors.push(`Erro ao gerar variante ${variant.name} para ${logo.type}: ${variantError.message}`);
                        }
                    }
                } catch (logoError) {
                    errors.push(`Erro ao processar ${logo.type}: ${logoError.message}`);
                }
            }
            
            res.json({ 
                success: true, 
                message: `Geradas ${generatedCount} variantes`,
                generatedCount,
                errors: errors.length > 0 ? errors : undefined
            });
            
        } catch (error) {
            console.error('Erro ao gerar variantes de logos:', error);
            res.status(500).json({ 
                success: false, 
                error: `Erro ao gerar variantes: ${error.message}` 
            });
        }
    });
    
    // Regenerar variantes para um tipo específico de logo
    app.post('/api/branding/regenerate-logo-variants/:logoType', requireAuth, async (req, res) => {
        try {
            const { logoType } = req.params;
            
            // Buscar logo do tipo especificado
            const { data: logo, error: logoError } = await supabase
                .from('site_brand_assets')
                .select('*')
                .eq('type', logoType)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (logoError || !logo) {
                return res.status(404).json({ 
                    success: false, 
                    error: `Logo do tipo ${logoType} não encontrado` 
                });
            }
            
            // Eliminar variantes existentes
            await supabase.from('media_variants')
                .delete()
                .eq('source_asset_id', logo.id)
                .eq('source_type', 'brand_asset');
            
            // Gerar novas variantes (mesmo código da função anterior, mas apenas para este logo)
            const variants = [
                { width: 512, height: 512, format: 'png', name: 'desktop' },
                { width: 256, height: 256, format: 'png', name: 'desktop-small' },
                { width: 512, height: 512, format: 'webp', name: 'desktop-webp' },
                { width: 256, height: 256, format: 'webp', name: 'desktop-small-webp' },
                { width: 384, height: 384, format: 'png', name: 'tablet' },
                { width: 192, height: 192, format: 'png', name: 'tablet-small' },
                { width: 384, height: 384, format: 'webp', name: 'tablet-webp' },
                { width: 256, height: 256, format: 'png', name: 'mobile' },
                { width: 128, height: 128, format: 'png', name: 'mobile-small' },
                { width: 256, height: 256, format: 'webp', name: 'mobile-webp' }
            ];
            
            const bucket = logo.type === 'favicon' || logo.type === 'app_icon' 
                ? 'favicons-and-manifest' 
                : 'media-originals';
            
            const { data: imageData, error: downloadError } = await supabase.storage
                .from(bucket)
                .download(logo.file_path);
            
            if (downloadError) throw downloadError;
            
            const imageBuffer = Buffer.from(await imageData.arrayBuffer());
            let generatedCount = 0;
            
            for (const variant of variants) {
                try {
                    const variantBuffer = await sharp(imageBuffer)
                        .resize(variant.width, variant.height, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .toFormat(variant.format)
                        .toBuffer();
                    
                    const variantPath = `${logo.type}/variants/${variant.name}_${variant.width}x${variant.height}.${variant.format}`;
                    
                    await supabase.storage.from('media-processed').upload(variantPath, variantBuffer, {
                        contentType: `image/${variant.format}`,
                        upsert: true
                    });
                    
                    await supabase.from('media_variants').upsert({
                        source_asset_id: logo.id,
                        source_type: 'brand_asset',
                        variant_key: `${logo.type}_${variant.name}`,
                        file_path: variantPath,
                        format: variant.format,
                        width: variant.width,
                        height: variant.height,
                        generated_by: 'automatic'
                    });
                    
                    generatedCount++;
                } catch (variantError) {
                    console.error(`Erro ao gerar variante ${variant.name}:`, variantError);
                }
            }
            
            res.json({ 
                success: true, 
                message: `Regeneradas ${generatedCount} variantes para ${logoType}`,
                generatedCount
            });
            
        } catch (error) {
            console.error('Erro ao regenerar variantes:', error);
            res.status(500).json({ 
                success: false, 
                error: `Erro ao regenerar variantes: ${error.message}` 
            });
        }
    });
    
    // Obter variantes de logos
    app.get('/api/branding/logo-variants', requireAuth, async (req, res) => {
        try {
            // Buscar logos (incluindo horizontais e verticais)
            const { data: logos, error: logosError } = await supabase
                .from('site_brand_assets')
                .select('id, type')
                .in('type', ['logo_primary', 'logo_primary_horizontal', 'logo_primary_vertical',
                             'logo_secondary', 'logo_secondary_horizontal', 'logo_secondary_vertical'])
                .is('deleted_at', null);
            
            if (logosError) throw logosError;
            
            if (!logos || logos.length === 0) {
                return res.json({ success: true, data: [] });
            }
            
            const logoIds = logos.map(l => l.id);
            
            // Buscar variantes
            const { data: variants, error: variantsError } = await supabase
                .from('media_variants')
                .select('*')
                .in('source_asset_id', logoIds)
                .eq('source_type', 'brand_asset')
                .is('deleted_at', null);
            
            if (variantsError) throw variantsError;
            
            // Adicionar URLs públicas
            const variantsWithUrls = await Promise.all((variants || []).map(async (variant) => {
                const { data: urlData } = supabase.storage
                    .from('media-processed')
                    .getPublicUrl(variant.file_path);
                
                return {
                    ...variant,
                    public_url: urlData?.publicUrl || variant.file_path
                };
            }));
            
            res.json({ success: true, data: variantsWithUrls });
        } catch (error) {
            console.error('Erro ao buscar variantes de logos:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Obter logo conforme contexto (horizontal ou vertical)
    app.get('/api/branding/logo/:type/:orientation?', async (req, res) => {
        try {
            const { type, orientation = 'horizontal' } = req.params;
            // type pode ser 'primary', 'secondary', ou 'favicon'
            // orientation pode ser 'horizontal', 'vertical' (ignorado para favicon)
            
            // Tratar favicon separadamente
            if (type === 'favicon') {
                // Buscar favicon publicado primeiro, senão buscar draft
                let { data: favicon, error: faviconError } = await supabase
                    .from('site_brand_assets')
                    .select('*')
                    .eq('type', 'favicon')
                    .eq('status', 'published')
                    .is('deleted_at', null)
                    .order('is_preferred', { ascending: false })
                    .order('updated_at', { ascending: false })
                    .limit(1);
                
                // Se não encontrou publicado, buscar draft
                if ((!favicon || favicon.length === 0) && !faviconError) {
                    const draftResult = await supabase
                        .from('site_brand_assets')
                        .select('*')
                        .eq('type', 'favicon')
                        .eq('status', 'draft')
                        .is('deleted_at', null)
                        .order('is_preferred', { ascending: false })
                        .order('updated_at', { ascending: false })
                        .limit(1);
                    favicon = draftResult.data;
                    faviconError = draftResult.error;
                }
                
                // Se favicon é array, pegar o primeiro elemento
                if (Array.isArray(favicon) && favicon.length > 0) {
                    favicon = favicon[0];
                }
                
                if (faviconError) throw faviconError;
                
                if (!favicon) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Nenhum favicon encontrado' 
                    });
                }
                
                const bucket = 'favicons-and-manifest';
                const { data: urlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(favicon.file_path);
                
                return res.json({
                    success: true,
                    data: {
                        ...favicon,
                        url: urlData?.publicUrl || favicon.file_path
                    }
                });
            }
            
            if (!['primary', 'secondary'].includes(type)) {
                return res.status(400).json({ success: false, error: 'Tipo inválido. Use "primary", "secondary" ou "favicon"' });
            }
            
            if (!['horizontal', 'vertical'].includes(orientation)) {
                return res.status(400).json({ success: false, error: 'Orientação inválida. Use "horizontal" ou "vertical"' });
            }
            
            // Tentar buscar logo (primeiro published, depois draft)
            // Construir tipos possíveis baseados no tipo e orientação
            const possibleTypes = [];
            if (type === 'primary') {
                if (orientation === 'horizontal') {
                    possibleTypes.push('logo_primary_horizontal', 'logo_primary');
                } else {
                    possibleTypes.push('logo_primary_vertical', 'logo_primary');
                }
            } else if (type === 'secondary') {
                if (orientation === 'horizontal') {
                    possibleTypes.push('logo_secondary_horizontal', 'logo_secondary');
                } else {
                    possibleTypes.push('logo_secondary_vertical', 'logo_secondary');
                }
            }
            
            // Buscar primeiro published (preferido primeiro)
            let result = await supabase
                .from('site_brand_assets')
                .select('*')
                .in('type', possibleTypes)
                .eq('status', 'published')
                .is('deleted_at', null)
                .order('is_preferred', { ascending: false })
                .order('updated_at', { ascending: false })
                .limit(1);
            
            // Se não encontrou published, buscar draft
            if ((!result.data || result.data.length === 0) && !result.error) {
                result = await supabase
                    .from('site_brand_assets')
                    .select('*')
                    .in('type', possibleTypes)
                    .eq('status', 'draft')
                    .is('deleted_at', null)
                    .order('is_preferred', { ascending: false })
                    .order('updated_at', { ascending: false })
                    .limit(1);
            }
            
            if (result.error) throw result.error;
            
            if (!result.data || result.data.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: `Nenhum logo ${type} ${orientation} encontrado` 
                });
            }
            
            const logo = result.data[0];
            
            // Obter URL pública ou assinada dependendo se o bucket é público
            const bucket = logo.type === 'favicon' || logo.type === 'app_icon' 
                ? 'favicons-and-manifest' 
                : 'media-originals';
            
            // Buckets conhecidos como públicos
            const isPublicBucket = bucket === 'favicons-and-manifest' || bucket === 'media-processed';
            
            let logoUrl;
            
            if (isPublicBucket) {
                // Para buckets públicos, usar URL pública
                const { data: urlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(logo.file_path);
                logoUrl = urlData?.publicUrl;
            } else {
                // Para buckets privados (media-originals), usar endpoint proxy diretamente
                // O endpoint proxy serve o ficheiro usando service role, contornando RLS
                logoUrl = `/api/branding/logo-file/${logo.id}`;
                console.log(`📦 Usando endpoint proxy para logo privado: ${logoUrl}`);
            }
            
            res.json({
                success: true,
                data: {
                    ...logo,
                    url: logoUrl || logo.file_path
                }
            });
        } catch (error) {
            console.error('Erro ao obter logo:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Endpoint proxy para servir logos de buckets privados
    app.get('/api/branding/logo-file/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Buscar logo na base de dados
            const { data: logo, error: logoError } = await supabase
                .from('site_brand_assets')
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single();
            
            if (logoError || !logo) {
                return res.status(404).json({ success: false, error: 'Logo não encontrado' });
            }
            
            // Determinar bucket
            const bucket = logo.type === 'favicon' || logo.type === 'app_icon' 
                ? 'favicons-and-manifest' 
                : 'media-originals';
            
            // Baixar ficheiro do storage usando cliente admin
            const { data: fileData, error: downloadError } = await supabaseAdmin
                .storage
                .from(bucket)
                .download(logo.file_path);
            
            if (downloadError || !fileData) {
                console.error('Erro ao baixar logo do storage:', downloadError);
                return res.status(404).json({ success: false, error: 'Ficheiro não encontrado no storage' });
            }
            
            // Converter para buffer
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Determinar content type baseado no formato
            const contentTypeMap = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'svg': 'image/svg+xml',
                'webp': 'image/webp',
                'ico': 'image/x-icon'
            };
            
            const contentType = contentTypeMap[logo.format] || 'image/png';
            
            // Enviar ficheiro com headers apropriados
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
            res.send(buffer);
            
        } catch (error) {
            console.error('Erro ao servir logo file:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Publicar logos
    app.post('/api/branding/publish-logos', requireAuth, async (req, res) => {
        try {
            // Atualizar status de todos os logos para 'published'
            const { data, error } = await supabase
                .from('site_brand_assets')
                .update({ 
                    status: 'published',
                    updated_by: req.userId,
                    updated_at: new Date().toISOString()
                })
                .in('type', ['logo_primary', 'logo_primary_horizontal', 'logo_primary_vertical',
                             'logo_secondary', 'logo_secondary_horizontal', 'logo_secondary_vertical',
                             'favicon', 'app_icon'])
                .is('deleted_at', null);
            
            if (error) throw error;
            
            res.json({ 
                success: true, 
                message: 'Logos publicados com sucesso' 
            });
            
        } catch (error) {
            console.error('Erro ao publicar logos:', error);
            res.status(500).json({ 
                success: false, 
                error: `Erro ao publicar logos: ${error.message}` 
            });
        }
    });
    
    // ==========================================
    // METADADOS GLOBAIS
    // ==========================================
    
    // Gerar metadados globais com IA
    app.post('/api/branding/generate-global-metadata', requireAuth, async (req, res) => {
        try {
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!geminiKey) {
                return res.status(500).json({ success: false, error: 'GEMINI_API_KEY não configurada' });
            }
            
            // Buscar contexto publicado da plataforma
            let platformContext = '';
            try {
                const { data: contextData } = await supabase
                    .from('platform_context')
                    .select('*')
                    .eq('platform_name', 'kromi.online')
                    .eq('status', 'published')
                    .is('deleted_at', null)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (contextData) {
                    platformContext = `

CONTEXTO DA PLATAFORMA:
- Nome: ${contextData.platform_name}
- Objetivo: ${contextData.platform_objective || 'Não definido'}
- Descrição: ${contextData.platform_description || 'Não definido'}
- Público-Alvo: ${contextData.target_audience || 'Não definido'}
- Características: ${Array.isArray(contextData.key_features) ? contextData.key_features.join(', ') : (contextData.key_features || 'Não definido')}
- Tom da Marca: ${contextData.brand_voice || 'Não definido'}
- Personalidade: ${contextData.brand_personality || 'Não definido'}
- Setor: ${contextData.industry_sector || 'Não definido'}
- Casos de Uso: ${Array.isArray(contextData.use_cases) ? contextData.use_cases.join(', ') : (contextData.use_cases || 'Não definido')}`;
                }
            } catch (e) {
                console.warn('Erro ao buscar contexto global:', e.message);
            }
            
            // Construir prompt para Gemini
            const prompt = `Gera metadados SEO globais para o site Kromi.online em formato JSON.

REGRAS IMPORTANTES:
- Responde APENAS com JSON válido
- Usa português pt-PT
- Título: 50-60 caracteres, focado em benefício e SEO
- Descrição: 140-160 caracteres, clara e atrativa
- Keywords: 5-8 termos relevantes, separados por vírgula
- ogSiteName: "Kromi.online"
- canonicalUrl: "https://kromi.online"
- robotsDirectives: "index,follow"

${platformContext}

Gera metadados que reflitam:
- Plataforma de gestão de eventos desportivos
- Tecnologia de visão computacional
- Cronometragem automática
- Análise de resultados
- Público: organizadores de eventos, federações, clubes
- Foco em inovação e precisão

Responde com JSON no formato:
{
  "siteTitle": "Título do site (50-60 caracteres)",
  "siteDescription": "Descrição do site (140-160 caracteres)",
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "ogSiteName": "Kromi.online",
  "canonicalUrl": "https://kromi.online",
  "robotsDirectives": "index,follow"
}`;
            
            // Usar Gemini API
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(geminiKey);
            
            // Tentar modelos em ordem
            const modelsToTry = [
                'gemini-2.0-flash-exp',
                'gemini-1.5-pro',
                'gemini-1.5-flash-latest',
                'gemini-pro'
            ];
            
            let result, text;
            let lastError;
            
            for (const modelName of modelsToTry) {
                try {
                    console.log(`🎯 Gerando metadados globais com modelo: ${modelName}`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const startTime = Date.now();
                    result = await model.generateContent(prompt);
                    const response = await result.response;
                    const duration = Date.now() - startTime;
                    text = response.text();
                    console.log(`✅ Sucesso com modelo: ${modelName}`);
                    
                    // Rastrear custo (Administração)
                    try {
                        const usage = response.usageMetadata || {};
                        await aiTracker.trackGeminiCall({
                            model: modelName,
                            inputTokens: usage.promptTokenCount || Math.ceil(prompt.length / 4),
                            outputTokens: usage.candidatesTokenCount || Math.ceil(text.length / 4),
                            eventId: null,
                            duration,
                            timestamp: new Date()
                        });
                    } catch (trackError) {
                        console.error('❌ Erro ao rastrear custo:', trackError.message);
                    }
                    
                    break;
                } catch (modelError) {
                    lastError = modelError;
                    console.warn(`⚠️ Modelo ${modelName} falhou:`, modelError.message);
                    continue;
                }
            }
            
            if (!text) {
                throw new Error(`Todos os modelos falharam. Último erro: ${lastError?.message || 'Desconhecido'}`);
            }
            
            // Limpar e parsear JSON
            const cleanText = text.replace(/```json|```/g, '').trim();
            const metadata = JSON.parse(cleanText);
            
            // Validar campos obrigatórios
            const requiredFields = ['siteTitle', 'siteDescription', 'keywords', 'ogSiteName', 'canonicalUrl', 'robotsDirectives'];
            for (const field of requiredFields) {
                if (!metadata[field]) {
                    metadata[field] = field === 'keywords' ? [] : '';
                }
            }
            
            res.json({ success: true, data: metadata });
            
        } catch (error) {
            console.error('Erro ao gerar metadados globais:', error);
            res.status(500).json({ 
                success: false, 
                error: `Erro ao gerar metadados globais: ${error.message}` 
            });
        }
    });
    
    // Obter metadados globais (fallback para draft se não houver published)
    app.get('/api/branding/global-metadata', requireAuth, async (req, res) => {
        try {
            // 1) Tentar published
            let { data, error } = await supabase
                .from('site_global_metadata')
                .select('*')
                .eq('status', 'published')
                .is('deleted_at', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            // 2) Se não houver published, retornar o mais recente (draft)
            if (!data) {
                const draftQuery = await supabase
                    .from('site_global_metadata')
                    .select('*')
                    .is('deleted_at', null)
                    .order('status', { ascending: false }) // published primeiro, depois draft
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (draftQuery.error) throw draftQuery.error;
                data = draftQuery.data || null;
            }

            if (!data) {
                return res.status(404).json({ success: false, error: 'Metadados globais não encontrados' });
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao carregar metadados globais:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Guardar metadados globais
    app.post('/api/branding/global-metadata', requireAuth, async (req, res) => {
        try {
            const { siteTitle, siteDescription, keywords, ogSiteName, canonicalUrl, robotsDirectives } = req.body;
            
            console.log('💾 Recebendo metadados globais:', {
                siteTitle,
                siteDescription,
                keywords,
                ogSiteName,
                canonicalUrl,
                robotsDirectives
            });
            
            // Verificar se existe um registo
            const { data: existing, error: findError } = await supabase
                .from('site_global_metadata')
                .select('id, status')
                .is('deleted_at', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (findError) throw findError;
            
            const metadataData = {
                site_title: siteTitle || '',
                site_description: siteDescription || '',
                keywords: keywords || [],
                og_site_name: ogSiteName || 'Kromi.online',
                canonical_url: canonicalUrl || 'https://kromi.online',
                robots_directives: robotsDirectives || 'index,follow',
                updated_by: req.userId,
                updated_at: new Date().toISOString()
            };
            
            let data, error;
            if (existing && existing.id) {
                // Atualizar existente (preservar status)
                metadataData.status = existing.status || 'draft';
                
                const result = await supabase
                    .from('site_global_metadata')
                    .update(metadataData)
                    .eq('id', existing.id)
                    .select()
                    .single();
                data = result.data;
                error = result.error;
                if (!error) console.log('✅ Metadados globais atualizados:', data.id);
            } else {
                // Criar novo
                metadataData.status = 'draft';
                metadataData.created_by = req.userId;
                
                const result = await supabase
                    .from('site_global_metadata')
                    .insert(metadataData)
                    .select()
                    .single();
                data = result.data;
                error = result.error;
                if (!error) console.log('✅ Metadados globais criados:', data.id);
            }
            
            if (error) throw error;
            
            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao guardar metadados globais:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // Publicar metadados globais
    app.post('/api/branding/global-metadata/publish', requireAuth, async (req, res) => {
        try {
            // Primeiro, encontrar o registo mais recente (pode ser draft ou published)
            const { data: existing, error: findError } = await supabase
                .from('site_global_metadata')
                .select('id, status')
                .is('deleted_at', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (findError) throw findError;
            
            if (!existing || !existing.id) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Nenhum metadado global encontrado. Guarde primeiro.' 
                });
            }
            
            // Atualizar status para 'published' usando o ID encontrado
            const { data, error } = await supabase
                .from('site_global_metadata')
                .update({ 
                    status: 'published',
                    updated_by: req.userId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Metadados globais publicados:', data.id, 'Status anterior:', existing.status);
            res.json({ success: true, message: 'Metadados globais publicados', data });
        } catch (error) {
            console.error('Erro ao publicar metadados globais:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // MEDIA LIBRARY
    // ==========================================
    
    app.get('/api/branding/media-library', requireAuth, async (req, res) => {
        try {
            const { type } = req.query;
            
            // Combinar brand assets e thumbnails
            const [brandAssets, thumbnails] = await Promise.all([
                supabase.from('site_brand_assets').select('*').is('deleted_at', null),
                supabase.from('page_thumbnails').select('*').is('deleted_at', null)
            ]);
            
            let allMedia = [
                ...(brandAssets.data || []).map(a => ({ ...a, type: 'logo' })),
                ...(thumbnails.data || []).map(t => ({ ...t, type: 'thumbnail', usage: t.usage }))
            ];
            
            if (type) {
                allMedia = allMedia.filter(m => m.type === type);
            }
            
            // Adicionar URLs
            allMedia = await Promise.all(allMedia.map(async (media) => {
                const bucket = media.type === 'logo' ? 'media-originals' : 'media-originals';
                const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(media.file_path);
                return {
                    ...media,
                    url: urlData?.publicUrl || media.file_path
                };
            }));
            
            res.json({ success: true, data: allMedia });
        } catch (error) {
            console.error('Erro ao carregar media library:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // AI JOB STATUS
    // ==========================================
    
    app.get('/api/branding/ai-job/:jobId', requireAuth, async (req, res) => {
        try {
            const { jobId } = req.params;
            
            const { data, error } = await supabase
                .from('ai_generation_jobs')
                .select('*')
                .eq('id', jobId)
                .single();
            
            if (error) throw error;
            
            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao obter job status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    // ==========================================
    // AUDIT LOG
    // ==========================================
    
    app.get('/api/branding/audit-log', requireAuth, async (req, res) => {
        try {
            const { entity } = req.query;
            
            let query = supabase
                .from('branding_audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (entity) {
                query = query.eq('entity', entity);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            res.json({ success: true, data });
        } catch (error) {
            console.error('Erro ao carregar audit log:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    console.log('✅ Rotas de branding e SEO carregadas');
};

