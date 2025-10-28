/**
 * Sistema de Sincronização de Custos de IA
 * Sincroniza custos reais do Google Cloud Billing API
 */

const { createClient } = require('@supabase/supabase-js');

class AICostSync {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        this.googleProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.googleBillingAccount = process.env.GOOGLE_BILLING_ACCOUNT_ID;
        
        // Mapeamento de SKUs do Google Cloud para nomes amigáveis
        this.skuMapping = {
            'vision-api': {
                service: 'google-vision',
                patterns: ['vision', 'ocr', 'label detection', 'text detection']
            },
            'vertex-ai': {
                service: 'google-vertex',
                patterns: ['vertex', 'prediction', 'gemini']
            },
            'ai-platform': {
                service: 'google-ai',
                patterns: ['ai platform', 'gemini']
            }
        };
        
        this.isSyncing = false;
        this.lastSyncTime = null;
        
        console.log('💰 [AI-COST-SYNC] Sistema de sincronização inicializado');
    }

    /**
     * Sincronizar custos do Google Cloud
     */
    async syncGoogleCloudCosts(startDate, endDate, triggeredBy = null) {
        if (this.isSyncing) {
            console.log('💰 [AI-COST-SYNC] Sincronização já em progresso...');
            return { success: false, error: 'Sincronização já em progresso' };
        }

        this.isSyncing = true;
        const syncStartTime = new Date();

        try {
            console.log('💰 [AI-COST-SYNC] Iniciando sincronização...');
            console.log('💰 [AI-COST-SYNC] Período:', startDate, 'até', endDate);

            // Criar log de sincronização
            const { data: syncLog, error: syncLogError } = await this.supabase
                .from('ai_cost_sync_log')
                .insert({
                    sync_started_at: syncStartTime.toISOString(),
                    sync_status: 'running',
                    sync_source: triggeredBy ? 'manual' : 'automatic',
                    triggered_by: triggeredBy
                })
                .select()
                .single();

            if (syncLogError) {
                console.error('💰 [AI-COST-SYNC] ❌ Erro ao criar log:', syncLogError);
                this.isSyncing = false;
                return { success: false, error: syncLogError.message };
            }

            console.log('💰 [AI-COST-SYNC] Log criado:', syncLog.id);

            let totalRecords = 0;
            let totalCost = 0;

            // OPÇÃO 1: Usar Google Cloud Billing API (requer credenciais)
            if (this.googleProjectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                console.log('💰 [AI-COST-SYNC] Usando Google Cloud Billing API...');
                const results = await this.syncFromGoogleBillingAPI(startDate, endDate);
                totalRecords = results.records;
                totalCost = results.totalCost;
            }
            // OPÇÃO 2: Estimar custos baseado em uso da aplicação
            else {
                console.log('💰 [AI-COST-SYNC] Google Cloud Billing API não configurado');
                console.log('💰 [AI-COST-SYNC] Estimando custos baseado em logs da aplicação...');
                const results = await this.estimateCostsFromAppLogs(startDate, endDate);
                totalRecords = results.records;
                totalCost = results.totalCost;
            }

            // Atualizar log de sincronização
            await this.supabase
                .from('ai_cost_sync_log')
                .update({
                    sync_completed_at: new Date().toISOString(),
                    sync_status: 'completed',
                    records_synced: totalRecords,
                    total_cost_synced: totalCost
                })
                .eq('id', syncLog.id);

            this.lastSyncTime = new Date();
            this.isSyncing = false;

            console.log('💰 [AI-COST-SYNC] ✅ Sincronização concluída');
            console.log('💰 [AI-COST-SYNC] Registos:', totalRecords);
            console.log('💰 [AI-COST-SYNC] Custo total: $', totalCost.toFixed(4));

            return {
                success: true,
                records: totalRecords,
                totalCost: totalCost,
                syncId: syncLog.id
            };

        } catch (error) {
            console.error('💰 [AI-COST-SYNC] ❌ Erro na sincronização:', error);
            this.isSyncing = false;

            // Atualizar log com erro
            if (syncLog && syncLog.id) {
                await this.supabase
                    .from('ai_cost_sync_log')
                    .update({
                        sync_completed_at: new Date().toISOString(),
                        sync_status: 'failed',
                        error_message: error.message
                    })
                    .eq('id', syncLog.id);
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Sincronizar usando Google Cloud Billing API
     * Requer: GOOGLE_APPLICATION_CREDENTIALS configurado
     */
    async syncFromGoogleBillingAPI(startDate, endDate) {
        console.log('💰 [AI-COST-SYNC] Conectando ao Google Cloud Billing API...');

        try {
            const { google } = require('googleapis');
            
            // Autenticar com Google Cloud
            const auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                scopes: ['https://www.googleapis.com/auth/cloud-billing.readonly']
            });

            const billingClient = google.cloudbilling({ version: 'v1', auth });

            // Consultar custos de IA
            const query = {
                parent: `billingAccounts/${this.googleBillingAccount}`,
                filter: `usage_start_time>="${startDate}" AND usage_end_time<="${endDate}" AND service.description:("Vision" OR "Vertex" OR "Gemini" OR "AI Platform")`,
                pageSize: 1000
            };

            const response = await billingClient.billingAccounts.services.skus.list(query);
            
            let records = 0;
            let totalCost = 0;

            for (const item of response.data.skus || []) {
                const cost = this.extractCostFromBillingItem(item);
                
                if (cost && cost.amount > 0) {
                    await this.insertCostRecord(cost);
                    records++;
                    totalCost += cost.amount;
                }
            }

            return { records, totalCost };

        } catch (error) {
            console.error('💰 [AI-COST-SYNC] ❌ Erro ao acessar Google Billing API:', error);
            
            // Fallback para estimativa
            console.log('💰 [AI-COST-SYNC] Usando estimativa baseada em logs...');
            return await this.estimateCostsFromAppLogs(startDate, endDate);
        }
    }

    /**
     * Estimar custos baseado nos logs da aplicação
     * Usa preços públicos conhecidos das APIs
     */
    async estimateCostsFromAppLogs(startDate, endDate) {
        console.log('💰 [AI-COST-SYNC] Estimando custos de logs da aplicação...');

        // Preços de referência (USD por 1000 unidades)
        const pricingTable = {
            'google-vision': {
                'text-detection': 1.50 / 1000,  // $1.50 por 1000 imagens
                'label-detection': 1.50 / 1000,
                'ocr': 1.50 / 1000
            },
            'gemini-pro': {
                'input': 0.000125,  // $0.125 por 1M tokens
                'output': 0.000375  // $0.375 por 1M tokens
            },
            'gemini-flash': {
                'input': 0.000075,
                'output': 0.000225
            }
        };

        try {
            let records = 0;
            let totalCost = 0;

            // Buscar processamentos de imagem do período
            const { data: imageProcessings, error: imgError } = await this.supabase
                .from('images')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (!imgError && imageProcessings) {
                console.log('💰 [AI-COST-SYNC] Processamentos de imagem encontrados:', imageProcessings.length);

                for (const img of imageProcessings) {
                    // Cada imagem processada = 1 chamada à Vision API
                    const cost = {
                        timestamp: img.created_at,
                        service: 'google-vision',
                        model: 'vision-api-v1',
                        region: 'us-east-1', // Assumir região padrão
                        cost_amount: pricingTable['google-vision']['text-detection'],
                        tokens_input: 1,
                        tokens_output: 0,
                        tokens_total: 1,
                        request_duration_ms: null,
                        event_id: img.event_id || null,
                        metadata: {
                            image_id: img.id,
                            estimated: true,
                            source: 'app_logs'
                        }
                    };

                    await this.insertCostRecord(cost);
                    records++;
                    totalCost += cost.cost_amount;
                }
            }

            // Buscar uso de Gemini (se tiver logs)
            // Nota: Isto seria mais preciso se a aplicação guardasse logs de uso de Gemini
            
            console.log('💰 [AI-COST-SYNC] ✅ Estimativa concluída');
            
            return { records, totalCost };

        } catch (error) {
            console.error('💰 [AI-COST-SYNC] ❌ Erro ao estimar custos:', error);
            return { records: 0, totalCost: 0 };
        }
    }

    /**
     * Extrair informações de custo de um item do Google Billing
     */
    extractCostFromBillingItem(item) {
        try {
            // Identificar o serviço
            let service = 'google-cloud';
            let model = item.displayName || 'unknown';

            for (const [key, mapping] of Object.entries(this.skuMapping)) {
                const description = (item.description || '').toLowerCase();
                if (mapping.patterns.some(pattern => description.includes(pattern))) {
                    service = mapping.service;
                    break;
                }
            }

            return {
                timestamp: item.usageStartTime || new Date().toISOString(),
                service: service,
                model: model,
                region: item.region || 'global',
                cost_amount: parseFloat(item.cost?.units || 0) + (parseFloat(item.cost?.nanos || 0) / 1000000000),
                tokens_input: null,
                tokens_output: null,
                tokens_total: parseInt(item.usage?.amount || 0),
                request_duration_ms: null,
                metadata: {
                    sku: item.name,
                    description: item.description,
                    source: 'google_billing_api'
                }
            };
        } catch (error) {
            console.error('💰 [AI-COST-SYNC] Erro ao extrair custo:', error);
            return null;
        }
    }

    /**
     * Inserir registro de custo na base de dados
     */
    async insertCostRecord(cost) {
        try {
            const { error } = await this.supabase
                .from('ai_cost_stats')
                .insert({
                    timestamp: cost.timestamp,
                    service: cost.service,
                    model: cost.model,
                    region: cost.region || 'unknown',
                    cost_amount: cost.cost_amount,
                    tokens_input: cost.tokens_input,
                    tokens_output: cost.tokens_output,
                    tokens_total: cost.tokens_total,
                    request_duration_ms: cost.request_duration_ms,
                    event_id: cost.event_id,
                    metadata: cost.metadata || {},
                    synced_at: new Date().toISOString(),
                    sync_source: cost.metadata?.source || 'manual'
                });

            if (error) {
                // Ignorar duplicados
                if (!error.message.includes('duplicate')) {
                    console.error('💰 [AI-COST-SYNC] Erro ao inserir registro:', error);
                }
            }

            return !error;
        } catch (error) {
            console.error('💰 [AI-COST-SYNC] Erro ao inserir:', error);
            return false;
        }
    }

    /**
     * Sincronização automática periódica
     */
    startAutoSync(intervalHours = 1) {
        console.log(`💰 [AI-COST-SYNC] Sincronização automática ativada (a cada ${intervalHours}h)`);

        // Sincronizar imediatamente
        this.runAutoSync();

        // Agendar sincronizações periódicas
        setInterval(() => {
            this.runAutoSync();
        }, intervalHours * 60 * 60 * 1000);
    }

    async runAutoSync() {
        try {
            // Sincronizar últimas 24 horas
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

            console.log('💰 [AI-COST-SYNC] 🔄 Executando sincronização automática...');
            
            const result = await this.syncGoogleCloudCosts(
                startDate.toISOString(),
                endDate.toISOString()
            );

            if (result.success) {
                console.log('💰 [AI-COST-SYNC] ✅ Sincronização automática concluída');
            } else {
                console.error('💰 [AI-COST-SYNC] ❌ Falha na sincronização automática:', result.error);
            }

        } catch (error) {
            console.error('💰 [AI-COST-SYNC] ❌ Erro na sincronização automática:', error);
        }
    }

    /**
     * Obter estatísticas da última sincronização
     */
    getLastSyncStats() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            isConfigured: !!(this.googleProjectId && this.googleBillingAccount)
        };
    }
}

module.exports = AICostSync;

