/**
 * API para Estatísticas de Custos de IA
 * Endpoints para visualização e análise de custos reais de IA
 * Acesso restrito a administradores
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { Parser } = require('@json2csv/plainjs');
const AICostSync = require('./ai-cost-sync');

// Variável para armazenar sessionManager (será setada quando o módulo for carregado)
let sessionManager = null;
let aiCostSync = null;

// Função para setar o sessionManager
function setSessionManager(sm) {
    sessionManager = sm;
    console.log('[AI-COST-API] ✅ SessionManager configurado');
}

// Função para inicializar o sistema de sincronização
function initSync() {
    if (!aiCostSync) {
        aiCostSync = new AICostSync();
        // Iniciar sincronização automática a cada 6 horas
        aiCostSync.startAutoSync(6);
    }
    return aiCostSync;
}

// Middleware para verificar se o utilizador é administrador
// Usa o mesmo padrão de autenticação por COOKIES das outras rotas
async function requireAdmin(req, res, next) {
    try {
        // Obter sessionId do cookie (mesmo padrão das outras rotas)
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            console.log('[AI-COST-API] ❌ Sem cookie de sessão');
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!sessionManager) {
            console.error('[AI-COST-API] ❌ SessionManager não disponível');
            return res.status(500).json({ error: 'Erro interno: SessionManager não inicializado' });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            console.log('[AI-COST-API] ❌ Sessão inválida:', sessionId.substring(0, 8) + '...');
            res.clearCookie('sid');
            return res.status(401).json({ error: 'Sessão inválida ou expirada' });
        }

        // Verificar se é administrador
        const userRole = session.userProfile?.role;
        
        if (userRole !== 'admin') {
            console.log('[AI-COST-API] ❌ Acesso negado. Role:', userRole);
            return res.status(403).json({ 
                error: 'Acesso negado. Apenas administradores podem aceder a esta funcionalidade.' 
            });
        }

        console.log('[AI-COST-API] ✅ Admin autenticado:', session.userProfile.email);
        
        // Nota: Última atividade é atualizada automaticamente pelo middleware de sessão
        
        // Disponibilizar dados da sessão para as rotas
        req.userSession = session;
        req.userId = session.userId;
        req.userProfile = session.userProfile;
        
        // Criar cliente Supabase com SERVICE ROLE para esta requisição
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        req.supabase = supabase;
        
        next();
    } catch (error) {
        console.error('[AI-COST-API] ❌ Erro na verificação de administrador:', error);
        res.status(500).json({ error: 'Erro ao verificar permissões: ' + error.message });
    }
}

// GET /api/ai-costs/indicators - Obter indicadores principais
router.get('/indicators', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .rpc('get_ai_cost_indicators');

        if (error) {
            console.error('Erro ao obter indicadores:', error);
            return res.status(500).json({ error: 'Erro ao obter indicadores' });
        }

        const indicators = data && data.length > 0 ? data[0] : {
            total_period: 0,
            last_24h: 0,
            last_72h: 0,
            current_month: 0,
            last_sync: null
        };

        res.json(indicators);
    } catch (error) {
        console.error('Erro ao obter indicadores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/ai-costs/query - Consultar custos com filtros
router.post('/query', requireAdmin, async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            service,
            model,
            event_id,
            region,
            page = 1,
            page_size = 50
        } = req.body;

        // Validação de datas
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Datas de início e fim são obrigatórias' });
        }

        let query = req.supabase
            .from('ai_cost_stats')
            .select('*, events(name)', { count: 'exact' })
            .gte('timestamp', start_date)
            .lte('timestamp', end_date)
            .order('timestamp', { ascending: false });

        // Aplicar filtros opcionais
        if (service) query = query.eq('service', service);
        if (model) query = query.eq('model', model);
        if (event_id) query = query.eq('event_id', event_id);
        if (region) query = query.eq('region', region);

        // Paginação
        const from = (page - 1) * page_size;
        const to = from + page_size - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Erro ao consultar custos:', error);
            return res.status(500).json({ error: 'Erro ao consultar custos' });
        }

        res.json({
            data: data || [],
            pagination: {
                page,
                page_size,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / page_size)
            }
        });
    } catch (error) {
        console.error('Erro ao consultar custos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/ai-costs/aggregate - Obter agregações por dimensão
router.post('/aggregate', requireAdmin, async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            dimension  // 'service', 'model', 'region', 'event', 'hour', 'day'
        } = req.body;

        // Validação
        if (!start_date || !end_date || !dimension) {
            return res.status(400).json({ error: 'Parâmetros obrigatórios: start_date, end_date, dimension' });
        }

        const validDimensions = ['service', 'model', 'region', 'event', 'hour', 'day'];
        if (!validDimensions.includes(dimension)) {
            return res.status(400).json({ error: 'Dimensão inválida. Use: ' + validDimensions.join(', ') });
        }

        const { data, error } = await req.supabase
            .rpc('get_ai_costs_aggregated', {
                start_date,
                end_date,
                group_by_dimension: dimension
            });

        if (error) {
            console.error('Erro ao agregar custos:', error);
            return res.status(500).json({ error: 'Erro ao agregar custos' });
        }

        res.json({
            dimension,
            data: data || []
        });
    } catch (error) {
        console.error('Erro ao agregar custos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/ai-costs/export - Exportar dados para CSV
router.post('/export', requireAdmin, async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            service,
            model,
            event_id,
            region,
            export_type = 'detail'  // 'detail' ou 'aggregate'
        } = req.body;

        // Validação de datas
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Datas de início e fim são obrigatórias' });
        }

        let csvData;
        let filename;

        if (export_type === 'detail') {
            // Exportar detalhes
            let query = req.supabase
                .from('ai_cost_stats')
                .select('timestamp, service, model, region, event_id, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms')
                .gte('timestamp', start_date)
                .lte('timestamp', end_date)
                .order('timestamp', { ascending: false });

            if (service) query = query.eq('service', service);
            if (model) query = query.eq('model', model);
            if (event_id) query = query.eq('event_id', event_id);
            if (region) query = query.eq('region', region);

            const { data, error } = await query;

            if (error) {
                console.error('Erro ao exportar custos:', error);
                return res.status(500).json({ error: 'Erro ao exportar custos' });
            }

            csvData = data || [];
            filename = `ai-costs-detail-${new Date().toISOString().split('T')[0]}.csv`;

        } else if (export_type === 'aggregate') {
            // Exportar agregações por serviço
            const { data, error } = await req.supabase
                .rpc('get_ai_costs_aggregated', {
                    start_date,
                    end_date,
                    group_by_dimension: 'service'
                });

            if (error) {
                console.error('Erro ao exportar agregações:', error);
                return res.status(500).json({ error: 'Erro ao exportar agregações' });
            }

            csvData = data || [];
            filename = `ai-costs-aggregate-${new Date().toISOString().split('T')[0]}.csv`;
        }

        if (!csvData || csvData.length === 0) {
            return res.status(404).json({ error: 'Nenhum dado encontrado para exportação' });
        }

        // Converter para CSV
        const parser = new Parser();
        const csv = parser.parse(csvData);

        // Enviar CSV
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);  // BOM para UTF-8

    } catch (error) {
        console.error('Erro ao exportar custos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/ai-costs/event/:eventId - Obter custos de um evento específico
router.get('/event/:eventId', requireAdmin, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { start_date, end_date } = req.query;

        // Validação
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Parâmetros start_date e end_date são obrigatórios' });
        }

        // Obter totais do evento
        const { data: totals, error: totalsError } = await req.supabase
            .from('ai_cost_stats')
            .select('cost_amount, tokens_total')
            .eq('event_id', eventId)
            .gte('timestamp', start_date)
            .lte('timestamp', end_date);

        if (totalsError) {
            console.error('Erro ao obter totais do evento:', totalsError);
            return res.status(500).json({ error: 'Erro ao obter totais do evento' });
        }

        const totalCost = totals.reduce((sum, item) => sum + parseFloat(item.cost_amount || 0), 0);
        const totalTokens = totals.reduce((sum, item) => sum + parseInt(item.tokens_total || 0), 0);

        // Obter evolução temporal (por hora)
        const { data: timeline, error: timelineError } = await req.supabase
            .rpc('get_ai_costs_aggregated', {
                start_date,
                end_date,
                group_by_dimension: 'hour'
            });

        if (timelineError) {
            console.error('Erro ao obter timeline do evento:', timelineError);
        }

        // Obter lista de pedidos
        const { data: requests, error: requestsError } = await req.supabase
            .from('ai_cost_stats')
            .select('*')
            .eq('event_id', eventId)
            .gte('timestamp', start_date)
            .lte('timestamp', end_date)
            .order('timestamp', { ascending: false })
            .limit(100);

        if (requestsError) {
            console.error('Erro ao obter pedidos do evento:', requestsError);
        }

        res.json({
            event_id: eventId,
            total_cost: totalCost,
            total_tokens: totalTokens,
            request_count: totals.length,
            timeline: timeline || [],
            recent_requests: requests || []
        });

    } catch (error) {
        console.error('Erro ao obter custos do evento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/ai-costs/sync - Disparar sincronização manual
router.post('/sync', requireAdmin, async (req, res) => {
    try {
        console.log('[AI-COST-API] 🔄 Sincronização manual solicitada por:', req.userProfile.email);

        // Verificar última sincronização para evitar uso excessivo
        const { data: lastSync, error: lastSyncError } = await req.supabase
            .from('ai_cost_sync_log')
            .select('sync_started_at, sync_status')
            .order('sync_started_at', { ascending: false })
            .limit(1);

        if (!lastSyncError && lastSync && lastSync.length > 0) {
            const lastSyncTime = new Date(lastSync[0].sync_started_at);
            const now = new Date();
            const minutesSinceLastSync = (now - lastSyncTime) / 1000 / 60;

            // Verificar se há sincronização em andamento
            if (lastSync[0].sync_status === 'running') {
                return res.status(409).json({
                    error: 'Já existe uma sincronização em andamento',
                    status: 'running'
                });
            }

            // Limite: apenas 1 sincronização a cada 5 minutos
            if (minutesSinceLastSync < 5) {
                return res.status(429).json({
                    error: 'Sincronização solicitada recentemente. Aguarde alguns minutos.',
                    wait_minutes: Math.ceil(5 - minutesSinceLastSync)
                });
            }
        }

        // Inicializar sistema de sincronização se necessário
        const syncSystem = initSync();

        // Definir período de sincronização (últimas 7 dias)
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Executar sincronização em background
        setImmediate(async () => {
            try {
                console.log('[AI-COST-API] 🔄 Iniciando sincronização em background...');
                await syncSystem.syncGoogleCloudCosts(
                    startDate.toISOString(),
                    endDate.toISOString(),
                    req.userId
                );
                console.log('[AI-COST-API] ✅ Sincronização background concluída');
            } catch (error) {
                console.error('[AI-COST-API] ❌ Erro na sincronização background:', error);
            }
        });

        res.json({
            message: 'Sincronização iniciada com sucesso',
            status: 'running',
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        });

    } catch (error) {
        console.error('[AI-COST-API] ❌ Erro ao disparar sincronização:', error);
        res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
    }
});

// GET /api/ai-costs/filters - Obter valores únicos para filtros
router.get('/filters', requireAdmin, async (req, res) => {
    try {
        // Obter serviços únicos
        const { data: services } = await req.supabase
            .from('ai_cost_stats')
            .select('service')
            .order('service');

        // Obter modelos únicos
        const { data: models } = await req.supabase
            .from('ai_cost_stats')
            .select('model')
            .order('model');

        // Obter regiões únicas
        const { data: regions } = await req.supabase
            .from('ai_cost_stats')
            .select('region')
            .order('region');

        // Obter eventos com custos
        const { data: events } = await req.supabase
            .from('events')
            .select('id, name')
            .order('name');

        res.json({
            services: [...new Set((services || []).map(s => s.service).filter(Boolean))],
            models: [...new Set((models || []).map(m => m.model).filter(Boolean))],
            regions: [...new Set((regions || []).map(r => r.region).filter(Boolean))],
            events: events || []
        });

    } catch (error) {
        console.error('Erro ao obter filtros:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Exportar router e funções de configuração
module.exports = router;
module.exports.setSessionManager = setSessionManager;
module.exports.initSync = initSync;

