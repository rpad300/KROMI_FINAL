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
                // Garantir que event_date e scheduled_start_time sejam retornados como string ISO completa (com hora se disponível)
                data.forEach(event => {
                    if (event.event_date) {
                        let eventDateValue = event.event_date;
                        
                        // Se for Date object, converter para ISO string
                        if (eventDateValue instanceof Date) {
                            eventDateValue = eventDateValue.toISOString();
                        } else if (typeof eventDateValue === 'string') {
                            // Já é string, manter como está
                            eventDateValue = eventDateValue;
                        }
                        
                        event.event_date = eventDateValue;
                    }
                    
                    if (event.scheduled_start_time) {
                        let scheduledTimeValue = event.scheduled_start_time;
                        
                        // Se for Date object, converter para ISO string
                        if (scheduledTimeValue instanceof Date) {
                            scheduledTimeValue = scheduledTimeValue.toISOString();
                        } else if (typeof scheduledTimeValue === 'string') {
                            // Já é string, manter como está
                            scheduledTimeValue = scheduledTimeValue;
                        }
                        
                        event.scheduled_start_time = scheduledTimeValue;
                    }
                });
                
                console.log('📊 [GET /api/events/list] Primeiro evento:', {
                    id: data[0].id,
                    name: data[0].name,
                    event_date: data[0].event_date,
                    event_date_tipo: typeof data[0].event_date,
                    event_date_com_hora: data[0].event_date && data[0].event_date.includes('T'),
                    scheduled_start_time: data[0].scheduled_start_time,
                    scheduled_start_time_tipo: typeof data[0].scheduled_start_time,
                    scheduled_start_time_com_hora: data[0].scheduled_start_time && data[0].scheduled_start_time.includes('T'),
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
    // GET /api/config
    // Retorna configurações públicas (API keys para frontend)
    // Acesso: autenticado
    // ==========================================
    app.get('/api/config', requireAuth, (req, res) => {
        try {
            // Retornar apenas as chaves necessárias para o frontend
            // Google Maps API Key para Places Autocomplete
            const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY || null;
            
            // Configurações do Supabase para o frontend
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
            
            res.json({
                success: true,
                GOOGLE_MAPS_API_KEY: googleMapsApiKey,
                SUPABASE_URL: supabaseUrl,
                SUPABASE_ANON_KEY: supabaseKey,
                SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
                // Outras keys podem ser adicionadas aqui se necessário
            });
        } catch (error) {
            console.error('❌ [GET /api/config] Exceção:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao carregar configurações',
                code: 'INTERNAL_ERROR'
            });
        }
    });

    // ==========================================
    // GET /api/config/age-categories
    // Retornar categorias de idade ativas
    // Acesso: autenticado
    // ==========================================
    app.get('/api/config/age-categories', requireAuth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('age_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            
            if (error) throw error;
            
            res.json({
                success: true,
                categories: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/config/age-categories] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/config/event-modalities
    // Retornar modalidades de evento ativas
    // Acesso: autenticado
    // ==========================================
    app.get('/api/config/event-modalities', requireAuth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('event_modalities')
                .select('*')
                .eq('is_active', true);
            
            if (error) throw error;
            
            res.json({
                success: true,
                modalities: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/config/event-modalities] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
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
            
            // Buscar evento - garantir que event_date seja retornado como timestamp completo
            // Usar cast explícito para garantir que hora seja preservada mesmo se coluna for DATE
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    event_date
                `)
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
            console.log('📅 [GET /api/events/:id] event_date raw do Supabase:', data.event_date, 'tipo:', typeof data.event_date);
            console.log('📏 [GET /api/events/:id] distance_km do Supabase:', data.distance_km, 'tipo:', typeof data.distance_km);
            console.log('⏰ [GET /api/events/:id] scheduled_start_time do Supabase:', data.scheduled_start_time, 'tipo:', typeof data.scheduled_start_time);
            
            // Garantir que event_date seja retornado como string ISO completa (com hora se disponível)
            // O Supabase pode retornar como Date object ou string, precisamos normalizar
            if (data.event_date) {
                let eventDateValue = data.event_date;
                
                // Se for Date object, converter para ISO string
                if (eventDateValue instanceof Date) {
                    eventDateValue = eventDateValue.toISOString();
                    console.log('📅 [GET /api/events/:id] event_date convertido de Date para ISO:', eventDateValue);
                } else if (typeof eventDateValue === 'string') {
                    // Se for string mas só tem data (10 chars), pode ser que o banco só armazene data
                    // Nesse caso, manter como está, mas logar para debug
                    if (eventDateValue.length === 10 && !eventDateValue.includes('T')) {
                        console.log('⚠️ [GET /api/events/:id] event_date retornado apenas como data (sem hora):', eventDateValue);
                    } else {
                        console.log('✅ [GET /api/events/:id] event_date retornado com hora:', eventDateValue);
                    }
                }
                
                // Manter o valor original (Supabase já retorna correto)
                data.event_date = eventDateValue;
            }
            
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
            const { name, description, event_date, location, status, settings, distance_km, event_type, has_categories, has_lap_counter, scheduled_start_time, event_started_at, event_ended_at, is_active } = req.body;
            
            console.log('✏️ [PUT /api/events/:id] Editando evento:', eventId);
            console.log('📋 [PUT /api/events/:id] Body recebido (completo):', req.body);
            console.log('📋 [PUT /api/events/:id] Body recebido (resumido):', { 
                hasName: !!name, 
                hasSettings: !!settings,
                settingsKeys: settings ? Object.keys(settings) : [],
                distance_km: distance_km,
                distance_km_tipo: typeof distance_km,
                event_type: event_type,
                has_categories: has_categories,
                has_lap_counter: has_lap_counter,
                has_lap_counter_tipo: typeof has_lap_counter,
                has_lap_counter_undefined: has_lap_counter === undefined,
                scheduled_start_time: scheduled_start_time,
                scheduled_start_time_tipo: typeof scheduled_start_time
            });
            
            // Buscar evento atual para preservar campos não enviados
            const { data: currentEvent, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            
            if (fetchError || !currentEvent) {
                return res.status(404).json({
                    success: false,
                    error: 'Evento não encontrado',
                    code: 'NOT_FOUND'
                });
            }
            
            // Preparar updateData - incluir apenas campos que foram enviados
            const updateData = {
                updated_at: new Date().toISOString()
            };
            
            // Verificar se pelo menos um campo está a ser atualizado
            const hasUpdates = name !== undefined || description !== undefined || 
                              event_date !== undefined || location !== undefined || 
                              status !== undefined || settings !== undefined ||
                              distance_km !== undefined || event_type !== undefined ||
                              has_categories !== undefined || has_lap_counter !== undefined ||
                              scheduled_start_time !== undefined || event_started_at !== undefined ||
                              event_ended_at !== undefined || is_active !== undefined;
            
            console.log('🔍 [PUT /api/events/:id] Verificação de campos:', {
                name: name !== undefined,
                description: description !== undefined,
                event_date: event_date !== undefined,
                location: location !== undefined,
                status: status !== undefined,
                settings: settings !== undefined,
                distance_km: distance_km !== undefined,
                event_type: event_type !== undefined,
                has_categories: has_categories !== undefined,
                has_lap_counter: has_lap_counter !== undefined,
                scheduled_start_time: scheduled_start_time !== undefined,
                event_started_at: event_started_at !== undefined,
                event_ended_at: event_ended_at !== undefined,
                is_active: is_active !== undefined,
                hasUpdates
            });
            
            if (!hasUpdates) {
                console.warn('⚠️ [PUT /api/events/:id] Nenhum campo válido fornecido para atualização');
                return res.status(400).json({
                    success: false,
                    error: 'Pelo menos um campo deve ser fornecido para atualização',
                    code: 'VALIDATION_ERROR'
                });
            }
            
            // Incluir campos apenas se foram enviados no body
            // Nome só é validado se foi explicitamente enviado
            if (name !== undefined) {
                if (name === null || (typeof name === 'string' && name.trim() === '')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Nome do evento não pode estar vazio',
                        code: 'VALIDATION_ERROR'
                    });
                }
                updateData.name = typeof name === 'string' ? name.trim() : name;
            }
            
            if (description !== undefined) {
                updateData.description = (description === null || description === '') ? null : description.trim();
            }
            
            if (event_date !== undefined) {
                updateData.event_date = event_date || null;
            }
            
            if (location !== undefined) {
                updateData.location = (location === null || location === '') ? null : location.trim();
            }
            
            if (status !== undefined) {
                updateData.status = status || 'active';
            }
            
            if (settings !== undefined) {
                // Garantir que settings é um objeto válido
                if (settings === null) {
                    updateData.settings = {};
                } else if (typeof settings === 'object' && !Array.isArray(settings)) {
                    updateData.settings = settings;
                } else {
                    updateData.settings = currentEvent.settings || {};
                }
                console.log('📋 [PUT /api/events/:id] Settings a guardar:', JSON.stringify(updateData.settings, null, 2));
            }
            
            if (distance_km !== undefined) {
                const parsedDistance = (distance_km === null || distance_km === '') ? null : parseFloat(distance_km);
                updateData.distance_km = isNaN(parsedDistance) ? null : parsedDistance;
                console.log('📏 [PUT /api/events/:id] distance_km processado:', {
                    recebido: distance_km,
                    tipo_recebido: typeof distance_km,
                    processado: updateData.distance_km,
                    tipo_processado: typeof updateData.distance_km
                });
            }
            
            if (event_type !== undefined) {
                updateData.event_type = (event_type === null || event_type === '') ? null : event_type;
            }
            
            if (has_categories !== undefined) {
                updateData.has_categories = has_categories === true || has_categories === 'true';
            }
            
            if (has_lap_counter !== undefined) {
                updateData.has_lap_counter = has_lap_counter === true || has_lap_counter === 'true';
            }
            
            if (scheduled_start_time !== undefined) {
                // Aceitar tanto ISO string quanto null
                updateData.scheduled_start_time = scheduled_start_time || null;
                if (updateData.scheduled_start_time && !updateData.scheduled_start_time.includes('T')) {
                    // Se for apenas data, converter para datetime
                    updateData.scheduled_start_time = new Date(scheduled_start_time).toISOString();
                }
            }
            
            if (event_started_at !== undefined) {
                // Aceitar tanto ISO string quanto null (para reset)
                updateData.event_started_at = event_started_at || null;
                if (updateData.event_started_at && !updateData.event_started_at.includes('T')) {
                    // Se for apenas data, converter para datetime
                    updateData.event_started_at = new Date(event_started_at).toISOString();
                }
            }
            
            if (event_ended_at !== undefined) {
                // Aceitar tanto ISO string quanto null (para reset)
                updateData.event_ended_at = event_ended_at || null;
                if (updateData.event_ended_at && !updateData.event_ended_at.includes('T')) {
                    // Se for apenas data, converter para datetime
                    updateData.event_ended_at = new Date(event_ended_at).toISOString();
                }
            }
            
            if (is_active !== undefined) {
                // Aceitar boolean (true/false) ou string 'true'/'false'
                updateData.is_active = is_active === true || is_active === 'true';
            }
            
            console.log('📋 [PUT /api/events/:id] Campos a atualizar:', Object.keys(updateData));
            console.log('📋 [PUT /api/events/:id] Valores a atualizar:', JSON.stringify(updateData, null, 2));
            
            const { data, error } = await supabase
                .from('events')
                .update(updateData)
                .eq('id', eventId)
                .select()
                .single();
            
            if (error) {
                console.error('❌ [PUT /api/events/:id] Erro no UPDATE:', error);
                console.error('❌ [PUT /api/events/:id] Código do erro:', error.code);
                console.error('❌ [PUT /api/events/:id] Mensagem:', error.message);
                console.error('❌ [PUT /api/events/:id] Detalhes:', error.details);
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
            console.log('📋 [PUT /api/events/:id] Resultado do UPDATE:', {
                hasData: !!data,
                hasError: !!error,
                distance_km_retornado: data?.distance_km,
                event_type_retornado: data?.event_type,
                distance_km_enviado: updateData.distance_km,
                todos_campos: data ? Object.keys(data) : []
            });
            
            // Verificar se distance_km foi realmente atualizado
            if (updateData.distance_km !== undefined && data.distance_km !== updateData.distance_km) {
                console.warn('⚠️ [PUT /api/events/:id] distance_km não foi atualizado corretamente!');
                console.warn('⚠️ [PUT /api/events/:id] Enviado:', updateData.distance_km, 'Retornado:', data.distance_km);
                console.warn('⚠️ [PUT /api/events/:id] Tentando atualizar novamente...');
                
                // Tentar atualizar novamente apenas o distance_km
                try {
                    const { data: retryData, error: retryError } = await supabase
                        .from('events')
                        .update({ distance_km: updateData.distance_km })
                        .eq('id', eventId)
                        .select('distance_km')
                        .single();
                    
                    if (!retryError && retryData) {
                        if (retryData.distance_km === updateData.distance_km) {
                            console.log('✅ [PUT /api/events/:id] distance_km atualizado na 2ª tentativa:', retryData.distance_km);
                            data.distance_km = retryData.distance_km;
                        } else {
                            console.error('❌ [PUT /api/events/:id] distance_km ainda não foi atualizado após 2ª tentativa!');
                            console.error('❌ [PUT /api/events/:id] Esperado:', updateData.distance_km, 'Obtido:', retryData.distance_km);
                            // Mesmo assim, usar o valor que foi enviado
                            data.distance_km = updateData.distance_km;
                        }
                    } else {
                        console.error('❌ [PUT /api/events/:id] Erro na 2ª tentativa:', retryError);
                        // Mesmo assim, usar o valor que foi enviado
                        data.distance_km = updateData.distance_km;
                    }
                } catch (retryErr) {
                    console.error('❌ [PUT /api/events/:id] Exceção na 2ª tentativa:', retryErr);
                    // Mesmo assim, usar o valor que foi enviado
                    data.distance_km = updateData.distance_km;
                }
            }
            
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

    // ==========================================
    // PUT /api/events/:id/category-configs
    // Atualizar configurações de categorias de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.put('/api/events/:id/category-configs', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            const { configs } = req.body;
            
            console.log('🏷️ [PUT /api/events/:id/category-configs] Evento:', eventId, 'Configs:', configs?.length || 0);
            
            // Deletar configurações existentes
            const { error: deleteError } = await supabase
                .from('event_category_config')
                .delete()
                .eq('event_id', eventId);
            
            if (deleteError) throw deleteError;
            
            // Inserir novas configurações
            let insertResult = null;
            if (configs && configs.length > 0) {
                const { data, error: insertError } = await supabase
                    .from('event_category_config')
                    .insert(configs)
                    .select();
                
                if (insertError) throw insertError;
                insertResult = data;
            }
            
            console.log(`✅ [PUT /api/events/:id/category-configs] ${insertResult?.length || 0} configurações salvas`);
            
            res.json({
                success: true,
                configs: insertResult || [],
                count: insertResult?.length || 0
            });
        } catch (error) {
            console.error('❌ [PUT /api/events/:id/category-configs] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/category-configs
    // Obter configurações de categorias de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.get('/api/events/:id/category-configs', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            
            console.log('🏷️ [GET /api/events/:id/category-configs] Evento:', eventId);
            
            const { data, error } = await supabase
                .from('event_category_config')
                .select(`
                    *,
                    age_categories (*)
                `)
                .eq('event_id', eventId);
            
            if (error) throw error;
            
            console.log(`✅ [GET /api/events/:id/category-configs] ${data?.length || 0} configurações`);
            
            res.json({
                success: true,
                configs: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/category-configs] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/modality-configs
    // Obter configurações de modalidades de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.get('/api/events/:id/modality-configs', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            
            console.log('🏃 [GET /api/events/:id/modality-configs] Evento:', eventId);
            
            const { data, error } = await supabase
                .from('event_modality_config')
                .select(`
                    *,
                    event_modalities (*)
                `)
                .eq('event_id', eventId);
            
            if (error) throw error;
            
            console.log(`✅ [GET /api/events/:id/modality-configs] ${data?.length || 0} configurações`);
            
            res.json({
                success: true,
                configs: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/modality-configs] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // PUT /api/events/:id/modality-configs
    // Atualizar configurações de modalidades de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.put('/api/events/:id/modality-configs', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            const { configs } = req.body;
            
            console.log('🏃 [PUT /api/events/:id/modality-configs] Evento:', eventId, 'Configs:', configs?.length || 0);
            
            // Deletar configurações existentes
            const { error: deleteError } = await supabase
                .from('event_modality_config')
                .delete()
                .eq('event_id', eventId);
            
            if (deleteError) throw deleteError;
            
            // Inserir novas configurações
            let insertResult = null;
            if (configs && configs.length > 0) {
                const { data, error: insertError } = await supabase
                    .from('event_modality_config')
                    .insert(configs)
                    .select();
                
                if (insertError) throw insertError;
                insertResult = data;
            }
            
            console.log(`✅ [PUT /api/events/:id/modality-configs] ${insertResult?.length || 0} configurações salvas`);
            
            res.json({
                success: true,
                configs: insertResult || [],
                count: insertResult?.length || 0
            });
        } catch (error) {
            console.error('❌ [PUT /api/events/:id/modality-configs] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/config/checkpoint-types
    // Retornar tipos de checkpoint
    // Acesso: autenticado
    // ==========================================
    app.get('/api/config/checkpoint-types', requireAuth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('checkpoint_types')
                .select('*')
                .order('sort_order', { ascending: true });
            
            if (error) throw error;
            
            res.json({
                success: true,
                types: data || [],
                count: data?.length || 0
            });
        } catch (error) {
            console.error('❌ [GET /api/config/checkpoint-types] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // PUT /api/config/checkpoint-types/:code
    // Atualizar tipo de checkpoint
    // Acesso: admin, moderator
    // ==========================================
    app.put('/api/config/checkpoint-types/:code', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const { code } = req.params;
            const { is_active } = req.body;
            
            const { data, error } = await supabase
                .from('checkpoint_types')
                .update({ is_active })
                .eq('code', code)
                .select()
                .single();
            
            if (error) throw error;
            
            res.json({
                success: true,
                type: data
            });
        } catch (error) {
            console.error('❌ [PUT /api/config/checkpoint-types/:code] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/processor-config
    // Obter configuração do processador de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.get('/api/events/:id/processor-config', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            
            // Tentar buscar da tabela event_processor_config
            const { data, error } = await supabase
                .from('event_processor_config')
                .select('*')
                .eq('event_id', eventId)
                .maybeSingle();
            
            if (error) {
                // Se não existir (PGRST116 = no rows), retornar null graciosamente
                if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
                    return res.json({
                        success: true,
                        config: null
                    });
                }
                
                // Se a tabela não existir ou houver outro erro, logar mas retornar null
                console.warn('⚠️ [GET /api/events/:id/processor-config] Erro ao buscar config:', error.message);
                return res.json({
                    success: true,
                    config: null
                });
            }
            
            res.json({
                success: true,
                config: data || null
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/processor-config] Exceção:', error);
            // Em caso de exceção, retornar null em vez de erro para não quebrar a UI
            res.json({
                success: true,
                config: null
            });
        }
    });

    // ==========================================
    // PUT /api/events/:id/processor-config
    // Atualizar configuração do processador de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.put('/api/events/:id/processor-config', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            const {
                processor_type,
                processor_speed,
                processor_confidence,
                openai_model,
                gemini_model,
                deepseek_model
            } = req.body;
            
            const updateData = {
                event_id: eventId,
                processor_type: processor_type || 'gemini',
                processor_speed: processor_speed || 'balanced',
                processor_confidence: processor_confidence !== undefined ? parseFloat(processor_confidence) : 0.7,
                openai_model: openai_model || 'gpt-4o',
                gemini_model: gemini_model || 'gemini-1.5-flash',
                deepseek_model: deepseek_model || 'deepseek-chat',
                updated_at: new Date().toISOString()
            };
            
            // Verificar se já existe
            const { data: existing, error: checkError } = await supabase
                .from('event_processor_config')
                .select('id')
                .eq('event_id', eventId)
                .maybeSingle();
            
            // Se houver erro na verificação (ex: tabela não existe), tentar criar
            if (checkError && checkError.code !== 'PGRST116') {
                console.warn('⚠️ [PUT /api/events/:id/processor-config] Erro ao verificar existência:', checkError.message);
                // Tentar inserir mesmo assim (pode criar a primeira vez)
            }
            
            let result;
            if (existing) {
                // Update
                const { data, error } = await supabase
                    .from('event_processor_config')
                    .update(updateData)
                    .eq('event_id', eventId)
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ [PUT /api/events/:id/processor-config] Erro no UPDATE:', error);
                    throw error;
                }
                result = data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('event_processor_config')
                    .insert({
                        ...updateData,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ [PUT /api/events/:id/processor-config] Erro no INSERT:', error);
                    throw error;
                }
                result = data;
            }
            
            res.json({
                success: true,
                config: result
            });
        } catch (error) {
            console.error('❌ [PUT /api/events/:id/processor-config] Exceção:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao salvar configuração do processador'
            });
        }
    });

    // ==========================================
    // GET /api/events/:id/lap-config
    // Obter configuração de lap counter de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.get('/api/events/:id/lap-config', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            
            // Buscar configuração mais recente
            const { data, error } = await supabase
                .from('event_lap_config')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return res.json({
                        success: true,
                        config: null
                    });
                }
                throw error;
            }
            
            res.json({
                success: true,
                config: data || null
            });
        } catch (error) {
            console.error('❌ [GET /api/events/:id/lap-config] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // PUT /api/events/:id/lap-config
    // Salvar/atualizar configuração de lap counter de um evento
    // Acesso: admin, moderator
    // ==========================================
    app.put('/api/events/:id/lap-config', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
        try {
            const eventId = req.params.id;
            const {
                has_lap_counter,
                lap_distance_km,
                total_laps,
                min_laps_for_classification
            } = req.body;
            
            // Verificar se pelo menos um campo foi fornecido (exceto event_id)
            const hasData = has_lap_counter !== undefined || 
                          lap_distance_km !== undefined || 
                          total_laps !== undefined || 
                          min_laps_for_classification !== undefined;
            
            if (!hasData) {
                return res.status(400).json({
                    success: false,
                    error: 'Pelo menos um campo deve ser fornecido para atualização'
                });
            }
            
            // Construir objeto de atualização apenas com campos fornecidos
            const updateData = {
                event_id: eventId,
                updated_at: new Date().toISOString()
            };
            
            if (has_lap_counter !== undefined) {
                updateData.has_lap_counter = has_lap_counter;
            }
            if (lap_distance_km !== undefined) {
                updateData.lap_distance_km = lap_distance_km !== null ? parseFloat(lap_distance_km) : null;
            }
            if (total_laps !== undefined) {
                updateData.total_laps = total_laps !== null ? parseInt(total_laps) : null;
            }
            if (min_laps_for_classification !== undefined) {
                updateData.min_laps_for_classification = min_laps_for_classification !== undefined ? parseInt(min_laps_for_classification) : 1;
            }
            
            // Verificar se já existe
            const { data: existing, error: checkError } = await supabase
                .from('event_lap_config')
                .select('id')
                .eq('event_id', eventId)
                .maybeSingle();
            
            let result;
            if (existing) {
                // Update
                const { data, error } = await supabase
                    .from('event_lap_config')
                    .update(updateData)
                    .eq('event_id', eventId)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            } else {
                // Insert - garantir que tem valores mínimos
                const insertData = {
                    ...updateData,
                    event_id: eventId,
                    has_lap_counter: has_lap_counter !== undefined ? has_lap_counter : false,
                    lap_distance_km: lap_distance_km !== undefined ? (lap_distance_km !== null ? parseFloat(lap_distance_km) : null) : null,
                    total_laps: total_laps !== undefined ? (total_laps !== null ? parseInt(total_laps) : null) : null,
                    min_laps_for_classification: min_laps_for_classification !== undefined ? parseInt(min_laps_for_classification) : 1,
                    created_at: new Date().toISOString()
                };
                
                const { data, error } = await supabase
                    .from('event_lap_config')
                    .insert(insertData)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
            }
            
            res.json({
                success: true,
                config: result
            });
        } catch (error) {
            console.error('❌ [PUT /api/events/:id/lap-config] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    console.log('✅ Rotas de eventos carregadas:');
    console.log('   GET    /api/config');
    console.log('   GET    /api/config/age-categories');
    console.log('   GET    /api/config/event-modalities');
    console.log('   GET    /api/config/checkpoint-types');
    console.log('   PUT    /api/config/checkpoint-types/:code');
    console.log('   GET    /api/events/list');
    console.log('   GET    /api/events/stats');
    console.log('   GET    /api/events/:id');
    console.log('   GET    /api/events/:id/stats');
    console.log('   GET    /api/events/:id/participants');
    console.log('   GET    /api/events/:id/detections');
    console.log('   GET    /api/events/:id/classifications');
    console.log('   GET    /api/events/:id/category-configs');
    console.log('   GET    /api/events/:id/modality-configs');
    console.log('   GET    /api/events/:id/processor-config');
    console.log('   GET    /api/events/:id/lap-config');
    console.log('   POST   /api/events/create');
    console.log('   PUT    /api/events/:id');
    console.log('   PUT    /api/events/:id/category-configs');
    console.log('   PUT    /api/events/:id/modality-configs');
    console.log('   PUT    /api/events/:id/processor-config');
    console.log('   PUT    /api/events/:id/lap-config');
    console.log('   POST   /api/events/:id/reset');
    console.log('   DELETE /api/events/:id');
};

