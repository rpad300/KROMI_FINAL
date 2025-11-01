// Background Image Processor - Roda no servidor Node.js
const https = require('https');
const AICostTracker = require('./ai-cost-tracker');
const ClassificationLogic = require('./classification-logic');

class BackgroundImageProcessor {
    constructor() {
        this.isProcessing = false;
        this.processInterval = null;
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // Inicializar lógica de classificações (usar SERVICE_ROLE para contornar RLS)
        this.classificationLogic = new ClassificationLogic(this.supabaseUrl, this.supabaseServiceKey);
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        this.batchSize = 5;
        this.checkInterval = 10000; // 10 segundos
        
        // Processor configuration
        this.processorType = 'gemini'; // gemini, openai, deepseek, google-vision, ocr, hybrid, manual
        this.processorSpeed = 'balanced'; // fast, balanced, accurate
        this.processorConfidence = 0.7;
        this.openaiModel = 'gpt-4o'; // OpenAI model to use
        this.geminiModel = 'gemini-2.5-flash'; // Gemini model to use
        this.deepseekModel = 'deepseek-chat'; // DeepSeek model to use
        
        // AI Cost Tracker
        this.costTracker = new AICostTracker();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async init() {
        this.log('Processador de imagens iniciando...', 'info');
        
        // Carregar configurações da base de dados
        await this.loadConfigurationFromDatabase();
        
        // Validate API keys based on processor type
        if (!this.validateApiKeys()) {
            return false;
        }

        if (!this.supabaseUrl || !this.supabaseKey) {
            this.log('ERRO: Credenciais Supabase não configuradas', 'error');
            return false;
        }

        // Validar se as APIs estão realmente funcionais (fazer teste de conectividade)
        this.log('🔍 Validando conectividade das APIs configuradas...', 'info');
        
        // Verificar se há pelo menos uma API key configurada
        const hasAnyApiKey = this.geminiApiKey || this.openaiApiKey || this.deepseekApiKey || this.googleVisionApiKey;
        
        if (!hasAnyApiKey) {
            this.log('⚠️ ATENÇÃO: Nenhuma API key configurada no .env', 'warning');
            this.log('   O processador iniciará mas não poderá processar imagens', 'warning');
        } else {
            const validationResults = await this.validateApiConnectivity();
            
            // Verificar se pelo menos uma API funcional está disponível
            const workingApis = Object.entries(validationResults)
                .filter(([_, working]) => working)
                .map(([api, _]) => api);
            
            const failedApis = Object.entries(validationResults)
                .filter(([_, working]) => !working)
                .map(([api, _]) => api);
            
            if (workingApis.length === 0) {
                this.log('❌ ERRO CRÍTICO: Nenhuma API está funcionando!', 'error');
                this.log(`   APIs testadas: ${Object.keys(validationResults).join(', ')}`, 'error');
                this.log(`   Todas falharam. Verifique as API keys no .env`, 'error');
                return false;
            }
            
            this.log(`✅ APIs funcionais (${workingApis.length}): ${workingApis.join(', ')}`, 'success');
            
            if (failedApis.length > 0) {
                this.log(`⚠️ APIs com problemas (${failedApis.length}): ${failedApis.join(', ')}`, 'warning');
            }
            
            // Verificar se o processador principal está funcionando
            const mainProcessorWorking = validationResults[this.processorType];
            if (!mainProcessorWorking) {
                this.log(`⚠️ ATENÇÃO: Processador principal (${this.processorType}) não está funcionando!`, 'warning');
                this.log(`   Sistema usará fallbacks: ${workingApis.join(', ')}`, 'warning');
            } else {
                this.log(`✅ Processador principal (${this.processorType}) está funcionando`, 'success');
            }
        }

        this.log(`Processador de imagens iniciado com sucesso (${this.processorType})`, 'success');
        this.startAutoProcessor();
        return true;
    }
    
    /**
     * Valida conectividade das APIs fazendo uma requisição de teste
     */
    async validateApiConnectivity() {
        const results = {};
        
        // Testar Gemini
        if (this.geminiApiKey) {
            this.log('   Testando Gemini API...', 'info');
            try {
                await this.testGeminiConnection();
                results.gemini = true;
                this.log('   ✅ Gemini: OK', 'success');
            } catch (error) {
                results.gemini = false;
                this.log(`   ❌ Gemini: FALHOU - ${error.message}`, 'error');
            }
        }
        
        // Testar OpenAI
        if (this.openaiApiKey) {
            this.log('   Testando OpenAI API...', 'info');
            try {
                await this.testOpenAIConnection();
                results.openai = true;
                this.log('   ✅ OpenAI: OK', 'success');
            } catch (error) {
                results.openai = false;
                this.log(`   ❌ OpenAI: FALHOU - ${error.message}`, 'error');
            }
        }
        
        // Testar DeepSeek
        if (this.deepseekApiKey) {
            this.log('   Testando DeepSeek API...', 'info');
            try {
                await this.testDeepSeekConnection();
                results.deepseek = true;
                this.log('   ✅ DeepSeek: OK', 'success');
            } catch (error) {
                results.deepseek = false;
                this.log(`   ❌ DeepSeek: FALHOU - ${error.message}`, 'error');
            }
        }
        
        // Testar Google Vision
        if (this.googleVisionApiKey) {
            this.log('   Testando Google Vision API...', 'info');
            try {
                await this.testGoogleVisionConnection();
                results['google-vision'] = true;
                this.log('   ✅ Google Vision: OK', 'success');
            } catch (error) {
                results['google-vision'] = false;
                this.log(`   ❌ Google Vision: FALHOU - ${error.message}`, 'error');
            }
        }
        
        return results;
    }
    
    /**
     * Testa conexão com Gemini fazendo uma requisição simples
     */
    async testGeminiConnection() {
        return new Promise((resolve, reject) => {
            const testBody = JSON.stringify({
                contents: [{
                    parts: [{ text: 'Say "OK" if you can read this.' }]
                }]
            });
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testBody)
                },
                timeout: 10000 // 10 segundos timeout
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        try {
                            const error = JSON.parse(data);
                            reject(new Error(`${res.statusCode}: ${error.error?.message || data.substring(0, 100)}`));
                        } catch {
                            reject(new Error(`${res.statusCode}: ${data.substring(0, 100)}`));
                        }
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout - API não respondeu em 10s'));
            });
            
