/**
 * Rastreador de Uso de IA em Tempo Real
 * Intercepta e registra custos de chamadas de IA
 * Rastreia: OpenAI, DeepSeek, Gemini, Vision API
 */

const { createClient } = require('@supabase/supabase-js');

class AIUsageTracker {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        console.log('📊 [AI-USAGE-TRACKER] Inicializado');
    }

    /**
     * Registrar uso de Vision API
     */
    async trackVisionAPICall(params) {
        const {
            operation = 'text_detection',
            eventId = null,
            imageId = null,
            duration = null,
            timestamp = new Date()
        } = params;

        const cost = 0.0015;  // $1.50 por 1000 imagens

        try {
            await this.supabase
                .from('ai_cost_stats')
                .insert({
                    timestamp: timestamp.toISOString(),
                    service: 'google-vision',
                    model: 'vision-api-v1',
                    region: 'us-central1',
                    cost_amount: cost,
                    tokens_input: 1,
                    tokens_output: 0,
                    tokens_total: 1,
                    request_duration_ms: duration,
                    event_id: eventId,
                    cost_type: 'api_call',
                    metadata: {
                        operation,
                        image_id: imageId,
                        source: eventId ? 'event_processing' : 'administration',
                        tracked_realtime: true
                    },
                    synced_at: new Date().toISOString(),
                    sync_source: 'realtime_tracker'
                });

            console.log('📊 [AI-USAGE-TRACKER] Vision API:', cost.toFixed(6), 'USD', eventId ? `(evento)` : `(admin)`);
            return true;
        } catch (error) {
            console.error('📊 [AI-USAGE-TRACKER] Erro ao registrar Vision API:', error);
            return false;
        }
    }

    /**
     * Registrar uso de Gemini API
     */
    async trackGeminiCall(params) {
        const {
            model = 'gemini-1.5-flash',
            inputTokens = 0,
            outputTokens = 0,
            eventId = null,
            duration = null,
            timestamp = new Date()
        } = params;

        // Custo baseado na tabela de preços (USD por 1M tokens)
        const pricingGemini = {
            'gemini-1.5-flash': { input: 0.075, output: 0.30 },
            'gemini-1.5-pro': { input: 1.25, output: 5.0 },
            'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
            'gemini-2.5-flash-exp': { input: 0.075, output: 0.30 },
            'gemini-pro': { input: 1.25, output: 5.0 }
        };

        const pricing = pricingGemini[model] || pricingGemini['gemini-1.5-flash'];
        const cost = (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output);

        try {
            await this.supabase
                .from('ai_cost_stats')
                .insert({
                    timestamp: timestamp.toISOString(),
                    service: 'google-ai',
                    model: model,
                    region: 'us-central1',
                    cost_amount: cost,
                    tokens_input: inputTokens,
                    tokens_output: outputTokens,
                    tokens_total: inputTokens + outputTokens,
                    request_duration_ms: duration,
                    event_id: eventId,
                    cost_type: 'api_call',
                    metadata: {
                        source: eventId ? 'event_processing' : 'administration',
                        tracked_realtime: true
                    },
                    synced_at: new Date().toISOString(),
                    sync_source: 'realtime_tracker'
                });

            console.log('📊 [AI-USAGE-TRACKER] Gemini call:', cost.toFixed(6), 'USD', eventId ? `(evento)` : `(admin)`);
            return true;
        } catch (error) {
            console.error('📊 [AI-USAGE-TRACKER] Erro ao registrar Gemini:', error);
            return false;
        }
    }

    /**
     * Registrar uso de OpenAI API
     */
    async trackOpenAICall(params) {
        const {
            model = 'gpt-4',
            inputTokens = 0,
            outputTokens = 0,
            eventId = null,
            duration = null,
            timestamp = new Date()
        } = params;

        // Custo baseado na tabela de preços (USD por 1M tokens)
        const pricingOpenAI = {
            'gpt-4': { input: 30, output: 60 },
            'gpt-4-turbo': { input: 10, output: 30 },
            'gpt-4o': { input: 2.5, output: 10 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
        };

        const pricing = pricingOpenAI[model] || pricingOpenAI['gpt-4'];
        const cost = (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output);

        try {
            await this.supabase
                .from('ai_cost_stats')
                .insert({
                    timestamp: timestamp.toISOString(),
                    service: 'openai',
                    model: model,
                    region: 'us-east-1',
                    cost_amount: cost,
                    tokens_input: inputTokens,
                    tokens_output: outputTokens,
                    tokens_total: inputTokens + outputTokens,
                    request_duration_ms: duration,
                    event_id: eventId,
                    cost_type: 'api_call',
                    metadata: {
                        source: eventId ? 'event_processing' : 'administration',
                        tracked_realtime: true
                    },
                    synced_at: new Date().toISOString(),
                    sync_source: 'realtime_tracker'
                });

            console.log('📊 [AI-USAGE-TRACKER] OpenAI call:', cost.toFixed(6), 'USD', eventId ? `(evento)` : `(admin)`);
            return true;
        } catch (error) {
            console.error('📊 [AI-USAGE-TRACKER] Erro ao registrar OpenAI:', error);
            return false;
        }
    }

    /**
     * Registrar uso de DeepSeek API
     */
    async trackDeepSeekCall(params) {
        const {
            model = 'deepseek-chat',
            inputTokens = 0,
            outputTokens = 0,
            eventId = null,
            duration = null,
            timestamp = new Date()
        } = params;

        // Custo baseado na tabela de preços (USD por 1M tokens)
        const pricingDeepSeek = {
            'deepseek-chat': { input: 0.14, output: 0.28 },
            'deepseek-reasoner': { input: 0.55, output: 2.19 }
        };

        const pricing = pricingDeepSeek[model] || pricingDeepSeek['deepseek-chat'];
        const cost = (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output);

        try {
            await this.supabase
                .from('ai_cost_stats')
                .insert({
                    timestamp: timestamp.toISOString(),
                    service: 'deepseek',
                    model: model,
                    region: 'global',
                    cost_amount: cost,
                    tokens_input: inputTokens,
                    tokens_output: outputTokens,
                    tokens_total: inputTokens + outputTokens,
                    request_duration_ms: duration,
                    event_id: eventId,
                    cost_type: 'api_call',
                    metadata: {
                        source: eventId ? 'event_processing' : 'administration',
                        tracked_realtime: true
                    },
                    synced_at: new Date().toISOString(),
                    sync_source: 'realtime_tracker'
                });

            console.log('📊 [AI-USAGE-TRACKER] DeepSeek call:', cost.toFixed(6), 'USD', eventId ? `(evento)` : `(admin)`);
            return true;
        } catch (error) {
            console.error('📊 [AI-USAGE-TRACKER] Erro ao registrar DeepSeek:', error);
            return false;
        }
    }

    /**
     * Sincronizar custos de HOJE baseado em imagens processadas
     */
    async syncTodayCosts() {
        console.log('📊 [AI-USAGE-TRACKER] Sincronizando custos de hoje...');

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Buscar imagens processadas hoje que ainda não têm custo registrado
            const { data: images, error } = await this.supabase
                .from('images')
                .select('id, event_id, created_at, metadata')
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('📊 [AI-USAGE-TRACKER] Erro ao buscar imagens:', error);
                return { success: false, error: error.message };
            }

            console.log('📊 [AI-USAGE-TRACKER] Imagens processadas hoje:', images?.length || 0);

            if (!images || images.length === 0) {
                console.log('📊 [AI-USAGE-TRACKER] Nenhuma imagem processada hoje');
                return { success: true, records: 0, totalCost: 0 };
            }

            let records = 0;
            let totalCost = 0;

            // Para cada imagem, verificar se já tem custo registrado
            for (const img of images) {
                // Verificar se já existe registro para esta imagem
                const { data: existing } = await this.supabase
                    .from('ai_cost_stats')
                    .select('id')
                    .eq('metadata->>image_id', img.id)
                    .limit(1);

                if (!existing || existing.length === 0) {
                    // Registar custo
                    await this.trackVisionAPICall({
                        eventId: img.event_id,
                        imageId: img.id,
                        timestamp: new Date(img.created_at)
                    });

                    records++;
                    totalCost += 0.0015;
                }
            }

            console.log('📊 [AI-USAGE-TRACKER] ✅ Sincronização concluída');
            console.log('📊 [AI-USAGE-TRACKER] Novos registos:', records);
            console.log('📊 [AI-USAGE-TRACKER] Custo total:', totalCost.toFixed(6), 'USD');

            return { success: true, records, totalCost };

        } catch (error) {
            console.error('📊 [AI-USAGE-TRACKER] Erro na sincronização:', error);
            return { success: false, error: error.message };
        }
    }
}

// Singleton
let instance = null;

function getAIUsageTracker() {
    if (!instance) {
        instance = new AIUsageTracker();
    }
    return instance;
}

module.exports = getAIUsageTracker;
