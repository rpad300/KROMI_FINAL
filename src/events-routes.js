/**
 * ==========================================
 * EVENTS ROUTES - Kromi.online
 * ==========================================
 * 
 * Endpoints REST para gestão de eventos
 * Autenticação via cookies HttpOnly (server-side)
 * 
 * Versão: 1.0
 * Data: 2025-10-26
 * ==========================================
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = function(app, sessionManager, supabaseAdmin = null, auditLogger = null) {
    console.log('📋 Carregando rotas de eventos...');

    // Inicializar cliente Supabase
    // Tentar usar service role primeiro, caso contrário usar anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
        console.error('❌ NEXT_PUBLIC_SUPABASE_URL não configurado');
        return;
    }

    // Usar service role se disponível, senão usar anon key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    
    if (!supabaseKey) {
        console.error('❌ Nenhuma chave Supabase configurada');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        db: {
            schema: 'public'
        },
        global: {
            headers: supabaseServiceKey ? {
                // Service role bypassa RLS automaticamente
                'apikey': supabaseServiceKey
            } : {}
        }
    });

    // Usar supabaseAdmin passado como parâmetro ou criar novo se tiver service key
    const adminClient = supabaseAdmin || (supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null);

    if (supabaseServiceKey || supabaseAdmin) {
        console.log('✅ Cliente Supabase (service role) inicializado para eventos - RLS bypassed');
    } else {
        console.log('⚠️ Cliente Supabase (anon key) inicializado para eventos - RLS ATIVO');
        console.log('⚠️ IMPORTANTE: Com anon key, RLS policies podem bloquear queries!');
    }

    // ==========================================
    // Middleware: Verificar autenticação
    // ==========================================
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
        
        // Adicionar sessão ao request para usar nos handlers
        req.userSession = session;
        next();
    }

    // ==========================================
    // Middleware: Verificar role (admin/moderator)
    // ==========================================
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

    // ==========================================
    // GET /api/events/list
    // Listar eventos com escopo por role
    // Acesso: admin (todos), moderator (próprios), event_manager (próprios), user (próprios)
    // ==========================================
    app.get('/api/events/list', requireAuth, requireRole(['admin', 'moderator', 'event_manager', 'user']), async (req, res) => {
        try {
            const userEmail = req.userSession.userProfile.email;
            const userRole = req.userSession.userProfile.role;
            const userId = req.userSession.userId;
            
            console.log('📋 [GET /api/events/list] Utilizador:', userEmail, 'Role:', userRole, 'ID:', userId);
            
            // Construir query com escopo baseado no role
            let query = supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });
            
            // ADMIN: vê TODOS os eventos (sem filtro)
            if (userRole === 'admin') {
                console.log('👑 [GET /api/events/list] Admin - sem filtros (vê tudo)');
                // Sem filtro adicional - vê tudo
            }
            // MODERATOR/EVENT_MANAGER/USER: vê APENAS seus eventos
            else if (userRole === 'moderator' || userRole === 'event_manager' || userRole === 'user') {
                console.log('🔐 [GET /api/events/list] Moderator/Event Manager/User - filtrando por eventos do utilizador:', userId);
                // Tentar vários campos possíveis para encontrar eventos do utilizador
                query = query.or(`organizer_id.eq.${userId},created_by.eq.${userId},created_by.eq.${userEmail}`);
            }
            // Outros roles: sem acesso (já bloqueado pelo requireRole, mas double-check)
            else {
                console.warn('⚠️ [GET /api/events/list] Role não reconhecido:', userRole);
                return res.status(403).json({
                    success: false,
                    error: 'Sem permissão para listar eventos',
                    code: 'FORBIDDEN',
                    role: userRole
                });
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ [GET /api/events/list] Erro Supabase:', error);
                
                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'SUPABASE_ERROR',
                    details: error
                });
            }
            
            console.log(`✅ [GET /api/events/list] ${data?.length || 0} evento(s) retornado(s) para ${userRole}`);
            if (data && data.length > 0) {
                console.log('📊 [GET /api/events/list] Primeiro evento:', {
                    id: data[0].id,
                    name: data[0].name,
                    organizer_id: data[0].organizer_id
                });
            }
            
            res.json({
                success: true,
                events: data || [],
                count: data?.length || 0,
                scope: userRole === 'admin' ? 'all' : 'own'
            });
            
        } catch (error) {
            console.error('❌ [GET /api/events/list] Exceção:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/stats
    // Estatísticas gerais (eventos, dispositivos, detecções, participantes, classificações)
    // Acesso: admin (todos), moderator/event_manager/user (apenas seus eventos)
    // ==========================================
    app.get('/api/events/stats', requireAuth, requireRole(['admin', 'moderator', 'event_manager', 'user']), async (req, res) => {
        try {
            const userEmail = req.userSession.userProfile.email;
            const userRole = req.userSession.userProfile.role;
            const userId = req.userSession.userId;
            
            console.log('📊 [GET /api/events/stats] Utilizador:', userEmail, 'Role:', userRole, 'ID:', userId);
            
            // Calcular início do dia (para detecções hoje)
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startISO = startOfDay.toISOString();
            
            // ADMIN: vê TODOS os dados (sem filtro)
            // OUTROS: vê APENAS dados dos seus eventos
            let userEventIds = null;
            
            if (userRole !== 'admin') {
                // Buscar IDs dos eventos do utilizador
                // Tentar vários campos possíveis: organizer_id (UUID), created_by (TEXT ou UUID), manager_id (UUID)
                let userEvents = [];
                
                // Estratégia: tentar organizer_id primeiro (campo mais comum)
                const { data: eventsByOrganizer, error: err1 } = await supabase
                    .from('events')
                    .select('id')
                    .eq('is_active', true)
                    .eq('organizer_id', userId);
                
                if (!err1 && eventsByOrganizer) {
                    userEvents = eventsByOrganizer;
                }
                
                // Se não encontrou, tentar created_by como UUID
                if (userEvents.length === 0) {
                    const { data: eventsByCreated, error: err2 } = await supabase
                        .from('events')
                        .select('id')
                        .eq('is_active', true)
                        .eq('created_by', userId);
                    
                    if (!err2 && eventsByCreated) {
                        userEvents = eventsByCreated;
                    }
                }
                
                // Se ainda não encontrou, tentar created_by como email (TEXT)
                if (userEvents.length === 0) {
                    const { data: eventsByEmail, error: err3 } = await supabase
                        .from('events')
                        .select('id')
                        .eq('is_active', true)
                        .eq('created_by', userEmail);
                    
                    if (!err3 && eventsByEmail) {
                        userEvents = eventsByEmail;
                    }
                }
                
                // Se ainda não encontrou, tentar manager_id
                if (userEvents.length === 0) {
                    const { data: eventsByManager, error: err4 } = await supabase
                        .from('events')
                        .select('id')
                        .eq('is_active', true)
                        .eq('manager_id', userId);
                    
                    if (!err4 && eventsByManager) {
                        userEvents = eventsByManager;
                    }
                }
                
                // Remover duplicados (caso algum evento tenha múltiplos campos)
                userEventIds = [...new Set(userEvents.map(e => e.id))];
                
                console.log('🔐 [GET /api/events/stats] Eventos do utilizador encontrados:', userEventIds.length, userEventIds);
                
                // Se não tem eventos, retornar zeros
                if (userEventIds.length === 0) {
                    console.log('⚠️ [GET /api/events/stats] Utilizador não tem eventos, retornando zeros');
                    return res.json({
                        success: true,
                        stats: {
                            totalEvents: 0,
                            totalDevices: 0,
                            totalDetections: 0,
                            totalDetectionsToday: 0,
                            totalParticipants: 0,
                            totalClassifications: 0
                        }
                    });
                }
            }
            
            // Construir queries baseadas no role
            let eventsQuery = supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_active', true);
            let devicesQuery = supabase.from('devices').select('*', { count: 'exact', head: true });
            let detectionsQuery = supabase.from('detections').select('*', { count: 'exact', head: true });
            let detectionsTodayQuery = supabase.from('detections').select('*', { count: 'exact', head: true }).gte('created_at', startISO);
            let participantsQuery = supabase.from('participants').select('*', { count: 'exact', head: true });
            let classificationsQuery = supabase.from('classifications').select('*', { count: 'exact', head: true });
            
            // Se não é admin, filtrar por event_id
            if (userRole !== 'admin' && userEventIds && userEventIds.length > 0) {
                eventsQuery = eventsQuery.in('id', userEventIds);
                detectionsQuery = detectionsQuery.in('event_id', userEventIds);
                detectionsTodayQuery = detectionsTodayQuery.in('event_id', userEventIds);
                participantsQuery = participantsQuery.in('event_id', userEventIds);
                classificationsQuery = classificationsQuery.in('event_id', userEventIds);
            }
            
            // Executar queries em paralelo
            const [eventsResult, devicesResult, detectionsResult, detectionsTodayResult, participantsResult, classificationsResult] = await Promise.all([
                eventsQuery,
                devicesQuery,
                detectionsQuery,
                detectionsTodayQuery,
                participantsQuery,
                classificationsQuery
            ]);
            
            const stats = {
                totalEvents: eventsResult.count || 0,
                totalDevices: devicesResult.count || 0,
                totalDetections: detectionsResult.count || 0,
                totalDetectionsToday: detectionsTodayResult.count || 0,
                totalParticipants: participantsResult.count || 0,
                totalClassifications: classificationsResult.count || 0
            };
            
            console.log('✅ [GET /api/events/stats] Estatísticas:', stats, userRole === 'admin' ? '(admin - todos)' : `(${userEventIds?.length || 0} eventos)`);
            
            res.json({
                success: true,
                stats
            });
            
        } catch (error) {
            console.error('❌ [GET /api/events/stats] Exceção:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro ao carregar estatísticas',
                code: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id
    // Detalhes de um evento específico
    // Acesso: admin, moderator
    // ==========================================
    app.get('/api/events/:id', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            
            console.log('📋 [GET /api/events/:id] ID:', eventId);
            
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Evento não encontrado',
                        code: 'NOT_FOUND'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'SUPABASE_ERROR'
                });
            }
            
            console.log('✅ [GET /api/events/:id] Evento encontrado:', data.name);
            
            res.json({
                success: true,
                event: data
            });
            
        } catch (error) {
            console.error('❌ [GET /api/events/:id] Exceção:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });

    // ==========================================
    // POST /api/events/create
    // Criar novo evento
    // Acesso: admin, moderator, user (promovido para moderator após criar)
    // ==========================================
    app.post('/api/events/create', requireAuth, requireRole(['admin', 'moderator', 'user']), async (req, res) => {
        try {
            const { name, description, event_date, location } = req.body;
            
            console.log('📝 [POST /api/events/create] Criando evento:', name);
            console.log('👤 [POST /api/events/create] Por:', req.userSession.userProfile.email);
            
            // Validação básica
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do evento é obrigatório',
                    code: 'VALIDATION_ERROR',
                    field: 'name'
                });
            }
            
            const userRole = req.userSession.userProfile.role;
            const userId = req.userSession.userId;
            
            // Preparar dados do evento
            const eventData = {
                name: name.trim(),
                description: description?.trim() || null,
                event_date: event_date || null,
                location: location?.trim() || null,
                status: 'active',
                created_by: userId
            };
            
            // Tentar adicionar organizer_id se o campo existir
            // O Supabase vai ignorar campos que não existem na tabela
            eventData.organizer_id = userId;
            
            const { data, error } = await supabase
                .from('events')
                .insert([eventData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ [POST /api/events/create] Erro Supabase:', error);
                
                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'SUPABASE_ERROR',
                    details: error
                });
            }
            
            console.log('✅ [POST /api/events/create] Evento criado:', data.id);
            
            // Se o utilizador é 'user', promovê-lo para 'moderator' após criar o primeiro evento
            if (userRole === 'user' && adminClient) {
                try {
                    console.log('🔄 [POST /api/events/create] Promovendo utilizador de "user" para "moderator":', userId);
                    
                    const { data: updatedProfile, error: updateError } = await adminClient
                        .from('user_profiles')
                        .update({ 
                            role: 'moderator',
                            profile_type: 'event_manager', // Manter compatibilidade
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .select()
                        .single();
                    
                    if (updateError) {
                        console.error('⚠️ [POST /api/events/create] Erro ao atualizar role do utilizador:', updateError);
                        // Não bloquear a criação do evento se falhar a atualização do role
                    } else {
                        console.log('✅ [POST /api/events/create] Utilizador promovido para moderator:', updatedProfile.id);
                        
                        // Atualizar a sessão também
                        if (req.userSession && req.userSession.userProfile) {
                            req.userSession.userProfile.role = 'moderator';
                            req.userSession.userProfile.profile_type = 'event_manager';
                        }
                        
                        // Log de auditoria se disponível
                        if (auditLogger) {
                            auditLogger.log('USER_ROLE_UPDATED', userId, {
                                old_role: 'user',
                                new_role: 'moderator',
                                reason: 'first_event_created',
                                event_id: data.id,
                                event_name: name.trim()
                            });
                        }
                    }
                } catch (promotionError) {
                    console.error('⚠️ [POST /api/events/create] Exceção ao promover utilizador:', promotionError);
                    // Não bloquear a criação do evento
                }
            }
            
            res.status(201).json({
                success: true,
                event: data,
                message: userRole === 'user' ? 'Evento criado com sucesso! Agora é moderator e pode gerir os seus eventos.' : 'Evento criado com sucesso',
                roleUpdated: userRole === 'user'
            });
            
        } catch (error) {
            console.error('❌ [POST /api/events/create] Exceção:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro ao criar evento',
                code: 'INTERNAL_ERROR',
                message: error.message
            });
        }
    });

    // ==========================================
    // PUT /api/events/:id
    // Editar evento existente
    // Acesso: admin, moderator
    // ==========================================
    app.put('/api/events/:id', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            const { name, description, event_date, location, status } = req.body;
            
            console.log('✏️ [PUT /api/events/:id] Editando evento:', eventId);
            
            // Validação básica
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do evento é obrigatório',
                    code: 'VALIDATION_ERROR'
                });
            }
            
            const updateData = {
                name: name.trim(),
                description: description?.trim() || null,
                event_date: event_date || null,
                location: location?.trim() || null,
                status: status || 'active',
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('events')
                .update(updateData)
                .eq('id', eventId)
                .select()
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Evento não encontrado',
                        code: 'NOT_FOUND'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'SUPABASE_ERROR'
                });
            }
            
            console.log('✅ [PUT /api/events/:id] Evento atualizado:', data.name);
            
            res.json({
                success: true,
                event: data,
                message: 'Evento atualizado com sucesso'
            });
            
        } catch (error) {
            console.error('❌ [PUT /api/events/:id] Exceção:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar evento',
                code: 'INTERNAL_ERROR'
            });
        }
    });

    // ==========================================
    // DELETE /api/events/:id
    // Apagar evento
    // Acesso: apenas admin
    // ==========================================
    app.delete('/api/events/:id', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const eventId = req.params.id;
            
            console.log('🗑️ [DELETE /api/events/:id] Apagando evento:', eventId);
            console.log('👤 [DELETE /api/events/:id] Por:', req.userSession.userProfile.email);
            
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);
            
            if (error) {
                console.error('❌ [DELETE /api/events/:id] Erro Supabase:', error);
                
                return res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'SUPABASE_ERROR'
                });
            }
            
            console.log('✅ [DELETE /api/events/:id] Evento apagado');
            
            res.json({
                success: true,
                message: 'Evento apagado com sucesso'
            });
            
        } catch (error) {
            console.error('❌ [DELETE /api/events/:id] Exceção:', error);
            
            res.status(500).json({
                success: false,
                error: 'Erro ao apagar evento',
                code: 'INTERNAL_ERROR'
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/stats
    // Estatísticas de um evento específico
    // Acesso: admin, moderator, event_manager
    // ==========================================
    app.get('/api/events/:id/stats', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const eventId = req.params.id;
            console.log('📊 [GET /api/events/:id/stats] Evento:', eventId);
            
            const [participants, detections, classifications] = await Promise.all([
                supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
                supabase.from('detections').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
                supabase.from('classifications').select('*', { count: 'exact', head: true }).eq('event_id', eventId)
            ]);
            
            const stats = {
                totalParticipants: participants.count || 0,
                totalDetections: detections.count || 0,
                totalClassifications: classifications.count || 0
            };
            
            console.log('✅ [GET /api/events/:id/stats] Stats:', stats);
            
            res.json({ success: true, stats });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/stats] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // POST /api/events/:id/reset
    // Reset completo de evento (deletar classificações, detecções, imagens)
    // Acesso: apenas admin
    // ==========================================
    app.post('/api/events/:id/reset', requireAuth, requireRole(['admin']), async (req, res) => {
        try {
            const eventId = req.params.id;
            console.log('🗑️ [POST /api/events/:id/reset] Resetando evento:', eventId);
            console.log('👤 [POST /api/events/:id/reset] Por:', req.userSession.userProfile.email);
            
            // Deletar dados do evento em paralelo
            const [classRes, detRes, bufferRes] = await Promise.all([
                supabase.from('classifications').delete().eq('event_id', eventId),
                supabase.from('detections').delete().eq('event_id', eventId),
                supabase.from('image_buffer').delete().eq('event_id', eventId)
            ]);
            
            // Verificar resultados
            const counts = {
                classifications: classRes.count || 0,
                detections: detRes.count || 0,
                images: bufferRes.count || 0
            };
            
            console.log('✅ [POST /api/events/:id/reset] Evento resetado:', counts);
            
            res.json({
                success: true,
                message: 'Evento resetado com sucesso',
                deletedCounts: counts
            });
        } catch (error) {
            console.error('❌ [POST /api/events/:id/reset] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/participants
    // Lista participantes de um evento
    // Acesso: admin, moderator, event_manager
    // ==========================================
    app.get('/api/events/:id/participants', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const eventId = req.params.id;
            console.log('👥 [GET /api/events/:id/participants] Evento:', eventId);
            
            const { data, error } = await supabase
                .from('participants')
                .select('*')
                .eq('event_id', eventId)
                .order('bib_number', { ascending: true });
            
            if (error) throw error;
            
            console.log(`✅ [GET /api/events/:id/participants] ${data?.length || 0} participantes`);
            
            res.json({
                success: true,
                participants: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/participants] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/detections
    // Lista detecções de um evento
    // Acesso: admin, moderator, event_manager
    // ==========================================
    app.get('/api/events/:id/detections', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
        try {
            const eventId = req.params.id;
            console.log('📱 [GET /api/events/:id/detections] Evento:', eventId);
            
            const { data, error } = await supabase
                .from('detections')
                .select('*')
                .eq('event_id', eventId)
                .order('detected_at', { ascending: false });
            
            if (error) throw error;
            
            console.log(`✅ [GET /api/events/:id/detections] ${data?.length || 0} detecções`);
            
            res.json({
                success: true,
                detections: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/detections] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/classifications
    // Lista classificações de um evento
    // Acesso: todos autenticados
    // ==========================================
    app.get('/api/events/:id/classifications', requireAuth, async (req, res) => {
        try {
            const eventId = req.params.id;
            console.log('🏆 [GET /api/events/:id/classifications] Evento:', eventId);
            
            const { data, error } = await supabase
                .from('classifications')
                .select('*')
                .eq('event_id', eventId)
                .order('position', { ascending: true });
            
            if (error) throw error;
            
            console.log(`✅ [GET /api/events/:id/classifications] ${data?.length || 0} classificações`);
            
            res.json({
                success: true,
                classifications: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/classifications] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    console.log('✅ Rotas de eventos carregadas:');
    console.log('   GET    /api/events/list');
    console.log('   GET    /api/events/stats');
    console.log('   GET    /api/events/:id');
    console.log('   GET    /api/events/:id/stats');
    console.log('   GET    /api/events/:id/participants');
    console.log('   GET    /api/events/:id/detections');
    console.log('   GET    /api/events/:id/classifications');
    console.log('   POST   /api/events/create');
    console.log('   PUT    /api/events/:id');
    console.log('   POST   /api/events/:id/reset');
    console.log('   DELETE /api/events/:id');
};

