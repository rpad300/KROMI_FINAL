/**
 * ==========================================
 * DATABASE ROUTES - Kromi.online
 * ==========================================
 * 
 * Endpoints REST para gestão de base de dados
 * Autenticação via cookies HttpOnly (server-side)
 * Apenas ADMIN tem acesso
 * 
 * Versão: 1.0
 * Data: 2025-10-27
 * ==========================================
 */

const { createClient } = require('@supabase/supabase-js');

module.exports = function(app, sessionManager) {
    console.log('🗄️ Carregando rotas de base de dados...');

    // Inicializar cliente Supabase com SERVICE ROLE
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Variáveis de ambiente não configuradas para database routes');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('✅ Cliente Supabase (service role) inicializado para database operations');

    // ==========================================
    // Middleware: Verificar autenticação
    // ==========================================
    function requireAuth(req, res, next) {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            res.clearCookie('sid');
            return res.status(401).json({
                success: false,
                error: 'Sessão inválida ou expirada'
            });
        }
        
        req.userSession = session;
        next();
    }

    // ==========================================
    // Middleware: Apenas ADMIN
    // ==========================================
    function requireAdmin(req, res, next) {
        const userRole = req.userSession?.userProfile?.role;
        
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado. Apenas administradores.',
                currentRole: userRole
            });
        }
        
        next();
    }

    // ==========================================
    // GET /api/database/tables
    // Lista TODAS as tabelas com contagens
    // Acesso: apenas admin
    // ==========================================
    app.get('/api/database/tables', requireAuth, requireAdmin, async (req, res) => {
        try {
            console.log('📋 [GET /api/database/tables] Utilizador:', req.userSession.userProfile.email);
            
            // Lista de TODAS as tabelas (com service role, ignora RLS)
            const allTables = [
                // Core
                'events', 'participants', 'detections', 'classifications', 'event_participants',
                // Hardware
                'devices', 'event_devices', 'device_sessions', 'active_device_sessions',
                'livestream_devices', 'livestream_devices_online', 'livestream_commands', 'livestream_offers', 'livestream_frames',
                // Config
                'checkpoint_types', 'event_checkpoints', 'event_checkpoints_view',
                'event_categories', 'event_modalities', 'event_lap_config', 'event_lap_config_backup',
                'event_category_config', 'event_modality_config', 'event_configurations',
                'event_calibrations', 'event_processor_settings', 'event_classifications',
                // Processamento
                'image_buffer', 'images', 'batch_processing', 'manual_processing',
                'detections_with_images', 'configurations_with_images',
                // Stats/Views
                'detection_stats', 'events_with_stats', 'livestream_event_stats',
                // Logs
                'activity_logs', 'activity_times', 'audit_logs', 'calibration_history',
                // Segurança
                'user_profiles', 'user_sessions', 'user_permissions', 'organizers', 'role_definitions',
                // Sistema
                'configurations', 'platform_configurations', 'global_processor_settings',
                'email_templates', 'email_logs', 'email_schedule',
                'ai_cost_stats', 'ai_cost_sync_log',
                // Dados
                'age_categories', 'modality_activities', 'lap_data'
            ];
            
            const tables = [];
            let totalRecords = 0;
            
            // Contar registos em cada tabela (em paralelo para velocidade)
            const promises = allTables.map(async (tableName) => {
                try {
                    const { count, error } = await supabase
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    
                    if (!error) {
                        totalRecords += (count || 0);
                        return {
                            name: tableName,
                            records: count || 0,
                            accessible: true
                        };
                    } else {
                        return {
                            name: tableName,
                            records: 0,
                            accessible: false,
                            error: error.message
                        };
                    }
                } catch (e) {
                    return {
                        name: tableName,
                        records: 0,
                        accessible: false,
                        error: e.message
                    };
                }
            });
            
            const results = await Promise.all(promises);
            
            console.log(`✅ [GET /api/database/tables] ${results.length} tabelas verificadas, ${totalRecords} registos totais`);
            
            res.json({
                success: true,
                tables: results,
                summary: {
                    totalTables: results.length,
                    accessibleTables: results.filter(t => t.accessible).length,
                    totalRecords,
                    tablesWithData: results.filter(t => t.records > 0).length
                }
            });
            
        } catch (error) {
            console.error('❌ [GET /api/database/tables] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // GET /api/database/overview
    // Visão geral da base de dados
    // Acesso: apenas admin
    // ==========================================
    app.get('/api/database/overview', requireAuth, requireAdmin, async (req, res) => {
        try {
            console.log('📊 [GET /api/database/overview] Utilizador:', req.userSession.userProfile.email);
            
            // Tabelas principais para stats
            const coreTables = ['events', 'participants', 'detections', 'classifications', 'devices', 'user_profiles'];
            
            const stats = {};
            let totalRecords = 0;
            
            for (const table of coreTables) {
                const { count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                stats[table] = count || 0;
                totalRecords += (count || 0);
            }
            
            console.log('✅ [GET /api/database/overview] Stats:', stats);
            
            res.json({
                success: true,
                stats,
                summary: {
                    totalRecords,
                    lastUpdated: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ [GET /api/database/overview] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // POST /api/database/export-schema
    // Exportar schema completo (estrutura, triggers, functions)
    // Acesso: apenas admin
    // ==========================================
    app.post('/api/database/export-schema', requireAuth, requireAdmin, async (req, res) => {
        try {
            console.log('📤 [POST /api/database/export-schema] Utilizador:', req.userSession.userProfile.email);
            
            // TODO: Implementar extração de schema via pg_dump ou queries SQL
            // Por enquanto, retornar metadados básicos
            
            const schema = {
                version: '1.0',
                exported: new Date().toISOString(),
                exportedBy: req.userSession.userProfile.email,
                database: 'Kromi.online',
                note: 'Schema completo será implementado com pg_dump ou SQL queries',
                tables: [],
                triggers: [],
                functions: [],
                policies: []
            };
            
            res.json({
                success: true,
                schema,
                message: 'Exportação de schema (estrutura básica). pg_dump completo será adicionado.'
            });
            
        } catch (error) {
            console.error('❌ [POST /api/database/export-schema] Erro:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    console.log('✅ Rotas de base de dados carregadas:');
    console.log('   GET    /api/database/tables');
    console.log('   GET    /api/database/overview');
    console.log('   POST   /api/database/export-schema');
};