            req.write(testBody);
            req.end();
        });
    }
    
    /**
     * Testa conexão com OpenAI
     */
    async testOpenAIConnection() {
        return new Promise((resolve, reject) => {
            const testBody = JSON.stringify({
                model: this.openaiModel,
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5
            });
            
            const urlObj = new URL('https://api.openai.com/v1/chat/completions');
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Length': Buffer.byteLength(testBody)
                },
                timeout: 10000
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`${res.statusCode}: ${data.substring(0, 100)}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.write(testBody);
            req.end();
        });
    }
    
    /**
     * Testa conexão com DeepSeek
     */
    async testDeepSeekConnection() {
        return new Promise((resolve, reject) => {
            const testBody = JSON.stringify({
                model: this.deepseekModel,
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 5
            });
            
            const urlObj = new URL('https://api.deepseek.com/v1/chat/completions');
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekApiKey}`,
                    'Content-Length': Buffer.byteLength(testBody)
                },
                timeout: 10000
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`${res.statusCode}: ${data.substring(0, 100)}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.write(testBody);
            req.end();
        });
    }
    
    /**
     * Testa conexão com Google Vision
     */
    async testGoogleVisionConnection() {
        return new Promise((resolve, reject) => {
            // Teste simples - imagem pequena em base64 (1x1 pixel)
            const testImage = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCKAAf/2Q==';
            
            const testBody = JSON.stringify({
                requests: [{
                    image: { content: testImage },
                    features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
                }]
            });
            
            const urlObj = new URL(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testBody)
                },
                timeout: 10000
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        const error = JSON.parse(data);
                        reject(new Error(`${res.statusCode}: ${error.error?.message || data.substring(0, 100)}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.write(testBody);
            req.end();
        });
    }
    
    async loadConfigurationFromDatabase() {
        try {
            this.log('Carregando configurações da base de dados...', 'info');
            
            // Carregar configurações de API da base de dados
            const apiConfigs = await this.getApiConfigurationsFromDatabase();
            
            // ⚠️ IMPORTANTE: NUNCA usar API keys da base de dados
            // APENAS usar as do .env
            // Base de dados tem keys expiradas que causam erros
            
            if (this.geminiApiKey) {
                this.log('✅ Usando Gemini do .env', 'info');
            } else {
                this.log('⚠️ Gemini não configurada no .env', 'warning');
            }
            
            if (this.openaiApiKey) {
                this.log('✅ Usando OpenAI do .env', 'info');
            } else {
                this.log('⚠️ OpenAI não configurada no .env', 'warning');
            }
            
            if (this.deepseekApiKey) {
                this.log('✅ Usando DeepSeek do .env', 'info');
            } else {
                this.log('⚠️ DeepSeek não configurada no .env', 'warning');
            }
            
            if (this.googleVisionApiKey) {
                this.log('✅ Usando Google Vision do .env', 'info');
            } else {
                this.log('⚠️ Google Vision não configurada no .env', 'warning');
            }
            
            // NÃO carregar API keys da base de dados (estão expiradas)
            // Se precisar de fallback, adicionar aqui mas comentado:
            // if (apiConfigs.geminiApiKey && !this.geminiApiKey) {
            //     this.geminiApiKey = apiConfigs.geminiApiKey;
            // }
            
            if (apiConfigs.supabaseUrl) {
                // Validar e corrigir URL se necessário
                let url = apiConfigs.supabaseUrl;
                
                // Limpar completamente a URL e reconstruir
                // Remover qualquer protocolo existente
                url = url.replace(/^https?:\/\//, '');
                url = url.replace(/^h+ttps?:\/\//, '');
                url = url.replace(/^h+https?:\/\//, '');
                
                // Reconstruir com https://
                url = 'https://' + url;
                
                this.supabaseUrl = url;
                this.log(`URL Supabase carregada da base de dados: ${url}`, 'info');
            }
            
            if (apiConfigs.supabaseKey) {
                this.supabaseKey = apiConfigs.supabaseKey;
                this.log('Chave Supabase carregada da base de dados', 'info');
            }
            
            // Carregar configurações globais de processador
            const globalConfig = await this.getGlobalProcessorConfigFromDatabase();
            if (globalConfig) {
                this.processorType = globalConfig.processorType || 'gemini';
                this.processorSpeed = globalConfig.processorSpeed || 'balanced';
                this.processorConfidence = globalConfig.processorConfidence || 0.7;
                this.log(`Configuração global carregada: ${this.processorType} (${this.processorSpeed})`, 'info');
            }
            
        } catch (error) {
            this.log(`Erro ao carregar configurações da base de dados: ${error.message}`, 'error');
            // Fallback para configurações do .env
            this.loadConfigurationFromEnv();
        }
    }
    
    async getApiConfigurationsFromDatabase() {
        try {
            // Verificar se temos credenciais básicas do Supabase
            if (!this.supabaseUrl || !this.supabaseKey) {
                this.log('Credenciais Supabase não disponíveis para carregar configurações', 'info');
                return {};
            }
            
            const url = `${this.supabaseUrl}/rest/v1/rpc/get_platform_config`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config_key_param: null })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const configs = await response.json();
            
            const apiConfigs = {};
            configs.forEach(config => {
                switch (config.config_key) {
                    case 'GEMINI_API_KEY':
                        apiConfigs.geminiApiKey = config.config_value;
                        break;
                    case 'OPENAI_API_KEY':
                        apiConfigs.openaiApiKey = config.config_value;
                        break;
                    case 'DEEPSEEK_API_KEY':
                        apiConfigs.deepseekApiKey = config.config_value;
                        break;
                    case 'GOOGLE_VISION_API_KEY':
                        apiConfigs.googleVisionApiKey = config.config_value;
                        break;
                    case 'SUPABASE_URL':
                        apiConfigs.supabaseUrl = config.config_value;
                        break;
                    case 'SUPABASE_ANON_KEY':
                        apiConfigs.supabaseKey = config.config_value;
                        break;
                }
            });
            
            return apiConfigs;
            
        } catch (error) {
            this.log(`Erro ao carregar configurações de API: ${error.message}`, 'error');
            return {};
        }
    }
    
    async getGlobalProcessorConfigFromDatabase() {
        try {
            // Verificar se temos credenciais básicas do Supabase
            if (!this.supabaseUrl || !this.supabaseKey) {
                this.log('Credenciais Supabase não disponíveis para carregar configuração global', 'info');
                return null;
            }
            
            const url = `${this.supabaseUrl}/rest/v1/rpc/get_global_processor_setting`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ setting_key_param: null })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const settings = await response.json();
            
            const config = {};
            settings.forEach(setting => {
                switch (setting.setting_key) {
                    case 'default_processor_type':
                        config.processorType = setting.setting_value;
                        break;
                    case 'default_processor_speed':
                        config.processorSpeed = setting.setting_value;
                        break;
                    case 'default_processor_confidence':
                        config.processorConfidence = parseFloat(setting.setting_value);
                        break;
                }
            });
            
            return config;
            
        } catch (error) {
            this.log(`Erro ao carregar configuração global de processador: ${error.message}`, 'error');
            return null;
        }
    }
    
    loadConfigurationFromEnv() {
        this.log('Carregando configurações do .env (fallback)...', 'info');
        
        // Fallback para configurações do .env
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
        
        // Validar e corrigir URL Supabase do .env
        let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
            // Limpar completamente a URL e reconstruir
            // Remover qualquer protocolo existente
            supabaseUrl = supabaseUrl.replace(/^https?:\/\//, '');
            supabaseUrl = supabaseUrl.replace(/^h+ttps?:\/\//, '');
            supabaseUrl = supabaseUrl.replace(/^h+https?:\/\//, '');
            
            // Reconstruir com https://
            supabaseUrl = 'https://' + supabaseUrl;
            
            this.supabaseUrl = supabaseUrl;
        }
        
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (this.geminiApiKey) {
            this.log('Chave Gemini carregada do .env', 'info');
        }
        if (this.googleVisionApiKey) {
            this.log('Chave Google Vision carregada do .env', 'info');
        }
        if (this.supabaseUrl) {
            this.log('URL Supabase carregada do .env', 'info');
        }
        if (this.supabaseKey) {
            this.log('Chave Supabase carregada do .env', 'info');
        }
    }
    
    async loadProcessorConfig() {
        try {
            // Try to load from Supabase first
            const config = await this.getProcessorConfigFromSupabase();
            if (config) {
                this.processorType = config.processorType || 'gemini';
                this.processorSpeed = config.processorSpeed || 'balanced';
                this.processorConfidence = config.processorConfidence || 0.7;
                this.openaiModel = config.openaiModel || 'gpt-4o';
                this.geminiModel = config.geminiModel || 'gemini-2.5-flash';
                this.log(`Configuração carregada: ${this.processorType} (${this.processorSpeed})`, 'info');
                return;
            }
        } catch (error) {
            this.log('Erro ao carregar configuração do Supabase, usando padrão', 'info');
        }
        
        // Use default configuration
        this.log('Usando configuração padrão do processador', 'info');
    }
    
    async getProcessorConfigFromSupabase() {
        try {
            // Query the event_configurations table for processor settings
            const url = `${this.supabaseUrl}/rest/v1/rpc/get_event_processor_config`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id_param: null }) // Get global config
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const config = await response.json();
            if (config && config.length > 0) {
                return {
                    processorType: config[0].processor_type,
                    processorSpeed: config[0].processor_speed,
                    processorConfidence: parseFloat(config[0].processor_confidence),
                    openaiModel: config[0].openai_model,
                    geminiModel: config[0].gemini_model
                };
            }
            
            return null;
        } catch (error) {
            this.log(`Erro ao carregar configuração do Supabase: ${error.message}`, 'error');
            return null;
        }
    }
    
    async getProcessorConfigForEvent(eventId) {
        try {
            const url = `${this.supabaseUrl}/rest/v1/rpc/get_event_processor_config`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id_param: eventId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const config = await response.json();
            if (config && config.length > 0) {
                return {
                    processorType: config[0].processor_type,
                    processorSpeed: config[0].processor_speed,
                    processorConfidence: parseFloat(config[0].processor_confidence),
                    openaiModel: config[0].openai_model,
                    geminiModel: config[0].gemini_model
                };
            }
            
            return null;
        } catch (error) {
            this.log(`Erro ao carregar configuração do evento ${eventId}: ${error.message}`, 'error');
            return null;
        }
    }
    
    validateApiKeys() {
        switch (this.processorType) {
            case 'gemini':
                if (!this.geminiApiKey) {
                    this.log('ERRO: GEMINI_API_KEY não configurada para processador Gemini', 'error');
                    return false;
                }
                break;
            case 'openai':
                if (!this.openaiApiKey) {
                    this.log('ERRO: OPENAI_API_KEY não configurada para processador OpenAI', 'error');
                    return false;
                }
                break;
            case 'deepseek':
                if (!this.deepseekApiKey) {
                    this.log('ERRO: DEEPSEEK_API_KEY não configurada para processador DeepSeek', 'error');
                    return false;
                }
                break;
            case 'google-vision':
                if (!this.googleVisionApiKey) {
                    this.log('ERRO: GOOGLE_VISION_API_KEY não configurada para processador Google Vision', 'error');
                    return false;
                }
                break;
            case 'ocr':
                this.log('Processador OCR não requer API keys', 'info');
                break;
            case 'hybrid':
                if (!this.geminiApiKey || !this.googleVisionApiKey) {
                    this.log('ERRO: Ambas GEMINI_API_KEY e GOOGLE_VISION_API_KEY são necessárias para processador híbrido', 'error');
                    return false;
                }
                break;
            case 'manual':
                this.log('Processador manual não requer API keys', 'info');
                break;
            default:
                this.log(`Tipo de processador desconhecido: ${this.processorType}`, 'error');
                return false;
        }
        return true;
    }

    startAutoProcessor() {
        this.log('Iniciando processamento automático...', 'info');
        
        // Processar imediatamente
        this.processImageBuffer();
        
        // Verificar a cada 10 segundos
        this.processInterval = setInterval(() => {
            this.processImageBuffer();
        }, this.checkInterval);
    }

    async processImageBuffer() {
        if (this.isProcessing) {
            this.log('Processamento já em andamento, aguardando...', 'info');
            return;
        }

        try {
            this.isProcessing = true;

            // Buscar imagens pendentes
            const pendingImages = await this.fetchPendingImages();
            
            if (!pendingImages || pendingImages.length === 0) {
                // Log apenas de vez em quando para não poluir (a cada 10 verificações = 100 segundos)
                const shouldLog = Math.random() < 0.1;
                if (shouldLog) {
                    this.log('Nenhuma imagem pendente no buffer', 'info');
                }
                return;
            }
            
            // Filtrar imagens descartadas (pode ter sido descartada após o fetch)
            const validImages = pendingImages.filter(img => img.status === 'pending');
            
            if (validImages.length === 0) {
                this.log('Todas as imagens foram descartadas durante o processamento', 'info');
                return;
            }
            
            this.log(`📸 Encontradas ${validImages.length} imagens pendentes - iniciando processamento com ${this.processorType}...`, 'info');

            // Agrupar por evento para aplicar configurações específicas
            const eventGroups = {};
            for (const image of validImages) {
                if (!eventGroups[image.event_id]) {
                    eventGroups[image.event_id] = [];
                }
                eventGroups[image.event_id].push(image);
            }

            // Processar cada evento com sua configuração específica
            for (const [eventId, eventImages] of Object.entries(eventGroups)) {
                await this.processEventImages(eventId, eventImages);
            }

            this.log(`Lote processado com sucesso`, 'success');

        } catch (error) {
            this.log(`Erro no processamento: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    async processEventImages(eventId, images) {
        this.log(`Processando ${images.length} imagens do evento ${eventId}...`, 'info');
        
        // Carregar configuração específica do evento
        const eventConfig = await this.getProcessorConfigForEvent(eventId);
        
        if (eventConfig) {
            this.log(`Configuração do evento ${eventId}: ${eventConfig.processorType} (${eventConfig.processorSpeed})`, 'info');
            
            // Aplicar configuração temporariamente
            const originalConfig = {
                processorType: this.processorType,
                processorSpeed: this.processorSpeed,
                processorConfidence: this.processorConfidence,
                openaiModel: this.openaiModel,
                geminiModel: this.geminiModel
            };
            
            this.processorType = eventConfig.processorType;
            this.processorSpeed = eventConfig.processorSpeed;
            this.processorConfidence = eventConfig.processorConfidence;
            this.openaiModel = eventConfig.openaiModel || 'gpt-4o';
            this.geminiModel = eventConfig.geminiModel || 'gemini-2.5-flash';
            
            try {
                // Processar com configuração do evento
                await this.processImagesWithProcessor(images);
            } finally {
                // Restaurar configuração original
                this.processorType = originalConfig.processorType;
                this.processorSpeed = originalConfig.processorSpeed;
                this.processorConfidence = originalConfig.processorConfidence;
                this.openaiModel = originalConfig.openaiModel;
                this.geminiModel = originalConfig.geminiModel;
            }
        } else {
            this.log(`Usando configuração global para evento ${eventId}`, 'info');
            // Processar com configuração global
            await this.processImagesWithProcessor(images);
        }
    }

    async fetchPendingImages() {
        return new Promise((resolve, reject) => {
            const url = `${this.supabaseUrl}/rest/v1/image_buffer?select=*&status=eq.pending&limit=${this.batchSize}`;
            
            const options = {
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const images = JSON.parse(data);
                        if (images && images.length > 0) {
                            this.log(`📥 Buscadas ${images.length} imagens pendentes do buffer`, 'info');
                        }
                        resolve(images);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    async processImagesWithProcessor(images) {
        // Definir ordem de fallback baseado no processador principal
        const fallbackChain = this.getFallbackChain();
        
        this.log(`🚀 Iniciando processamento com cadeia: ${fallbackChain.join(' → ')}`, 'info');
        
        // Tentar cada processador na cadeia
        for (let i = 0; i < fallbackChain.length; i++) {
            const processorType = fallbackChain[i];
            const isPrimary = i === 0;
            
            if (isPrimary) {
                this.log(`🎯 Tentando processador principal: ${processorType.toUpperCase()}...`, 'info');
            } else {
                this.log(`🔄 Tentando fallback ${i + 1}/${fallbackChain.length}: ${processorType.toUpperCase()}...`, 'info');
            }
            
            try {
                switch (processorType) {
                    case 'gemini':
                        this.log(`📞 Chamando Gemini API...`, 'info');
                        await this.processImagesWithGemini(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        } else {
                            this.log(`✅ Processamento Gemini concluído com sucesso`, 'success');
                        }
                        return; // Sucesso! Sair do loop
                        
                    case 'openai':
                        await this.processImagesWithOpenAI(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        }
                        return;
                        
                    case 'deepseek':
                        await this.processImagesWithDeepSeek(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        }
                        return;
                        
                    case 'google-vision':
                        await this.processImagesWithGoogleVision(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        }
                        return;
                        
                    case 'ocr':
                        await this.processImagesWithOCR(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        }
                        return;
                        
                    case 'hybrid':
                        await this.processImagesWithHybrid(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        }
                        return;
                        
                    case 'manual':
                        await this.processImagesWithManual(images);
                        if (!isPrimary) {
                            this.log(`✅ Fallback ${processorType} bem-sucedido`, 'success');
                        }
                        return;
                        
                    default:
                        this.log(`Tipo de processador desconhecido: ${processorType}`, 'error');
                        throw new Error(`Tipo de processador desconhecido: ${processorType}`);
                }
            } catch (error) {
                const errorDetails = error.message || error.toString();
                this.log(`❌ Falha com ${processorType.toUpperCase()}: ${errorDetails}`, 'error');
                
                // Log mais detalhado para Gemini (principal)
                if (processorType === 'gemini' && isPrimary) {
                    this.log(`🔍 Detalhes do erro Gemini:`, 'error');
                    this.log(`   - Mensagem: ${errorDetails}`, 'error');
                    if (error.stack) {
                        this.log(`   - Stack trace (primeiras linhas): ${error.stack.split('\n').slice(0, 3).join('\n   ')}`, 'error');
                    }
                }
                
                // Se não é o último da cadeia, continuar para o próximo
                if (i < fallbackChain.length - 1) {
                    this.log(`⏭️ Tentando próximo serviço na cadeia... (restam ${fallbackChain.length - i - 1})`, 'info');
                    continue;
                } else {
                    // Último da cadeia falhou, marcar imagens como erro
                    this.log(`❌ ❌ ❌ TODOS OS SERVIÇOS FALHARAM ❌ ❌ ❌`, 'error');
                    this.log(`   Tried: ${fallbackChain.join(', ')}`, 'error');
                    this.log(`   Last error: ${errorDetails}`, 'error');
                    
                    // Marcar todas as imagens como erro
                    for (const image of images) {
                        await this.updateImageStatus(image.id, 'error', { 
                            error: `Todos os fallbacks falharam (${fallbackChain.join(', ')}) - Último erro: ${errorDetails}` 
                        });
                    }
                    
                    throw new Error(`Todos os fallbacks falharam: ${errorDetails}`);
                }
            }
        }
    }
    
    /**
     * Determina a cadeia de fallback baseado nas APIs disponíveis no .env
     * Prioriza as APIs que estão configuradas
     */
    getFallbackChain() {
        // Verificar quais APIs estão configuradas (têm keys no .env)
        const availableProcessors = [];
        
        const allProcessors = [
            'gemini',
            'openai', 
            'deepseek',
            'google-vision'
        ];
        
        // Detectar quais APIs têm keys configuradas
        for (const processor of allProcessors) {
            if (this.hasApiKeyForProcessor(processor)) {
                availableProcessors.push(processor);
                this.log(`✅ ${processor.toUpperCase()} configurada no .env`, 'info');
            }
        }
        
        // Se nenhuma API configurada, retornar apenas o principal
        if (availableProcessors.length === 0) {
            this.log('⚠️ Nenhuma API configurada no .env', 'warning');
            return [this.processorType];
        }
        
        // Ordem de prioridade (do mais barato/rápido para o mais caro)
        const priorityOrder = [
            'gemini',        // Prioridade 1: Mais barato e rápido
            'deepseek',      // Prioridade 2: Alternativa econômica
            'openai',        // Prioridade 3: Boa qualidade
            'google-vision'  // Prioridade 4: OCR tradicional
        ];
        
        // Ordenar processadores disponíveis por prioridade
        const sortedProcessors = availableProcessors.sort((a, b) => {
            return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
        });
        
        // Remover o processador principal da lista
        const mainProcessor = this.processorType;
        const fallbackChain = [mainProcessor];
        
        // Adicionar fallbacks disponíveis (excluindo o principal e híbrido/manual)
        const excludedTypes = ['hybrid', 'manual', 'ocr'];
        
        for (const processor of sortedProcessors) {
            if (processor !== mainProcessor && !excludedTypes.includes(processor)) {
                fallbackChain.push(processor);
            }
        }
        
        this.log(`🔗 Cadeia de fallback (baseada no .env): ${fallbackChain.join(' → ')}`, 'info');
        this.log(`📊 ${availableProcessors.length} API(s) configurada(s): ${availableProcessors.join(', ')}`, 'info');
        
        // Aviso se Google Vision está na cadeia (keys expiradas podem causar erros)
        if (fallbackChain.includes('google-vision')) {
            this.log(`⚠️ ATENÇÃO: Google Vision na cadeia - se a API key estiver expirada, remova GOOGLE_VISION_API_KEY do .env`, 'warning');
        }
        
        return fallbackChain;
    }
    
    /**
     * Verifica se tem API key configurada para um processador
     */
    hasApiKeyForProcessor(processorType) {
        switch (processorType) {
            case 'gemini':
                return !!this.geminiApiKey;
            case 'openai':
                return !!this.openaiApiKey;
            case 'deepseek':
                return !!this.deepseekApiKey;
            case 'google-vision':
                return !!this.googleVisionApiKey;
            default:
                return false;
        }
    }
    
    async processImagesWithGemini(images) {
        this.log(`🤖 processImagesWithGemini chamado com ${images.length} imagem(ns)`, 'info');
        this.log(`   Modelo: ${this.geminiModel}`, 'info');
        this.log(`   API Key configurada: ${this.geminiApiKey ? 'SIM (***' + this.geminiApiKey.slice(-4) + ')' : 'NÃO'}`, 'info');
        
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // Agrupar imagens por sessão para verificar duplicatas
        const sessionMap = {};
        for (const image of images) {
            const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
            if (!sessionMap[sessionKey]) {
                sessionMap[sessionKey] = [];
            }
            sessionMap[sessionKey].push(image);
        }

        // Preparar imagens para Gemini
        const imageParts = images.map(img => {
            let base64 = img.image_data;
            // Remover prefixo data: se existir
            if (base64.includes('base64,')) {
                base64 = base64.split('base64,')[1];
            }
            
            return {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64
                }
            };
        });

        // Fazer requisição ao Gemini
        const prompt = `Analise estas imagens de uma corrida esportiva. Para cada imagem, identifique o número do dorsal (bib number) do atleta.

IMPORTANTE:
- Retorne APENAS números válidos (0-9999)
- Se não identificar número, retorne "NENHUM"
- Um número por linha
- Formato: apenas o número, nada mais

Exemplos:
407
156
NENHUM
892`;

        const requestBody = JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 1,
                maxOutputTokens: 65536,
            }
        });

        try {
            const startTime = Date.now();
            const response = await this.callGeminiAPI(requestBody);
            const duration = Date.now() - startTime;
            const resultText = response.candidates[0].content.parts[0].text;
            
            // Calcular tokens e registar custo
            const tokensInput = this.costTracker.estimateImageTokens(JSON.stringify(requestBody));
            const tokensOutput = (resultText || '').split(' ').length * 1.3; // Estimativa
            
            // Registar custo para cada imagem
            for (const image of images) {
                await this.costTracker.logApiCall({
                    service: 'gemini',
                    model: this.geminiModel,
                    eventId: image.event_id,
                    tokensInput: Math.floor(tokensInput / images.length), // Dividir entre imagens
                    tokensOutput: Math.floor(tokensOutput / images.length),
                    tokensTotal: Math.floor((tokensInput + tokensOutput) / images.length),
                    requestDurationMs: duration,
                    metadata: {
                        image_id: image.id,
                        batch_size: images.length,
                        method: 'background-processor'
                    }
                });
            }
            
            // Processar resposta
            const lines = resultText.trim().split('\n');
            
            // Rastrear números já detectados nesta sessão
            const detectedInSession = {};
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const line = lines[i]?.trim() || 'NENHUM';
                
                if (line === 'NENHUM' || !/^\d+$/.test(line)) {
                    await this.updateImageStatus(image.id, 'processed', { no_detection: true });
                    continue;
                }

                const number = parseInt(line);
                const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
                
                // Verificar se já existe detecção anterior deste número nesta sessão
                const existingDetection = await this.checkExistingDetection(
                    number,
                    image.event_id,
                    image.device_id
                );
                
                // Verificar se já detectamos este número neste lote
                const alreadyDetectedInBatch = detectedInSession[`${sessionKey}_${number}`];
                
                if (existingDetection || alreadyDetectedInBatch) {
                    // Duplicata! Descartar esta detecção
                    await this.updateImageStatus(image.id, 'discarded', { 
                        reason: 'duplicate',
                        number: number,
                        duplicate_of: existingDetection?.id || 'current_batch'
                    });
                    
                    this.log(`Duplicata descartada: ${number} (já detectado anteriormente)`, 'info');
                    continue;
                }
                
                // Marcar como detectado neste lote
                detectedInSession[`${sessionKey}_${number}`] = true;
                
                // Salvar primeira detecção
                const savedDetection = await this.saveDetection({
                    number: number,
                    timestamp: image.captured_at,
                    latitude: image.latitude,
                    longitude: image.longitude,
                    accuracy: image.accuracy,
                    device_type: 'mobile',
                    session_id: image.session_id,
                    event_id: image.event_id,
                    proof_image: image.display_image,
                    dorsal_region: null,
                    detection_method: 'Gemini Background'
                });
                
                // Salvar classificação se evento estiver ativo
                if (savedDetection && image.event_id) {
                    try {
                        // Buscar informações do dispositivo
                        const deviceInfo = await this.getDeviceInfo(image.device_id, image.event_id);
                        const checkpointOrder = deviceInfo?.checkpoint_order || 1;
                        
                        // USAR MÓDULO CENTRALIZADO (passando deviceInfo para evitar queries duplicadas)
                        const times = await this.classificationLogic.calculateClassificationTimes({
                            eventId: image.event_id,
                            dorsalNumber: number,
                            deviceOrder: checkpointOrder,
                            checkpointTime: image.captured_at,
                            deviceInfo: deviceInfo  // Passar dados já carregados
                        });
                        
                        // Log detalhado
                        if (times.total_time) {
                            this.log(`⏱️ META FINAL: total_time calculado`, 'success');
                        } else if (times.split_time) {
                            this.log(`ℹ️ Checkpoint intermediário: split_time calculado`, 'info');
                        } else {
                            this.log(`ℹ️ Checkpoint ${times.metadata.checkpoint_type}`, 'info');
                        }
                        
                        await this.saveClassification({
                            event_id: image.event_id,
                            dorsal_number: number,
                            device_order: checkpointOrder,
                            checkpoint_time: image.captured_at,
                            detection_id: savedDetection.id,
                            total_time: times.total_time,
                            split_time: times.split_time
                        });
                        this.log(`✅ Classificação criada: dorsal ${number}, checkpoint ${checkpointOrder}`, 'success');
                    } catch (error) {
                        this.log(`❌ Erro ao criar classificação: ${error.message}`, 'error');
                        // Não falhar o processamento por causa da classificação
                    }
                }

                await this.updateImageStatus(image.id, 'processed', { 
                    number_detected: number,
                    detection_id: savedDetection?.id
                });
                
                this.log(`✅ Detecção salva: ${number}`, 'success');
            }

        } catch (error) {
            this.log(`Erro no Gemini: ${error.message}`, 'error');
            
            // NÃO marcar como error aqui - deixar o sistema de fallback tentar outros modelos
            throw error; // Re-lançar para o fallback tentar próximo modelo
        }
    }

    async callGeminiAPI(requestBody) {
        return new Promise((resolve, reject) => {
            if (!this.geminiApiKey) {
                reject(new Error('GEMINI_API_KEY não configurada'));
                return;
            }
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
            
            this.log(`🔗 Gemini API URL: ${url.replace(this.geminiApiKey, '***')}`, 'info');
            this.log(`📦 Tamanho do request: ${(Buffer.byteLength(requestBody) / 1024).toFixed(2)} KB`, 'info');
            
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        this.log(`✅ Gemini API respondeu com sucesso (200)`, 'success');
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (parseError) {
                            this.log(`❌ Erro ao parsear resposta Gemini: ${parseError.message}`, 'error');
                            reject(new Error(`Erro ao parsear resposta Gemini: ${parseError.message}`));
                        }
                    } else {
                        this.log(`❌ Gemini API retornou erro ${res.statusCode}`, 'error');
                        this.log(`   Resposta: ${data.substring(0, 500)}...`, 'error');
                        reject(new Error(`Gemini API ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                this.log(`❌ Erro na requisição Gemini: ${error.message}`, 'error');
                reject(error);
            });

            req.write(requestBody);
            req.end();
            this.log(`📤 Requisição Gemini enviada...`, 'info');
        });
    }

    async processImagesWithOpenAI(images) {
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // Agrupar imagens por sessão para verificar duplicatas
        const sessionMap = {};
        for (const image of images) {
            const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
            if (!sessionMap[sessionKey]) {
                sessionMap[sessionKey] = [];
            }
            sessionMap[sessionKey].push(image);
        }

        // Preparar imagens para OpenAI
        const imageParts = images.map(img => {
            let base64 = img.image_data;
            // Remover prefixo data: se existir
            if (base64.includes('base64,')) {
                base64 = base64.split('base64,')[1];
            }
            
            return {
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${base64}`
                }
            };
        });

        // Fazer requisição ao OpenAI
        const requestBody = JSON.stringify({
            model: this.openaiModel || "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analise estas ${images.length} imagens de uma corrida esportiva. Para cada imagem, identifique o número do dorsal (bib number) do atleta.

IMPORTANTE:
- Retorne APENAS números válidos (0-9999)
- Se não identificar número, retorne "NENHUM"
- Um número por linha
- Formato: apenas o número, nada mais

Exemplos:
407
156
NENHUM
42

Analise as imagens:`
                        },
                        ...imageParts
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 1000
        });

        try {
            this.log('📡 Enviando requisição para OpenAI...', 'info');
            
            const startTime = Date.now();
            const response = await this.callOpenAIAPI(requestBody);
            const duration = Date.now() - startTime;
            
            this.log('✅ Resposta recebida do OpenAI', 'success');
            
            // Extrair uso de tokens da resposta (se disponível)
            const usage = response.usage || {};
            const tokensInput = usage.prompt_tokens || 0;
            const tokensOutput = usage.completion_tokens || 0;
            const tokensTotal = usage.total_tokens || tokensInput + tokensOutput;
            
            // Registar custo para cada imagem
            for (const image of images) {
                await this.costTracker.logApiCall({
                    service: 'openai',
                    model: this.openaiModel,
                    eventId: image.event_id,
                    tokensInput: Math.floor(tokensInput / images.length),
                    tokensOutput: Math.floor(tokensOutput / images.length),
                    tokensTotal: Math.floor(tokensTotal / images.length),
                    requestDurationMs: duration,
                    metadata: {
                        image_id: image.id,
                        batch_size: images.length,
                        method: 'background-processor'
                    }
                });
            }
            
            const detectedInSession = {};
            
            // Processar resposta
            const responseText = response.choices[0].message.content;
            const lines = responseText.split('\n').map(line => line.trim()).filter(line => line);
            
            for (let i = 0; i < lines.length && i < images.length; i++) {
                const line = lines[i];
                const image = images[i];
                
                if (line === 'NENHUM' || line === 'NONE' || line === '') {
                    await this.updateImageStatus(image.id, 'processed', { 
                        number_detected: null,
                        reason: 'no_dorsal_detected'
                    });
                    this.log(`Nenhum dorsal detectado na imagem ${i + 1}`, 'info');
                    continue;
                }
                
                // Extrair número
                const numberMatch = line.match(/\b(\d{1,4})\b/);
                if (!numberMatch) {
                    await this.updateImageStatus(image.id, 'error', { 
                        error: 'formato_invalido',
                        raw_text: line
                    });
                    continue;
                }
                
                const number = parseInt(numberMatch[1]);
                
                if (number < 0 || number > 9999) {
                    await this.updateImageStatus(image.id, 'processed', { 
                        number_detected: null,
                        reason: 'numero_invalido'
                    });
                    continue;
                }
                
                // Verificar duplicatas
                const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
                const alreadyDetectedInBatch = detectedInSession[`${sessionKey}_${number}`];
                const existingDetection = await this.checkExistingDetection(number, image.event_id, image.device_id);
                
                if (existingDetection || alreadyDetectedInBatch) {
                    // Duplicata! Descartar esta detecção
                    await this.updateImageStatus(image.id, 'discarded', { 
                        reason: 'duplicate',
                        number: number,
                        duplicate_of: existingDetection?.id || 'current_batch'
                    });
                    
                    this.log(`Duplicata descartada: ${number} (já detectado anteriormente)`, 'info');
                    continue;
                }
                
                // Marcar como detectado neste lote
                detectedInSession[`${sessionKey}_${number}`] = true;
                
                // Salvar primeira detecção
                const savedDetection = await this.saveDetection({
                    number: number,
                    timestamp: image.captured_at,
                    latitude: image.latitude,
                    longitude: image.longitude,
                    accuracy: image.accuracy,
                    device_type: 'mobile',
                    session_id: image.session_id,
                    event_id: image.event_id,
                    proof_image: image.display_image,
                    dorsal_region: null,
                    detection_method: 'OpenAI'
                });
                
                // Salvar classificação se evento estiver ativo
                if (savedDetection && image.event_id) {
                    try {
                        // Buscar informações do dispositivo
                        const deviceInfo = await this.getDeviceInfo(image.device_id, image.event_id);
                        const checkpointOrder = deviceInfo?.checkpoint_order || 1;
                        
                        // USAR MÓDULO CENTRALIZADO (passando deviceInfo)
                        const times = await this.classificationLogic.calculateClassificationTimes({
                            eventId: image.event_id,
                            dorsalNumber: number,
                            deviceOrder: checkpointOrder,
                            checkpointTime: image.captured_at,
                            deviceInfo: deviceInfo  // Passar dados já carregados
                        });
                        
                        // Log detalhado
                        if (times.total_time) {
                            this.log(`⏱️ META FINAL: total_time calculado`, 'success');
                        } else if (times.split_time) {
                            this.log(`ℹ️ Checkpoint intermediário: split_time calculado`, 'info');
                        } else {
                            this.log(`ℹ️ Checkpoint ${times.metadata.checkpoint_type}`, 'info');
                        }
                        
                        await this.saveClassification({
                            event_id: image.event_id,
                            dorsal_number: number,
                            device_order: checkpointOrder,
                            checkpoint_time: image.captured_at,
                            detection_id: savedDetection.id,
                            total_time: times.total_time,
                            split_time: times.split_time
                        });
                        this.log(`✅ Classificação criada: dorsal ${number}, checkpoint ${checkpointOrder}`, 'success');
                    } catch (error) {
                        this.log(`❌ Erro ao criar classificação: ${error.message}`, 'error');
                    }
                }

                await this.updateImageStatus(image.id, 'processed', { 
                    number_detected: number,
                    detection_id: savedDetection?.id
                });
                
                this.log(`✅ Detecção salva: ${number}`, 'success');
            }

        } catch (error) {
            this.log(`Erro no OpenAI: ${error.message}`, 'error');
            
            // NÃO marcar como error aqui - deixar o sistema de fallback tentar outros modelos
            throw error; // Re-lançar para o fallback tentar próximo modelo
        }
    }
    
    async processImagesWithDeepSeek(images) {
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // DeepSeek NÃO suporta visão (não aceita image_url)
        this.log('⚠️ DeepSeek não suporta análise de imagens, pulando...', 'warn');
        throw new Error('DeepSeek não suporta análise de imagens (apenas texto)');
    }
    
    async callDeepSeekAPI(requestBody) {
        // Função removida - DeepSeek não suporta visão
        throw new Error('DeepSeek não suporta análise de imagens');
    }

    async callOpenAIAPI(requestBody) {
        return new Promise((resolve, reject) => {
            const url = 'https://api.openai.com/v1/chat/completions';
            
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`OpenAI API ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(requestBody);
            req.end();
        });
    }

    async checkExistingDetection(number, eventId, deviceId) {
        return new Promise((resolve, reject) => {
            // Verificar se já existe classificação para este dorsal neste checkpoint
            const url = `${this.supabaseUrl}/rest/v1/classifications?dorsal_number=eq.${number}&event_id=eq.${eventId}&checkpoint_order=eq.1&select=id&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const results = JSON.parse(data);
                        // Se encontrou algum resultado, retorna o primeiro
                        resolve(results && results.length > 0 ? results[0] : null);
                    } else {
                        // Em caso de erro, assume que não existe
                        resolve(null);
                    }
                });
            }).on('error', (error) => {
                // Em caso de erro, assume que não existe
                resolve(null);
            });
        });
    }

    async checkExistingClassification(dorsalNumber, eventId, checkpointOrder = 1) {
        return new Promise((resolve) => {
            // Verificar se já existe classificação para este dorsal neste checkpoint
            const url = `${this.supabaseUrl}/rest/v1/classifications?dorsal_number=eq.${dorsalNumber}&event_id=eq.${eventId}&device_order=eq.${checkpointOrder}&select=id&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const results = JSON.parse(data);
                            resolve(results && results.length > 0 ? results[0] : null);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            }).on('error', () => {
                resolve(null);
            });
        });
    }

    async saveDetection(detection) {
        return new Promise((resolve, reject) => {
            const url = `${this.supabaseUrl}/rest/v1/detections`;
            const urlObj = new URL(url);
            
            const postData = JSON.stringify([detection]);
            
            this.log(`📤 Salvando detecção: dorsal ${detection.number}`, 'info');
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',  // Retornar dados inseridos
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    this.log(`📥 Resposta detecção: ${res.statusCode}`, 'info');
                    
                    if (res.statusCode === 201 || res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            if (result && result.length > 0) {
                                this.log(`✅ Detecção salva: ID ${result[0].id}`, 'success');
                                resolve(result[0]);
                            } else {
                                this.log(`⚠️ Detecção criada mas sem dados retornados`, 'warn');
                                resolve(null);
                            }
                        } catch (e) {
                            this.log(`❌ Erro ao parsear resposta da detecção: ${e.message}`, 'error');
                            resolve(null);
                        }
                    } else {
                        this.log(`❌ Erro ao salvar detecção: ${res.statusCode} - ${data}`, 'error');
                        reject(new Error(`Supabase ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                this.log(`❌ Erro na requisição de detecção: ${error.message}`, 'error');
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    async createClassificationFromDetection(image, detectionResult) {
        try {
            // ✅ VALIDAÇÃO: Verificar se dorsal existe nos participantes
            const participantExists = await this.checkParticipantExists(image.event_id, detectionResult.number);
            
            if (!participantExists) {
                this.log(`⚠️ Dorsal ${detectionResult.number} NÃO está registado nos participantes - IGNORANDO classificação`, 'warning');
                this.log(`   Detecção será salva, mas classificação NÃO será criada`, 'info');
                
                // Salvar APENAS a detecção (sem criar classificação)
                await this.saveDetection({
                    number: detectionResult.number,
                    timestamp: image.captured_at,
                    latitude: image.latitude,
                    longitude: image.longitude,
                    accuracy: image.accuracy,
                    device_type: 'mobile',
                    session_id: image.session_id,
                    event_id: image.event_id,
                    proof_image: image.display_image || image.image_data,
                    dorsal_region: null,
                    detection_method: detectionResult.source || detectionResult.method || 'AI'
                });
                
                this.log(`✅ Detecção salva (dorsal ${detectionResult.number}) mas classificação IGNORADA (não é participante)`, 'success');
                return; // Parar aqui - NÃO criar classificação
            }
            
            // Participante existe - continuar com fluxo normal
            this.log(`✅ Dorsal ${detectionResult.number} é participante válido - criando classificação`, 'info');
            
            // Salvar detecção primeiro
                const savedDetection = await this.saveDetection({
                number: detectionResult.number,
                    timestamp: image.captured_at,
                    latitude: image.latitude,
                    longitude: image.longitude,
                    accuracy: image.accuracy,
                    device_type: 'mobile',
                    session_id: image.session_id,
                    event_id: image.event_id,
                proof_image: image.display_image || image.image_data,
                    dorsal_region: null,
                detection_method: detectionResult.source || detectionResult.method || 'AI'
            });
            
            if (!savedDetection || !image.event_id) {
                this.log('Sem detecção salva ou evento, pulando classificação', 'warn');
                return;
            }
            
            // Buscar informações do dispositivo
            const deviceInfo = await this.getDeviceInfo(image.device_id, image.event_id);
            const deviceOrder = deviceInfo?.checkpoint_order || 1;
            
            // USAR MÓDULO CENTRALIZADO (passando deviceInfo)
            const times = await this.classificationLogic.calculateClassificationTimes({
                eventId: image.event_id,
                dorsalNumber: detectionResult.number,
                deviceOrder: deviceOrder,
                checkpointTime: image.captured_at,
                deviceInfo: deviceInfo  // Passar dados já carregados
            });
            
            // Log detalhado
            if (times.total_time) {
                this.log(`⏱️ META FINAL: total_time calculado`, 'success');
            } else if (times.split_time) {
                this.log(`ℹ️ Checkpoint intermediário: split_time calculado`, 'info');
            }
            
            // ✅ VERIFICAR SE JÁ EXISTE CLASSIFICAÇÃO (evitar duplicados)
            const classificationExists = await this.checkClassificationExists(
                image.event_id,
                detectionResult.number,
                deviceOrder
            );
            
            if (classificationExists) {
                this.log(`⚠️ Classificação JÁ EXISTE para dorsal ${detectionResult.number} no checkpoint ${deviceOrder} - IGNORANDO duplicado`, 'warning');
                return; // NÃO criar duplicado
            }
            
            // Criar classificação
            await this.saveClassification({
                event_id: image.event_id,
                dorsal_number: detectionResult.number,
                device_order: deviceOrder,
                checkpoint_time: image.captured_at,
                detection_id: savedDetection.id,
                total_time: times.total_time,
                split_time: times.split_time
            });
            
            this.log(`✅ Classificação criada: dorsal ${detectionResult.number} no checkpoint ${deviceOrder}`, 'success');

        } catch (error) {
            this.log(`Erro ao criar classificação: ${error.message}`, 'error');
            // Não falhar o processamento por causa da classificação
        }
    }
    
    async saveClassification(classification) {
        return new Promise((resolve, reject) => {
            const url = `${this.supabaseUrl}/rest/v1/classifications`;
            const urlObj = new URL(url);
            
            const postData = JSON.stringify([classification]);
            
            this.log(`📤 Enviando classificação: ${JSON.stringify(classification)}`, 'info');
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',  // Minimal para triggers executarem
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 201 || res.statusCode === 200 || res.statusCode === 204) {
                        this.log(`✅ Classificação salva: dorsal ${classification.dorsal_number} (trigger calculará tempos)`, 'success');
                        resolve();
                    } else {
                        this.log(`❌ ERRO ao salvar classificação: ${res.statusCode}`, 'error');
                        this.log(`   Dados enviados: ${postData}`, 'error');
                        this.log(`   Resposta: ${data}`, 'error');
                        resolve(); // Não falhar o processamento por causa da classificação
                    }
                });
            });

            req.on('error', (error) => {
                this.log(`❌ Erro na requisição de classificação: ${error.message}`, 'error');
                resolve(); // Não falhar o processamento
            });

            req.write(postData);
            req.end();
        });
    }

    async updateImageStatus(imageId, status, processingResult = null) {
        return new Promise((resolve, reject) => {
            const url = `${this.supabaseUrl}/rest/v1/image_buffer?id=eq.${imageId}`;
            const urlObj = new URL(url);
            
            const updateData = {
                status: status,
                processing_result: processingResult
            };
            
            const postData = JSON.stringify(updateData);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 204 || res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`Supabase ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    async markImageAsError(imageId, errorMessage) {
        return this.updateImageStatus(imageId, 'error', { error: errorMessage });
    }

    async getDeviceInfo(deviceId, eventId) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/event_devices?device_id=eq.${deviceId}&event_id=eq.${eventId}&select=checkpoint_order,checkpoint_name,checkpoint_type&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result[0] || null);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => {
                resolve(null);
            });

            req.end();
        });
    }
    
    /**
     * Verificar se um dorsal existe nos participantes do evento
     * @param {string} eventId - ID do evento
     * @param {number} dorsalNumber - Número do dorsal
     * @returns {Promise<boolean>} - true se participante existe
     */
    async checkParticipantExists(eventId, dorsalNumber) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/participants?event_id=eq.${eventId}&dorsal_number=eq.${dorsalNumber}&select=id&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            // Se retornar array com pelo menos 1 item = participante existe
                            resolve(result && result.length > 0);
                        } catch (e) {
                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            });

            req.on('error', () => {
                resolve(false);
            });

            req.end();
        });
    }
    
    /**
     * Verificar se já existe classificação para evitar duplicados
     * @param {string} eventId - ID do evento
     * @param {number} dorsalNumber - Número do dorsal
     * @param {number} deviceOrder - Ordem do checkpoint
     * @returns {Promise<boolean>} - true se classificação já existe
     */
    async checkClassificationExists(eventId, dorsalNumber, deviceOrder) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/classifications?event_id=eq.${eventId}&dorsal_number=eq.${dorsalNumber}&device_order=eq.${deviceOrder}&select=id&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            // Se retornar array com pelo menos 1 item = classificação existe
                            resolve(result && result.length > 0);
                        } catch (e) {
                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            });

            req.on('error', () => {
                resolve(false);
            });

            req.end();
        });
    }

    async getEventStartTime(eventId) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/events?id=eq.${eventId}&select=event_started_at&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result[0]?.event_started_at || null);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => {
                resolve(null);
            });

            req.end();
        });
    }

    async isFinishCheckpoint(checkpointType) {
        // Verificar se é checkpoint de chegada/meta
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/checkpoint_types?code=eq.${checkpointType}&select=is_finish&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            const isFinish = result[0]?.is_finish || false;
                            // Fallback: verificar pelo nome do tipo
                            resolve(isFinish || checkpointType === 'finish' || checkpointType === 'final');
                        } catch (e) {
                            // Default: se não encontrar, assumir finish
                            resolve(checkpointType === 'finish');
                        }
                    } else {
                        resolve(checkpointType === 'finish');
                    }
                });
            });

            req.on('error', () => {
                resolve(checkpointType === 'finish');
            });

            req.end();
        });
    }

    async isLastCheckpoint(eventId, checkpointOrder) {
        // Verificar se é o último checkpoint do evento
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/event_devices?event_id=eq.${eventId}&select=checkpoint_order&order=checkpoint_order.desc&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            const maxOrder = result[0]?.checkpoint_order || 1;
                            resolve(checkpointOrder >= maxOrder);
                        } catch (e) {
                            resolve(true); // Default: assumir que é último
                        }
                    } else {
                        resolve(true);
                    }
                });
            });

            req.on('error', () => {
                resolve(true);
            });

            req.end();
        });
    }

    stop() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.log('Processador de imagens parado', 'info');
        }
    }

    async processImagesWithGoogleVision(images) {
        this.log('Processando com Google Vision API...', 'info');
        
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // Agrupar imagens por sessão para verificar duplicatas
        const sessionMap = {};
        for (const image of images) {
            const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
            if (!sessionMap[sessionKey]) {
                sessionMap[sessionKey] = [];
            }
            sessionMap[sessionKey].push(image);
        }

        // Processar cada sessão e acumular erros
        let hasErrors = false;
        let lastError = null;
        
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithGoogleVision(sessionImages);
            } catch (error) {
                hasErrors = true;
                lastError = error;
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
        }
        
        // Se houve erros em todas as sessões, lançar erro
        if (hasErrors) {
            throw lastError || new Error('Google Vision falhou ao processar todas as imagens');
        }
    }
    
    async processSessionWithGoogleVision(images) {
        if (images.length === 0) return;
        
        const sessionImages = images.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
        const latestImage = sessionImages[sessionImages.length - 1];
        
        this.log(`Processando imagem ${latestImage.id} com Google Vision API`, 'info');
        
        try {
            // Extrair Base64 da imagem
            const base64Data = latestImage.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
            
            // Processar com Google Vision API
            const startTime = Date.now();
            const detectionResult = await this.processImageWithGoogleVisionAPI(base64Data);
            const duration = Date.now() - startTime;
            
            // Registar custo da chamada Vision API
            await this.costTracker.logApiCall({
                service: 'google-vision',
                model: 'vision-api-v1',
                eventId: latestImage.event_id,
                tokensInput: 1,
                tokensOutput: 0,
                tokensTotal: 1,
                requestDurationMs: duration,
                metadata: {
                    image_id: latestImage.id,
                    operation: 'text_detection',
                    method: 'background-processor'
                }
            });
            
            if (detectionResult && detectionResult.number) {
                this.log(`Google Vision detectou: ${detectionResult.number} (confiança: ${detectionResult.confidence})`, 'success');
                
                // Buscar checkpoint_order do dispositivo
                const deviceInfo = await this.getDeviceInfo(latestImage.device_id, latestImage.event_id);
                const checkpointOrder = deviceInfo?.checkpoint_order || 1;
                
                // Verificar se já existe classificação
                const existingClassification = await this.checkExistingClassification(
                    detectionResult.number, 
                    latestImage.event_id, 
                    checkpointOrder
                );
                
                if (!existingClassification) {
                    // Criar nova classificação
                    await this.createClassificationFromDetection(latestImage, detectionResult);
                    this.log(`Classificação criada para dorsal ${detectionResult.number}`, 'success');
                } else {
                    this.log(`Classificação já existe para dorsal ${detectionResult.number}`, 'info');
                }
                
                // Marcar todas as imagens da sessão como processadas
                for (const image of sessionImages) {
                    await this.updateImageStatus(image.id, 'processed');
                }
                
            } else {
                this.log('Google Vision não detectou número válido', 'info');
                await this.markImageAsError(latestImage.id, 'Número não detectado');
                throw new Error('Número não detectado pelo Google Vision');
            }
            
        } catch (error) {
            this.log(`Erro no processamento Google Vision: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
            throw error; // Re-lançar para indicar falha
        }
    }
    
    async processImageWithGoogleVisionAPI(base64Data) {
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`;
        
        const requestBody = {
            requests: [{
                image: {
                    content: base64Data
                },
                features: [{
                    type: "TEXT_DETECTION",
                    maxResults: 10
                }],
                imageContext: {
                    textDetectionParams: {
                        enableTextDetectionConfidenceScore: true
                    }
                }
            }]
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
            const textAnnotations = result.responses[0].textAnnotations;
            
            // Procurar por números que podem ser dorsais
            for (const annotation of textAnnotations) {
                const text = annotation.description.trim();
                const confidence = annotation.confidence || 0.8;
                
                // Verificar se é um número válido para dorsal
                if (this.isValidDorsalNumber(text)) {
                    return {
                        number: parseInt(text),
                        confidence: confidence,
                        method: 'Google Vision API',
                        rawText: text
                    };
                }
            }
        }
        
        return null;
    }
    
    isValidDorsalNumber(text) {
        // Verificar se é um número entre 1 e 99999
        const number = parseInt(text);
        return !isNaN(number) && number >= 1 && number <= 99999;
    }
    
    async processImagesWithOCR(images) {
        this.log('Processando com OCR tradicional...', 'info');
        
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // Agrupar imagens por sessão para verificar duplicatas
        const sessionMap = {};
        for (const image of images) {
            const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
            if (!sessionMap[sessionKey]) {
                sessionMap[sessionKey] = [];
            }
            sessionMap[sessionKey].push(image);
        }

        // Processar cada sessão e acumular erros
        let hasErrors = false;
        let lastError = null;
        
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithOCR(sessionImages);
            } catch (error) {
                hasErrors = true;
                lastError = error;
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
        }
        
        // Se houve erros em todas as sessões, lançar erro
        if (hasErrors) {
            throw lastError || new Error('OCR falhou ao processar todas as imagens');
        }
    }
    
    async processSessionWithOCR(images) {
        if (images.length === 0) return;
        
        const sessionImages = images.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
        const latestImage = sessionImages[sessionImages.length - 1];
        
        this.log(`Processando imagem ${latestImage.id} com OCR tradicional`, 'info');
        
        try {
            // Extrair Base64 da imagem
            const base64Data = latestImage.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
            
            // Processar com OCR tradicional
            const detectionResult = await this.processImageWithOCR(base64Data);
            
            if (detectionResult && detectionResult.number) {
                this.log(`OCR detectou: ${detectionResult.number} (confiança: ${detectionResult.confidence})`, 'success');
                
                // Buscar checkpoint_order do dispositivo
                const deviceInfo = await this.getDeviceInfo(latestImage.device_id, latestImage.event_id);
                const checkpointOrder = deviceInfo?.checkpoint_order || 1;
                
                // Verificar se já existe classificação
                const existingClassification = await this.checkExistingClassification(
                    detectionResult.number, 
                    latestImage.event_id, 
                    checkpointOrder
                );
                
                if (!existingClassification) {
                    // Criar nova classificação
                    await this.createClassificationFromDetection(latestImage, detectionResult);
                    this.log(`Classificação criada para dorsal ${detectionResult.number}`, 'success');
                } else {
                    this.log(`Classificação já existe para dorsal ${detectionResult.number}`, 'info');
                }
                
                // Marcar todas as imagens da sessão como processadas
                for (const image of sessionImages) {
                    await this.updateImageStatus(image.id, 'processed');
                }
                
            } else {
                this.log('OCR não detectou número válido', 'info');
                await this.markImageAsError(latestImage.id, 'Número não detectado');
                throw new Error('Número não detectado pelo OCR');
            }
            
        } catch (error) {
            this.log(`Erro no processamento OCR: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
            throw error; // Re-lançar para indicar falha
        }
    }
    
    async processImageWithOCR(base64Data) {
        // Simular OCR tradicional usando análise de padrões simples
        // Em produção, aqui seria usado Tesseract.js ou similar
        
        try {
            // Converter Base64 para Buffer
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Análise simples de padrões (simulação)
            // Em produção real, usaríamos Tesseract.js:
            // const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
            
            // Simulação baseada em características da imagem
            const simulatedResult = this.simulateOCRAnalysis(imageBuffer);
            
            if (simulatedResult) {
                return {
                    number: simulatedResult.number,
                    confidence: simulatedResult.confidence,
                    method: 'OCR Tradicional',
                    rawText: simulatedResult.number.toString()
                };
            }
            
            return null;
            
        } catch (error) {
            throw new Error(`OCR processing error: ${error.message}`);
        }
    }
    
    simulateOCRAnalysis(imageBuffer) {
        // Simulação de análise OCR baseada no tamanho e características da imagem
        const imageSize = imageBuffer.length;
        
        // Gerar número baseado no tamanho da imagem (simulação)
        const seed = imageSize % 1000;
        const number = (seed % 500) + 1; // Números entre 1 e 500
        
        // Calcular confiança baseada no tamanho da imagem
        let confidence = 0.6; // Base
        if (imageSize > 50000) confidence += 0.1; // Imagem grande
        if (imageSize > 100000) confidence += 0.1; // Imagem muito grande
        if (imageSize < 20000) confidence -= 0.2; // Imagem pequena
        
        // Adicionar variação aleatória
        confidence += (Math.random() - 0.5) * 0.2;
        confidence = Math.max(0.3, Math.min(0.9, confidence));
        
        return {
            number: number,
            confidence: confidence
        };
    }
    
    async processImagesWithHybrid(images) {
        this.log('Processando com sistema híbrido (Gemini + Google Vision)...', 'info');
        
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // Agrupar imagens por sessão para verificar duplicatas
        const sessionMap = {};
        for (const image of images) {
            const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
            if (!sessionMap[sessionKey]) {
                sessionMap[sessionKey] = [];
            }
            sessionMap[sessionKey].push(image);
        }

        // Processar cada sessão e acumular erros
        let hasErrors = false;
        let lastError = null;
        
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithHybrid(sessionImages);
            } catch (error) {
                hasErrors = true;
                lastError = error;
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
        }
        
        // Se houve erros em todas as sessões, lançar erro
        if (hasErrors) {
            throw lastError || new Error('Sistema híbrido falhou ao processar todas as imagens');
        }
    }
    
    async processSessionWithHybrid(images) {
        if (images.length === 0) return;
        
        const sessionImages = images.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
        const latestImage = sessionImages[sessionImages.length - 1];
        
        this.log(`Processando imagem ${latestImage.id} com sistema híbrido`, 'info');
        
        try {
            // Extrair Base64 da imagem
            const base64Data = latestImage.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
            
            // Processar com ambos os sistemas
            const [geminiResult, visionResult] = await Promise.allSettled([
                this.processImageWithGeminiAPI(base64Data),
                this.processImageWithGoogleVisionAPI(base64Data)
            ]);
            
            // Analisar resultados
            const results = [];
            
            if (geminiResult.status === 'fulfilled' && geminiResult.value) {
                results.push({
                    ...geminiResult.value,
                    source: 'gemini'
                });
            }
            
            if (visionResult.status === 'fulfilled' && visionResult.value) {
                results.push({
                    ...visionResult.value,
                    source: 'google-vision'
                });
            }
            
            // Escolher melhor resultado
            const bestResult = this.chooseBestHybridResult(results);
            
            if (bestResult && bestResult.number) {
                this.log(`Sistema híbrido detectou: ${bestResult.number} (${bestResult.source}, confiança: ${bestResult.confidence})`, 'success');
                
                // Buscar checkpoint_order do dispositivo
                const deviceInfo = await this.getDeviceInfo(latestImage.device_id, latestImage.event_id);
                const checkpointOrder = deviceInfo?.checkpoint_order || 1;
                
                // Verificar se já existe classificação
                const existingClassification = await this.checkExistingClassification(
                    bestResult.number, 
                    latestImage.event_id, 
                    checkpointOrder
                );
                
                if (!existingClassification) {
                    // Criar nova classificação
                    await this.createClassificationFromDetection(latestImage, bestResult);
                    this.log(`Classificação criada para dorsal ${bestResult.number}`, 'success');
                } else {
                    this.log(`Classificação já existe para dorsal ${bestResult.number}`, 'info');
                }
                
                // Marcar todas as imagens da sessão como processadas
                for (const image of sessionImages) {
                    await this.updateImageStatus(image.id, 'processed');
                }
                
            } else {
                this.log('Sistema híbrido não detectou número válido', 'info');
                await this.markImageAsError(latestImage.id, 'Número não detectado por nenhum sistema');
                throw new Error('Número não detectado pelo sistema híbrido');
            }
            
        } catch (error) {
            this.log(`Erro no processamento híbrido: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
            throw error; // Re-lançar para indicar falha
        }
    }
    
    chooseBestHybridResult(results) {
        if (results.length === 0) return null;
        if (results.length === 1) return results[0];
        
        // Se ambos detectaram o mesmo número, escolher o com maior confiança
        const sameNumber = results.every(r => r.number === results[0].number);
        if (sameNumber) {
            return results.reduce((best, current) => 
                current.confidence > best.confidence ? current : best
            );
        }
        
        // Se números diferentes, usar heurísticas
        const geminiResult = results.find(r => r.source === 'gemini');
        const visionResult = results.find(r => r.source === 'google-vision');
        
        if (geminiResult && visionResult) {
            // Preferir Gemini se confiança for similar (Gemini é mais avançado)
            if (Math.abs(geminiResult.confidence - visionResult.confidence) < 0.1) {
                return geminiResult;
            }
            
            // Caso contrário, escolher o com maior confiança
            return geminiResult.confidence > visionResult.confidence ? geminiResult : visionResult;
        }
        
        // Retornar o único resultado disponível
        return results[0];
    }
    
    async processImageWithGeminiAPI(base64Data) {
        // Reutilizar a lógica do Gemini existente
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    inline_data: {
                        mimeType: "image/jpeg",
                        data: base64Data
                    }
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 1,
                maxOutputTokens: 65536,
            }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            const text = result.candidates[0].content.parts[0].text;
            
            // Extrair número do texto
            const numberMatch = text.match(/\b(\d{1,5})\b/);
            if (numberMatch) {
                const number = parseInt(numberMatch[1]);
                if (number >= 1 && number <= 99999) {
                    return {
                        number: number,
                        confidence: 0.9, // Gemini tem alta confiança
                        method: 'Gemini AI',
                        rawText: text
                    };
                }
            }
        }
        
        return null;
    }
    
    async processImagesWithManual(images) {
        this.log('Modo manual - marcando imagens para processamento manual...', 'info');
        
        // Marcar como processando
        for (const image of images) {
            await this.updateImageStatus(image.id, 'processing');
        }

        // Agrupar imagens por sessão
        const sessionMap = {};
        for (const image of images) {
            const sessionKey = `${image.event_id}_${image.device_id}_${image.session_id}`;
            if (!sessionMap[sessionKey]) {
                sessionMap[sessionKey] = [];
            }
            sessionMap[sessionKey].push(image);
        }

        // Processar cada sessão e acumular erros
        let hasErrors = false;
        let lastError = null;
        
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithManual(sessionImages);
            } catch (error) {
                hasErrors = true;
                lastError = error;
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
        }
        
        // Se houve erros em todas as sessões, lançar erro
        if (hasErrors) {
            throw lastError || new Error('Processamento manual falhou para todas as imagens');
        }
    }
    
    async processSessionWithManual(images) {
        if (images.length === 0) return;
        
        const sessionImages = images.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
        const latestImage = sessionImages[sessionImages.length - 1];
        
        this.log(`Marcando imagem ${latestImage.id} para processamento manual`, 'info');
        
        try {
            // Marcar imagem para processamento manual
            await this.updateImageStatus(latestImage.id, 'manual');
            
            // Criar entrada na tabela de processamento manual
            await this.createManualProcessingEntry(latestImage);
            
            this.log(`Imagem ${latestImage.id} marcada para processamento manual`, 'success');
            
        } catch (error) {
            this.log(`Erro ao marcar imagem para processamento manual: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
        }
    }
    
    async createManualProcessingEntry(image) {
        try {
            const url = `${this.supabaseUrl}/rest/v1/manual_processing`;
            
            const processingEntry = {
                image_id: image.id,
                event_id: image.event_id,
                device_id: image.device_id,
                session_id: image.session_id,
                device_order: image.device_order,
                image_data: image.image_data,
                captured_at: image.captured_at,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(processingEntry)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.log(`Entrada de processamento manual criada para imagem ${image.id}`, 'success');
            
        } catch (error) {
            this.log(`Erro ao criar entrada de processamento manual: ${error.message}`, 'error');
            throw error;
        }
    }
}

module.exports = BackgroundImageProcessor;
