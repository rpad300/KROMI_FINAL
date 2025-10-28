/**
 * AI Cost Tracker
 * Registra automaticamente os custos de cada chamada de API
 */

const { createClient } = require('@supabase/supabase-js');

class AICostTracker {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        // Preços por modelo
        this.pricing = {
            // Gemini
            'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
            'gemini-1.5-flash-latest': { input: 0.000075, output: 0.0003 },
            'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
            'gemini-1.5-pro-latest': { input: 0.00125, output: 0.005 },
            'gemini-2.0-flash-exp': { input: 0.000075, output: 0.0003 },
            'gemini-2.0-flash-thinking-exp': { input: 0.000075, output: 0.0003 },
            'gemini-ultra': { input: 0.0025, output: 0.01 },
            
            // OpenAI
            'gpt-4o': { input: 2.5, output: 10 },
            'gpt-4o-2024-05-13': { input: 2.5, output: 10 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.6 },
            'gpt-4-turbo': { input: 10, output: 30 },
            'gpt-4-turbo-2024-04-09': { input: 10, output: 30 },
            'gpt-4': { input: 30, output: 60 },
            
            // DeepSeek
            'deepseek-chat': { input: 0.14, output: 0.28 },
            'deepseek-chat-0324': { input: 0.14, output: 0.28 },
            'deepseek-reasoner': { input: 0.55, output: 2.19 },
            'deepseek-reasoner-0324': { input: 0.55, output: 2.19 }
        };
    }
    
    /**
     * Calcular custo de uma chamada de API
     */
    calculateCost(service, model, tokensInput, tokensOutput, tokensTotal) {
        // Preços já estão em USD por 1M tokens
        let inputPricePerMillion = 0;
        let outputPricePerMillion = 0;
        
        // Buscar modelo exato ou similar
        const modelPricing = this.pricing[model];
        if (modelPricing) {
            inputPricePerMillion = modelPricing.input;
            outputPricePerMillion = modelPricing.output;
        } else {
            // Fallback para modelos similares
            if (model.includes('deepseek-reasoner')) {
                inputPricePerMillion = 0.55;
                outputPricePerMillion = 2.19;
            } else if (model.includes('deepseek-chat') || model.includes('deepseek')) {
                inputPricePerMillion = 0.14;
                outputPricePerMillion = 0.28;
            } else if (model.includes('flash')) {
                inputPricePerMillion = 0.000075;
                outputPricePerMillion = 0.0003;
            } else if (model.includes('pro')) {
                inputPricePerMillion = 0.00125;
                outputPricePerMillion = 0.005;
            } else if (model.includes('ultra')) {
                inputPricePerMillion = 0.0025;
                outputPricePerMillion = 0.01;
            } else {
                // Default para Gemini
                inputPricePerMillion = 0.000075;
                outputPricePerMillion = 0.0003;
            }
        }
        
        // Calcular custo (preços já são por 1M tokens)
        const inputCost = tokensInput ? (tokensInput / 1000000) * inputPricePerMillion : 0;
        const outputCost = tokensOutput ? (tokensOutput / 1000000) * outputPricePerMillion : 0;
        const totalCost = inputCost + outputCost;
        
        return {
            inputCost,
            outputCost,
            totalCost,
            tokensInput,
            tokensOutput,
            tokensTotal: tokensTotal || (tokensInput + tokensOutput)
        };
    }
    
    /**
     * Registar custo de uma chamada de API
     */
    async logApiCall({
        service,
        model,
        region = 'global',
        eventId = null,
        tokensInput = 0,
        tokensOutput = 0,
        tokensTotal = 0,
        requestDurationMs = null,
        metadata = {}
    }) {
        try {
            const { totalCost, inputCost, outputCost } = this.calculateCost(
                service, 
                model, 
                tokensInput, 
                tokensOutput, 
                tokensTotal
            );
            
            if (totalCost <= 0) {
                console.log(`💰 [COST-TRACKER] Custo zero ou inválido para ${service}/${model} - pulando registro`);
                return;
            }
            
            // Mapear serviço para nome padronizado
            let serviceName = service;
            if (service === 'gemini') {
                serviceName = 'google-vertex';
            } else if (service === 'deepseek') {
                serviceName = 'deepseek';
            } else if (service === 'openai') {
                serviceName = 'openai';
            }
            
            const costRecord = {
                timestamp: new Date().toISOString(),
                service: serviceName,
                model: model,
                region: region,
                environment: 'production',
                cost_amount: totalCost,
                currency: 'USD',
                tokens_input: tokensInput || 0,
                tokens_output: tokensOutput || 0,
                tokens_total: tokensTotal || 0,
                request_duration_ms: requestDurationMs,
                event_id: eventId,
                cost_type: 'api_call',
                sync_source: 'application',
                metadata: {
                    ...metadata,
                    input_cost: inputCost,
                    output_cost: outputCost,
                    total_cost: totalCost
                }
            };
            
            const { data, error } = await this.supabase
                .from('ai_cost_stats')
                .insert(costRecord)
                .select();
            
            if (error) {
                console.error('💰 [COST-TRACKER] ❌ Erro ao registar custo:', error);
            } else {
                console.log(`💰 [COST-TRACKER] ✅ Custo registado: $${totalCost.toFixed(6)} (${service}/${model})`);
            }
            
        } catch (error) {
            console.error('💰 [COST-TRACKER] ❌ Erro ao registar custo:', error);
        }
    }
    
    /**
     * Estimar tokens de uma imagem baseado no tamanho
     */
    estimateImageTokens(imageData) {
        // Estimativa: ~85 tokens por base64 image
        // Uma imagem típica tem ~170 tokens (base64 + tamanho)
        try {
            const size = imageData ? imageData.length : 0;
            // Aproximação: 1 token por 4 caracteres de base64
            return Math.ceil(size / 4);
        } catch {
            return 1000; // Estimativa conservadora
        }
    }
}

module.exports = AICostTracker;

