/**
 * Interceptor de Custos de IA
 * Captura TODAS as chamadas de IA da plataforma e registra custos automaticamente
 */

const { createClient } = require('@supabase/supabase-js');

class AICostInterceptor {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        // Tabela de preços atualizada (outubro 2025)
        this.pricing = {
            // OpenAI
            'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
            'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
            'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
            
            // DeepSeek
            'deepseek-chat': { input: 0.00027 / 1000, output: 0.0011 / 1000 },
            'deepseek-coder': { input: 0.00027 / 1000, output: 0.0011 / 1000 },
            
            // Google Gemini
            'gemini-1.5-flash': { input: 0.000075 / 1000, output: 0.000225 / 1000 },
            'gemini-1.5-pro': { input: 0.00125 / 1000, output: 0.00375 / 1000 },
            'gemini-pro': { input: 0.00125 / 1000, output: 0.00375 / 1000 },
            
            // Google Vision
            'vision-api': { perUnit: 0.0015 }  // $1.50 por 1000 imagens
        };
        
        console.log('🎯 [AI-COST-INTERCEPTOR] Inicializado');
        console.log('🎯 [AI-COST-INTERCEPTOR] Rastreando: OpenAI, DeepSeek, Gemini, Vision API');
    }

    /**
     * Registrar custo de OpenAI
     */
    async trackOpenAI({ model, inputTokens, outputTokens, eventId, duration, metadata }) {
        const modelKey = model.includes('gpt-4-turbo') ? 'gpt-4-turbo' :
                        model.includes('gpt-4') ? 'gpt-4' : 'gpt-3.5-turbo';
        
        const pricing = this.pricing[modelKey];
        const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output);

        return await this.insertCost({
            service: 'openai',
            model: modelKey,
            inputTokens,
            outputTokens,
            cost,
            duration,
            eventId,
            metadata: { ...metadata, full_model: model }
        });
    }

    /**
     * Registrar custo de DeepSeek
     */
    async trackDeepSeek({ model, inputTokens, outputTokens, eventId, duration, metadata }) {
        const modelKey = model.includes('coder') ? 'deepseek-coder' : 'deepseek-chat';
        const pricing = this.pricing[modelKey];
        const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output);

        return await this.insertCost({
            service: 'deepseek',
            model: modelKey,
            inputTokens,
            outputTokens,
            cost,
            duration,
            eventId,
            metadata: { ...metadata, full_model: model }
        });
    }

    /**
     * Registrar custo de Gemini
     */
    async trackGemini({ model, inputTokens, outputTokens, eventId, duration, metadata }) {
        const modelKey = model.includes('pro') ? 'gemini-1.5-pro' : 
                        model.includes('flash') ? 'gemini-1.5-flash' : 'gemini-pro';
        
        const pricing = this.pricing[modelKey];
        const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output);

        return await this.insertCost({
            service: 'google-ai',
            model: modelKey,
            inputTokens,
            outputTokens,
            cost,
            duration,
            eventId,
            metadata: { ...metadata, full_model: model }
        });
    }

    /**
     * Registrar custo de Vision API
     */
    async trackVisionAPI({ operation, eventId, imageId, duration, metadata }) {
        const cost = this.pricing['vision-api'].perUnit;

        return await this.insertCost({
            service: 'google-vision',
            model: 'vision-api-v1',
            inputTokens: 1,
            outputTokens: 0,
            cost,
            duration,
            eventId,
            metadata: { ...metadata, operation, image_id: imageId }
        });
    }

    /**
     * Inserir registro de custo
     */
    async insertCost({ service, model, inputTokens, outputTokens, cost, duration, eventId, metadata }) {
        try {
            const { error } = await this.supabase
                .from('ai_cost_stats')
                .insert({
                    timestamp: new Date().toISOString(),
                    service,
                    model,
                    region: 'us-central1',
                    cost_amount: cost,
                    tokens_input: inputTokens || null,
                    tokens_output: outputTokens || null,
                    tokens_total: (inputTokens || 0) + (outputTokens || 0),
                    request_duration_ms: duration || null,
                    event_id: eventId || null,
                    cost_type: 'api_call',
                    metadata: { ...metadata, tracked_realtime: true },
                    synced_at: new Date().toISOString(),
                    sync_source: 'realtime_interceptor'
                });

            if (error && !error.message.includes('duplicate')) {
                console.error('🎯 [AI-COST-INTERCEPTOR] Erro ao inserir:', error);
                return false;
            }

            console.log(`🎯 [AI-COST-INTERCEPTOR] ${service}/${model} - $${cost.toFixed(6)}`);
            return true;

        } catch (error) {
            console.error('🎯 [AI-COST-INTERCEPTOR] Erro:', error);
            return false;
        }
    }

    /**
     * Wrapper para fetch que intercepta chamadas de IA
     */
    createInterceptedFetch(originalFetch) {
        const self = this;
        
        return async function(...args) {
            const url = args[0];
            const options = args[1] || {};
            
            // Executar request original
            const startTime = Date.now();
            const response = await originalFetch(...args);
            const duration = Date.now() - startTime;

            // Tentar detectar e registrar chamadas de IA
            try {
                if (typeof url === 'string') {
                    // OpenAI
                    if (url.includes('api.openai.com')) {
                        const clonedResponse = response.clone();
                        const data = await clonedResponse.json();
                        
                        if (data.usage) {
                            await self.trackOpenAI({
                                model: data.model || 'gpt-3.5-turbo',
                                inputTokens: data.usage.prompt_tokens,
                                outputTokens: data.usage.completion_tokens,
                                duration,
                                metadata: { request_id: data.id }
                            });
                        }
                    }
                    
                    // DeepSeek
                    else if (url.includes('api.deepseek.com')) {
                        const clonedResponse = response.clone();
                        const data = await clonedResponse.json();
                        
                        if (data.usage) {
                            await self.trackDeepSeek({
                                model: data.model || 'deepseek-chat',
                                inputTokens: data.usage.prompt_tokens,
                                outputTokens: data.usage.completion_tokens,
                                duration,
                                metadata: { request_id: data.id }
                            });
                        }
                    }
                    
                    // Google Generative AI (Gemini)
                    else if (url.includes('generativelanguage.googleapis.com')) {
                        const clonedResponse = response.clone();
                        const data = await clonedResponse.json();
                        
                        if (data.usageMetadata) {
                            const modelName = url.match(/models\/(gemini-[^:]+)/)?.[1] || 'gemini-1.5-flash';
                            
                            await self.trackGemini({
                                model: modelName,
                                inputTokens: data.usageMetadata.promptTokenCount || 0,
                                outputTokens: data.usageMetadata.candidatesTokenCount || 0,
                                duration,
                                metadata: {}
                            });
                        }
                    }
                    
                    // Google Vision API
                    else if (url.includes('vision.googleapis.com')) {
                        await self.trackVisionAPI({
                            operation: 'text_detection',
                            duration,
                            metadata: { url: url.substring(0, 100) }
                        });
                    }
                }
            } catch (error) {
                // Silenciar erros de interceptação para não quebrar requests
                console.error('🎯 [AI-COST-INTERCEPTOR] Erro ao processar response:', error.message);
            }

            return response;
        };
    }
}

// Singleton
let instance = null;

function getAICostInterceptor() {
    if (!instance) {
        instance = new AICostInterceptor();
    }
    return instance;
}

module.exports = getAICostInterceptor;

