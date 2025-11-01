/**
 * ==========================================
 * FORM BUILDER ROUTES - Kromi.online
 * ==========================================
 * 
 * Endpoints REST para gestão de formulários dinâmicos
 * Sistema completo de form builder por evento
 * 
 * Versão: 1.0
 * Data: 2025-01-XX
 * ==========================================
 */

const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function(app, sessionManager, supabaseAdmin = null, auditLogger = null) {
    console.log('📋 Carregando rotas de Form Builder...');

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
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'public' },
        global: { headers: supabaseServiceKey ? { 'apikey': supabaseServiceKey } : {} }
    });

    const adminClient = supabaseAdmin || (supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null);

    if (supabaseServiceKey || supabaseAdmin) {
        console.log('✅ Cliente Supabase (service role) inicializado para Form Builder - RLS bypassed');
    } else {
        console.log('⚠️ Cliente Supabase (anon key) inicializado para Form Builder - RLS ATIVO');
    }

    // ==========================================
    // Middlewares
    // ==========================================
    function requireAuth(req, res, next) {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({ success: false, error: 'Não autenticado', code: 'NO_SESSION' });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            res.clearCookie('sid');
            return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada', code: 'INVALID_SESSION' });
        }
        
        req.userSession = session;
        next();
    }

    function requireRole(allowedRoles) {
        return (req, res, next) => {
            const userRole = req.userSession?.userProfile?.role;
            
            if (!userRole || !allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Sem permissão para aceder a este recurso',
                    code: 'FORBIDDEN',
                    requiredRoles: allowedRoles,
                    currentRole: userRole
                });
            }
            
            next();
        };
    }

    // Rate limiting middleware
    const rateLimitMap = new Map();
    const RATE_LIMIT_WINDOW = 60000; // 1 minuto
    const RATE_LIMIT_MAX_REQUESTS = 10;

    function rateLimit(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `${ip}-${req.userSession?.userId || 'anonymous'}`;
        
        const now = Date.now();
        const requests = rateLimitMap.get(key) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
        
        if (now > requests.resetTime) {
            requests.count = 0;
            requests.resetTime = now + RATE_LIMIT_WINDOW;
        }
        
        if (requests.count >= RATE_LIMIT_MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                error: 'Limite de rate excedido. Tente novamente em alguns instantes.',
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }
        
        requests.count++;
        rateLimitMap.set(key, requests);
        
        next();
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    /**
     * Gerar slug único baseado no nome do evento
     */
    async function generateFormSlug(eventId, baseName) {
        try {
            const { data, error } = await supabase.rpc('generate_event_form_slug', {
                p_event_name: baseName,
                p_event_id: eventId
            });
            
            if (error) {
                console.error('❌ Erro ao gerar slug:', error);
                // Fallback manual
                const slug = baseName.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '') || `event-${eventId.substring(0, 8)}`;
                
                // Verificar unicidade manualmente
                let finalSlug = slug;
                let counter = 0;
                let exists = true;
                
                while (exists) {
                    const { data: check } = await supabase
                        .from('event_forms')
                        .select('id')
                        .eq('form_slug', finalSlug)
                        .limit(1);
                    
                    if (!check || check.length === 0) {
                        exists = false;
                    } else {
                        counter++;
                        finalSlug = `${slug}-${counter}`;
                    }
                }
                
                return finalSlug;
            }
            
            return data;
        } catch (error) {
            console.error('❌ Erro ao gerar slug:', error);
            return `event-${eventId.substring(0, 8)}`;
        }
    }

    /**
     * Log de auditoria
     */
    async function logAudit(formId, eventId, action, entityType, entityId, userId, userEmail, changes = {}, metadata = {}, ipAddress = null) {
        try {
            if (auditLogger) {
                auditLogger.log(action, userId, {
                    form_id: formId,
                    event_id: eventId,
                    entity_type: entityType,
                    entity_id: entityId,
                    changes,
                    metadata,
                    ip_address: ipAddress
                });
            }
            
            // Também inserir na tabela de auditoria
            await supabase.rpc('log_form_builder_action', {
                p_form_id: formId,
                p_event_id: eventId,
                p_action: action,
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_user_id: userId,
                p_user_email: userEmail,
                p_changes: changes,
                p_metadata: metadata,
                p_ip_address: ipAddress
            });
        } catch (error) {
            console.error('⚠️ Erro ao registar auditoria:', error);
            // Não bloquear a operação se o log falhar
        }
    }

    // ==========================================
    // CATÁLOGO DE CAMPOS
    // ==========================================

    /**
     * GET /api/forms/catalog
     * Listar campos do catálogo
     */
    app.get('/api/forms/catalog', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('form_field_catalog')
                .select('*')
                .order('field_key');
            
            if (error) throw error;
            
            res.json({ success: true, fields: data || [], catalog: data || [] });
        } catch (error) {
            console.error('❌ [GET /api/forms/catalog] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/forms/catalog
     * Criar campo no catálogo (apenas admin)
     */
    app.post('/api/forms/catalog', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const fieldData = req.body;
            
            const { data, error } = await supabase
                .from('form_field_catalog')
                .insert([fieldData])
                .select()
                .single();
            
            if (error) throw error;
            
            await logAudit(null, null, 'CATALOG_FIELD_CREATED', 'catalog', data.id, req.userSession.userId, req.userSession.userProfile.email, { field_key: data.field_key });
            
            res.status(201).json({ success: true, field: data });
        } catch (error) {
            console.error('❌ [POST /api/forms/catalog] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // FORMULÁRIOS POR EVENTO
    // ==========================================

    /**
     * GET /api/events/:eventId/forms
     * Listar formulários de um evento
     */
    app.get('/api/events/:eventId/forms', requireAuth, async (req, res) => {
        try {
            const { eventId } = req.params;
            
            const { data, error } = await supabase
                .from('event_forms')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            res.json({ success: true, forms: data || [] });
        } catch (error) {
            console.error('❌ [GET /api/events/:eventId/forms] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/events/:eventId/forms
     * Criar formulário para um evento
     */
    app.post('/api/events/:eventId/forms', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { eventId } = req.params;
            const { form_title, form_description, settings = {}, payment_config = null, email_confirmation_config = {} } = req.body;
            
            console.log('📝 [POST /api/events/:eventId/forms] Criando formulário para evento:', eventId);
            
            // Buscar nome do evento para gerar slug
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('name')
                .eq('id', eventId)
                .single();
            
            if (eventError || !event) {
                return res.status(404).json({ success: false, error: 'Evento não encontrado' });
            }
            
            // Gerar slug único
            const slug = await generateFormSlug(eventId, event.name);
            
            // Preparar traduções
            const formTitleTranslations = form_title && typeof form_title === 'object' 
                ? form_title 
                : { pt: form_title || 'Formulário de Inscrição', en: 'Registration Form' };
            
            const formDescriptionTranslations = form_description && typeof form_description === 'object' 
                ? form_description 
                : { pt: form_description || '', en: '' };
            
            const formData = {
                event_id: eventId,
                form_slug: slug,
                form_title_translations: formTitleTranslations,
                form_description_translations: formDescriptionTranslations,
                version: 1,
                is_active: true,
                settings,
                payment_config,
                email_confirmation_config,
                language: settings.language || ['pt'],
                created_by: req.userSession.userId
            };
            
            const { data, error } = await supabase
                .from('event_forms')
                .insert([formData])
                .select()
                .single();
            
            if (error) throw error;
            
            await logAudit(data.id, eventId, 'FORM_CREATED', 'form', data.id, req.userSession.userId, req.userSession.userProfile.email, { slug: data.form_slug });
            
            console.log('✅ [POST /api/events/:eventId/forms] Formulário criado:', data.id);
            res.status(201).json({ success: true, form: data });
        } catch (error) {
            console.error('❌ [POST /api/events/:eventId/forms] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/forms/:formId
     * Obter detalhes de um formulário
     */
    app.get('/api/forms/:formId', async (req, res) => {
        try {
            const { formId } = req.params;
            
            const { data, error } = await supabase
                .from('event_forms')
                .select('*')
                .eq('id', formId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
                }
                throw error;
            }
            
            res.json({ success: true, form: data });
        } catch (error) {
            console.error('❌ [GET /api/forms/:formId] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/forms/:formId
     * Atualizar formulário
     */
    app.put('/api/forms/:formId', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { formId } = req.params;
            const updates = req.body;
            
            const { data, error } = await supabase
                .from('event_forms')
                .update(updates)
                .eq('id', formId)
                .select()
                .single();
            
            if (error) throw error;
            
            await logAudit(formId, data.event_id, 'FORM_UPDATED', 'form', formId, req.userSession.userId, req.userSession.userProfile.email, updates);
            
            res.json({ success: true, form: data });
        } catch (error) {
            console.error('❌ [PUT /api/forms/:formId] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/forms/:formId/publish
     * Publicar formulário
     */
    app.post('/api/forms/:formId/publish', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { formId } = req.params;
            
            const { data, error } = await supabase
                .from('event_forms')
                .update({
                    published_at: new Date().toISOString(),
                    published_by: req.userSession.userId
                })
                .eq('id', formId)
                .select()
                .single();
            
            if (error) throw error;
            
            await logAudit(formId, data.event_id, 'FORM_PUBLISHED', 'form', formId, req.userSession.userId, req.userSession.userProfile.email);
            
            res.json({ success: true, form: data });
        } catch (error) {
            console.error('❌ [POST /api/forms/:formId/publish] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/forms/:formId
     * Deletar formulário
     */
    app.delete('/api/forms/:formId', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { formId } = req.params;
            
            // Buscar event_id antes de deletar para o log
            const { data: form } = await supabase
                .from('event_forms')
                .select('event_id')
                .eq('id', formId)
                .single();
            
            const { error } = await supabase
                .from('event_forms')
                .delete()
                .eq('id', formId);
            
            if (error) throw error;
            
            if (form) {
                await logAudit(formId, form.event_id, 'FORM_DELETED', 'form', formId, req.userSession.userId, req.userSession.userProfile.email);
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('❌ [DELETE /api/forms/:formId] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // CAMPOS DOS FORMULÁRIOS
    // ==========================================

    /**
     * GET /api/forms/:formId/fields
     * Listar campos de um formulário
     */
    app.get('/api/forms/:formId/fields', async (req, res) => {
        try {
            const { formId } = req.params;
            
            const { data, error } = await supabase
                .from('event_form_fields')
                .select('*')
                .eq('form_id', formId)
                .order('field_order', { ascending: true });
            
            if (error) throw error;
            
            res.json({ success: true, fields: data || [] });
        } catch (error) {
            console.error('❌ [GET /api/forms/:formId/fields] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/forms/:formId/fields
     * Adicionar campo(s) ao formulário - aceita objeto único ou array
     */
    app.post('/api/forms/:formId/fields', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { formId } = req.params;
            const fieldsInput = req.body;
            
            // Verificar se é array ou objeto único
            const fieldsArray = Array.isArray(fieldsInput) ? fieldsInput : [fieldsInput];
            
            console.log(`📋 Adicionando ${fieldsArray.length} campo(s) ao formulário ${formId}`);
            
            // Primeiro, deletar todos os campos existentes (para permitir re-save completo)
            if (fieldsArray.length > 1) {
                await supabase
                    .from('event_form_fields')
                    .delete()
                    .eq('form_id', formId);
                
                console.log('🗑️ Campos existentes removidos para re-save');
            }
            
            // Preparar dados para inserção
            const fieldsToInsert = fieldsArray.map((field, index) => ({
                ...field,
                form_id: formId,
                field_order: field.field_order || (index + 1)
            }));
            
            console.log('💾 Campos para inserir:', fieldsToInsert);
            
            const { data, error } = await supabase
                .from('event_form_fields')
                .insert(fieldsToInsert)
                .select('*');
            
            if (error) throw error;
            
            console.log('✅ Campos inseridos:', data?.length || 0);
            
            // Buscar event_id para log
            const { data: form } = await supabase
                .from('event_forms')
                .select('event_id')
                .eq('id', formId)
                .single();
            
            if (form) {
                const customCount = fieldsToInsert.filter(f => !f.field_catalog_id).length;
                await logAudit(formId, form.event_id, 'FIELDS_ADDED', 'form', formId, req.userSession.userId, req.userSession.userProfile.email, { 
                    fields_count: fieldsToInsert.length,
                    custom_fields_count: customCount 
                });
            }
            
            res.status(201).json({ 
                success: true, 
                fields: data,
                count: data?.length || 0,
                message: `${data?.length || 0} campo(s) adicionado(s) com sucesso`
            });
        } catch (error) {
            console.error('❌ [POST /api/forms/:formId/fields] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/forms/:formId/fields/:fieldId
     * Atualizar campo do formulário
     */
    app.put('/api/forms/:formId/fields/:fieldId', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { fieldId } = req.params;
            const updates = req.body;
            
            const { data, error } = await supabase
                .from('event_form_fields')
                .update(updates)
                .eq('id', fieldId)
                .select('*')
                .single();
            
            if (error) throw error;
            
            // Buscar event_id para log
            const { data: form } = await supabase
                .from('event_forms')
                .select('event_id')
                .eq('id', data.form_id)
                .single();
            
            if (form) {
                await logAudit(data.form_id, form.event_id, 'FIELD_UPDATED', 'field', fieldId, req.userSession.userId, req.userSession.userProfile.email, updates);
            }
            
            res.json({ success: true, field: data });
        } catch (error) {
            console.error('❌ [PUT /api/forms/:formId/fields/:fieldId] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/forms/:formId/fields/reorder
     * Reordenar campos (drag and drop)
     */
    app.post('/api/forms/:formId/fields/reorder', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { formId } = req.params;
            const { fields } = req.body; // Array de { id, field_order }
            
            // Atualizar todos os campos de uma vez
            for (const field of fields) {
                await supabase
                    .from('event_form_fields')
                    .update({ field_order: field.field_order })
                    .eq('id', field.id);
            }
            
            // Buscar event_id para log
            const { data: form } = await supabase
                .from('event_forms')
                .select('event_id')
                .eq('id', formId)
                .single();
            
            if (form) {
                await logAudit(formId, form.event_id, 'FIELDS_REORDERED', 'form', formId, req.userSession.userId, req.userSession.userProfile.email, { fields_count: fields.length });
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('❌ [POST /api/forms/:formId/fields/reorder] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/forms/:formId/fields/:fieldId
     * Remover campo do formulário
     */
    app.delete('/api/forms/:formId/fields/:fieldId', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { fieldId } = req.params;
            
            // Buscar form_id antes de deletar
            const { data: field } = await supabase
                .from('event_form_fields')
                .select('form_id, field_key')
                .eq('id', fieldId)
                .single();
            
            if (!field) {
                return res.status(404).json({ success: false, error: 'Campo não encontrado' });
            }
            
            // Buscar event_id para log
            const { data: form } = await supabase
                .from('event_forms')
                .select('event_id')
                .eq('id', field.form_id)
                .single();
            
            const { error } = await supabase
                .from('event_form_fields')
                .delete()
                .eq('id', fieldId);
            
            if (error) throw error;
            
            if (form) {
                await logAudit(field.form_id, form.event_id, 'FIELD_DELETED', 'field', fieldId, req.userSession.userId, req.userSession.userProfile.email, { field_key: field.field_key });
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('❌ [DELETE /api/forms/:formId/fields/:fieldId] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // SUBMISSÕES
    // ==========================================

    /**
     * POST /api/forms/:formId/submit
     * Submeter formulário (público)
     */
    app.post('/api/forms/:formId/submit', rateLimit, async (req, res) => {
        try {
            const { formId } = req.params;
            const { submission_data, language = 'pt' } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            
            console.log('📝 [POST /api/forms/:formId/submit] Nova submissão para form:', formId);
            
            // Buscar formulário
            const { data: form, error: formError } = await supabase
                .from('event_forms')
                .select('*, event:events(*)')
                .eq('id', formId)
                .single();
            
            if (formError || !form) {
                return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
            }
            
            // Verificar se está publicado
            if (!form.published_at) {
                return res.status(403).json({ success: false, error: 'Formulário não está publicado' });
            }
            
            // Validar dados básicos
            if (!submission_data || typeof submission_data !== 'object') {
                return res.status(400).json({ success: false, error: 'Dados de submissão inválidos' });
            }
            
            // Gerar token de confirmação
            const crypto = require('crypto');
            const confirmationToken = crypto.randomBytes(32).toString('hex');
            
            // Preparar dados da submissão
            const submissionRecord = {
                form_id: formId,
                event_id: form.event_id,
                form_version: form.version,
                submission_data,
                payment_status: form.payment_config?.enabled ? 'pending' : null,
                language,
                ip_address: ipAddress,
                user_agent: userAgent,
                confirmation_token: confirmationToken,
                status: 'submitted'
            };
            
            const { data: submission, error: submitError } = await supabase
                .from('form_submissions')
                .insert([submissionRecord])
                .select()
                .single();
            
            if (submitError) throw submitError;
            
            console.log('✅ [POST /api/forms/:formId/submit] Submissão criada:', submission.id);
            
            // Criar participante automaticamente a partir da submissão
            try {
                const { data: participantId, error: participantError } = await supabase.rpc('create_participant_from_submission', {
                    p_form_submission_id: submission.id
                });
                
                if (participantError) {
                    console.error('⚠️ Erro ao criar participante:', participantError);
                    // Não falhar a submissão se o participante não foi criado
                    // Pode ser criado manualmente depois
                } else {
                    console.log('✅ [POST /api/forms/:formId/submit] Participante criado:', participantId);
                }
            } catch (createPartError) {
                console.error('⚠️ Erro ao chamar create_participant_from_submission:', createPartError);
                // Continuar mesmo se falhar - submissão foi criada com sucesso
            }
            
            // TODO: Enviar e-mail de confirmação se configurado
            // TODO: Processar pagamento se configurado
            
            res.status(201).json({
                success: true,
                submission_id: submission.id,
                confirmation_token: confirmationToken
            });
        } catch (error) {
            console.error('❌ [POST /api/forms/:formId/submit] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/forms/:formId/submissions
     * Listar submissões de um formulário (organizadores)
     */
    app.get('/api/forms/:formId/submissions', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const { formId } = req.params;
            const { limit = 100, offset = 0, status, payment_status } = req.query;
            
            let query = supabase
                .from('form_submissions')
                .select('*')
                .eq('form_id', formId)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
            
            if (status) {
                query = query.eq('status', status);
            }
            
            if (payment_status) {
                query = query.eq('payment_status', payment_status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            res.json({ success: true, submissions: data || [], count: data?.length || 0 });
        } catch (error) {
            console.error('❌ [GET /api/forms/:formId/submissions] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/submissions/:submissionId/confirm
     * Confirmar submissão via token (público)
     */
    app.get('/api/submissions/:submissionId/confirm', async (req, res) => {
        try {
            const { submissionId } = req.params;
            const { token } = req.query;
            
            if (!token) {
                return res.status(400).json({ success: false, error: 'Token de confirmação é obrigatório' });
            }
            
            const { data, error } = await supabase
                .from('form_submissions')
                .update({
                    is_confirmed: true,
                    confirmed_at: new Date().toISOString()
                })
                .eq('id', submissionId)
                .eq('confirmation_token', token)
                .eq('is_confirmed', false)
                .select()
                .single();
            
            if (error || !data) {
                return res.status(400).json({ success: false, error: 'Token inválido ou já confirmado' });
            }
            
            res.json({ success: true, message: 'Submissão confirmada com sucesso' });
        } catch (error) {
            console.error('❌ [GET /api/submissions/:submissionId/confirm] Erro:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // PÚBLICO - FORMULARIO E REDIRECIONAMENTOS
    // ==========================================

    /**
     * GET /form/:slug
     * Aceder ao formulário público por slug
     */
    app.get('/form/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            const language = req.query.lang || 'pt';
            
            console.log('📋 [GET /form/:slug] Buscando formulário:', slug, 'idioma:', language);
            
            // Buscar formulário por slug
            const { data: form, error: formError } = await supabase
                .from('event_forms')
                .select('*, event:events(*)')
                .eq('form_slug', slug)
                .eq('is_active', true)
                .single();
            
            if (formError || !form) {
                return res.status(404).send('Formulário não encontrado');
            }
            
            // Verificar se está publicado
            if (!form.published_at) {
                return res.status(403).send('Formulário não está publicado');
            }
            
            // Renderizar página HTML do formulário
            res.send(renderFormPage(form, language));
        } catch (error) {
            console.error('❌ [GET /form/:slug] Erro:', error);
            res.status(500).send('Erro ao carregar formulário');
        }
    });

    /**
     * GET /form-redirect/:oldSlug
     * Redirecionar de slug antigo para novo
     */
    app.get('/form-redirect/:oldSlug', async (req, res) => {
        try {
            const { oldSlug } = req.params;
            
            // Buscar primeiro
            const { data: redirect, error } = await supabase
                .from('event_form_slug_redirects')
                .select('*')
                .eq('old_slug', oldSlug)
                .single();
            
            if (error || !redirect) {
                return res.status(404).send('Redirecionamento não encontrado');
            }
            
            // Atualizar contador
            await supabase
                .from('event_form_slug_redirects')
                .update({
                    redirect_count: (redirect.redirect_count || 0) + 1,
                    last_redirect_at: new Date().toISOString()
                })
                .eq('old_slug', oldSlug);
            
            res.redirect(301, `/form/${redirect.new_slug}`);
        } catch (error) {
            console.error('❌ [GET /form-redirect/:oldSlug] Erro:', error);
            res.status(500).send('Erro ao redirecionar');
        }
    });

    // ==========================================
    // HELPER: Renderizar página HTML do formulário
    // ==========================================
    
    function renderFormPage(form, language) {
        const title = form.form_title_translations?.[language] || form.form_title_translations?.pt || 'Formulário';
        const description = form.form_description_translations?.[language] || form.form_description_translations?.pt || '';
        
        return `<!DOCTYPE html>
<html lang="${language}" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="/kromi-design-system.css">
    <link rel="stylesheet" href="/kromi-layout-fixes.css">
    <style>
        body {
            background: var(--bg-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-family-base);
            margin: 0;
            padding: var(--spacing-5);
        }
        .form-container {
            background: var(--bg-secondary);
            border-radius: var(--radius-2xl);
            box-shadow: var(--shadow-2xl);
            padding: var(--spacing-10);
            width: 100%;
            max-width: 700px;
            border: 1px solid var(--border-color);
        }
        .form-header {
            text-align: center;
            margin-bottom: var(--spacing-8);
        }
        .form-logo {
            margin-bottom: var(--spacing-4);
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .form-logo img {
            max-width: 250px;
            max-height: 70px;
        }
        .form-header h1 {
            color: var(--primary);
            margin: 0 0 var(--spacing-3) 0;
            font-size: var(--font-size-3xl);
            font-weight: var(--font-weight-bold);
            text-shadow: 0 2px 10px rgba(252, 107, 3, 0.3);
        }
        .form-header p {
            color: var(--text-secondary);
            font-size: var(--font-size-lg);
            margin: 0;
            line-height: 1.6;
        }
        .form-body {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-5);
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-2);
        }
        .form-label {
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold);
            font-size: var(--font-size-sm);
        }
        .required-mark {
            color: var(--danger);
            font-weight: var(--font-weight-bold);
        }
        .form-input,
        .form-select,
        .form-textarea {
            padding: var(--spacing-4);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-lg);
            font-size: var(--font-size-base);
            transition: all var(--transition-base);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: var(--font-family-base);
            width: 100%;
            box-sizing: border-box;
        }
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
            outline: none;
            border-color: var(--primary);
            background: var(--bg-secondary);
            box-shadow: var(--shadow-primary);
        }
        .form-textarea {
            resize: vertical;
            min-height: 120px;
        }
        .form-help {
            margin-top: var(--spacing-1);
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            line-height: 1.5;
        }
        .submit-btn {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            border: none;
            padding: var(--spacing-4) var(--spacing-6);
            border-radius: var(--radius-lg);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            transition: all var(--transition-base);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: var(--spacing-6);
            width: 100%;
        }
        .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: var(--shadow-primary-lg);
        }
        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .error-message {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            padding: var(--spacing-4);
            border-radius: var(--radius-lg);
            margin-bottom: var(--spacing-4);
        }
        .success-message {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #22c55e;
            padding: var(--spacing-4);
            border-radius: var(--radius-lg);
            margin-bottom: var(--spacing-4);
            text-align: center;
        }
        .radio-group,
        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-3);
        }
        .radio-option,
        .checkbox-option {
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
            padding: var(--spacing-3);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-lg);
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        .radio-option:hover,
        .checkbox-option:hover {
            border-color: var(--primary);
            background: rgba(252, 107, 3, 0.05);
        }
        .radio-option input,
        .checkbox-option input {
            width: auto;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <div class="form-header">
            <div class="form-logo" id="logoContainer">
                <!-- Logo carregado via JS -->
            </div>
            <h1>${title}</h1>
            ${description ? `<p>${description}</p>` : ''}
        </div>
        <div id="messageContainer"></div>
        <form id="dynamicForm" data-form-id="${form.id}" class="form-body">
            <div id="formFields">
                <!-- Campos serão carregados via JS -->
            </div>
            <button type="submit" class="submit-btn" id="submitBtn">
                ${language === 'en' ? 'Submit' : 'Submeter'}
            </button>
        </form>
    </div>
    
    <script src="/form-public.js?v=1.0.0"></script>
    
    <script>
        // Carregar logo monocromático
        (async function() {
            try {
                const response = await fetch('/api/branding/logo/secondary/horizontal');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data && data.data.url) {
                        const img = document.createElement('img');
                        img.src = data.data.url;
                        img.alt = 'Kromi.online';
                        img.style.cssText = 'max-width: 250px; max-height: 70px; width: auto; height: auto; filter: brightness(1.2);';
                        document.getElementById('logoContainer').appendChild(img);
                        console.log('✅ Logo monocromático carregado');
                        return;
                    }
                }
                throw new Error('Logo não encontrado');
            } catch (err) {
                console.log('ℹ️ Usando texto Kromi.online');
                document.getElementById('logoContainer').innerHTML = '<h2 style="color: var(--text-primary); margin: 0; font-size: 28px; font-weight: 700;">Kromi.online</h2>';
            }
        })();
        
        // Carregar campos do formulário
        fetch('/api/forms/${form.id}/fields')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const fieldsContainer = document.getElementById('formFields');
                    data.fields.forEach(field => {
                        renderField(field, fieldsContainer);
                    });
                }
            });
    </script>
</body>
</html>`;
    }

    console.log('✅ Rotas de Form Builder carregadas:');
    console.log('   GET    /api/forms/catalog');
    console.log('   POST   /api/forms/catalog');
    console.log('   GET    /api/events/:eventId/forms');
    console.log('   POST   /api/events/:eventId/forms');
    console.log('   GET    /api/forms/:formId');
    console.log('   PUT    /api/forms/:formId');
    console.log('   POST   /api/forms/:formId/publish');
    console.log('   DELETE /api/forms/:formId');
    console.log('   GET    /api/forms/:formId/fields');
    console.log('   POST   /api/forms/:formId/fields');
    console.log('   PUT    /api/forms/:formId/fields/:fieldId');
    console.log('   POST   /api/forms/:formId/fields/reorder');
    console.log('   DELETE /api/forms/:formId/fields/:fieldId');
};

