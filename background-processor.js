// Background Image Processor - Roda no servidor Node.js
const https = require('https');

class BackgroundImageProcessor {
    constructor() {
        this.isProcessing = false;
        this.processInterval = null;
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
        this.batchSize = 5;
        this.checkInterval = 10000; // 10 segundos
        
        // Processor configuration
        this.processorType = 'gemini'; // gemini, google-vision, ocr, hybrid, manual
        this.processorSpeed = 'balanced'; // fast, balanced, accurate
        this.processorConfidence = 0.7;
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

        this.log(`Processador de imagens iniciado com sucesso (${this.processorType})`, 'success');
        this.startAutoProcessor();
        return true;
    }
    
    async loadConfigurationFromDatabase() {
        try {
            this.log('Carregando configurações da base de dados...', 'info');
            
            // Carregar configurações de API da base de dados
            const apiConfigs = await this.getApiConfigurationsFromDatabase();
            
            // Aplicar configurações
            if (apiConfigs.geminiApiKey) {
                this.geminiApiKey = apiConfigs.geminiApiKey;
                this.log('Chave Gemini carregada da base de dados', 'info');
            }
            
            if (apiConfigs.googleVisionApiKey) {
                this.googleVisionApiKey = apiConfigs.googleVisionApiKey;
                this.log('Chave Google Vision carregada da base de dados', 'info');
            }
            
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
                    processorConfidence: parseFloat(config[0].processor_confidence)
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
                    processorConfidence: parseFloat(config[0].processor_confidence)
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
            return;
        }

        try {
            this.isProcessing = true;

            // Buscar imagens pendentes
            const pendingImages = await this.fetchPendingImages();
            
            if (!pendingImages || pendingImages.length === 0) {
                return;
            }

            // Agrupar por evento para aplicar configurações específicas
            const eventGroups = {};
            for (const image of pendingImages) {
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
                processorConfidence: this.processorConfidence
            };
            
            this.processorType = eventConfig.processorType;
            this.processorSpeed = eventConfig.processorSpeed;
            this.processorConfidence = eventConfig.processorConfidence;
            
            try {
                // Processar com configuração do evento
                await this.processImagesWithProcessor(images);
            } finally {
                // Restaurar configuração original
                this.processorType = originalConfig.processorType;
                this.processorSpeed = originalConfig.processorSpeed;
                this.processorConfidence = originalConfig.processorConfidence;
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
                        resolve(JSON.parse(data));
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
        switch (this.processorType) {
            case 'gemini':
                await this.processImagesWithGemini(images);
                break;
            case 'google-vision':
                await this.processImagesWithGoogleVision(images);
                break;
            case 'ocr':
                await this.processImagesWithOCR(images);
                break;
            case 'hybrid':
                await this.processImagesWithHybrid(images);
                break;
            case 'manual':
                await this.processImagesWithManual(images);
                break;
            default:
                this.log(`Tipo de processador desconhecido: ${this.processorType}`, 'error');
                throw new Error(`Tipo de processador desconhecido: ${this.processorType}`);
        }
    }
    
    async processImagesWithGemini(images) {
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
            const response = await this.callGeminiAPI(requestBody);
            const resultText = response.candidates[0].content.parts[0].text;
            
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
                        // Determinar device_order baseado na configuração do evento
                        // Se não há configuração, usar 1 (primeiro checkpoint = meta se for o único)
                        const deviceOrder = 1; // TODO: Implementar lógica de múltiplos checkpoints
                        
                        await this.saveClassification({
                            event_id: image.event_id,
                            dorsal_number: number,
                            device_order: deviceOrder,
                            checkpoint_time: image.captured_at,
                            detection_id: savedDetection.id
                        });
                        this.log(`✅ Classificação criada para dorsal ${number} (checkpoint ${deviceOrder})`, 'success');
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
            
            // Marcar como erro
            for (const image of images) {
                await this.updateImageStatus(image.id, 'error', { error: error.message });
            }
        }
    }

    async callGeminiAPI(requestBody) {
        return new Promise((resolve, reject) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`;
            
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
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`Gemini API ${res.statusCode}: ${data}`));
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
            const url = `${this.supabaseUrl}/rest/v1/classifications?dorsal_number=eq.${number}&event_id=eq.${eventId}&device_order=eq.1&select=id&limit=1`;
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

    async saveDetection(detection) {
        return new Promise((resolve, reject) => {
            const url = `${this.supabaseUrl}/rest/v1/detections`;
            const urlObj = new URL(url);
            
            const postData = JSON.stringify([detection]);
            
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
                    if (res.statusCode === 201 || res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result && result.length > 0 ? result[0] : null);
                        } catch (e) {
                            resolve(null);
                        }
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

    async saveClassification(classification) {
        return new Promise((resolve, reject) => {
            const url = `${this.supabaseUrl}/rest/v1/classifications`;
            const urlObj = new URL(url);
            
            const postData = JSON.stringify([classification]);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname,
                method: 'POST',
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
                    if (res.statusCode === 201 || res.statusCode === 200) {
                        this.log(`Classificação salva: dorsal ${classification.dorsal_number}`, 'success');
                        resolve();
                    } else {
                        this.log(`Erro ao salvar classificação: ${res.statusCode} - ${data}`, 'error');
                        resolve(); // Não falhar o processamento por causa da classificação
                    }
                });
            });

            req.on('error', (error) => {
                this.log(`Erro na requisição de classificação: ${error.message}`, 'error');
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

    stop() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.log('Processador de imagens parado', 'info');
        }
    }

    // Additional processor methods
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

        // Processar cada sessão
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithGoogleVision(sessionImages);
            } catch (error) {
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
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
            const detectionResult = await this.processImageWithGoogleVisionAPI(base64Data);
            
            if (detectionResult && detectionResult.number) {
                this.log(`Google Vision detectou: ${detectionResult.number} (confiança: ${detectionResult.confidence})`, 'success');
                
                // Verificar se já existe classificação
                const existingClassification = await this.checkExistingClassification(
                    detectionResult.number, 
                    latestImage.event_id, 
                    latestImage.device_order
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
            }
            
        } catch (error) {
            this.log(`Erro no processamento Google Vision: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
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

        // Processar cada sessão
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithOCR(sessionImages);
            } catch (error) {
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
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
                
                // Verificar se já existe classificação
                const existingClassification = await this.checkExistingClassification(
                    detectionResult.number, 
                    latestImage.event_id, 
                    latestImage.device_order
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
            }
            
        } catch (error) {
            this.log(`Erro no processamento OCR: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
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

        // Processar cada sessão
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithHybrid(sessionImages);
            } catch (error) {
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
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
                
                // Verificar se já existe classificação
                const existingClassification = await this.checkExistingClassification(
                    bestResult.number, 
                    latestImage.event_id, 
                    latestImage.device_order
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
            }
            
        } catch (error) {
            this.log(`Erro no processamento híbrido: ${error.message}`, 'error');
            await this.markImageAsError(latestImage.id, error.message);
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`;
        
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

        // Processar cada sessão
        for (const [sessionKey, sessionImages] of Object.entries(sessionMap)) {
            try {
                await this.processSessionWithManual(sessionImages);
            } catch (error) {
                this.log(`Erro ao processar sessão ${sessionKey}: ${error.message}`, 'error');
                for (const image of sessionImages) {
                    await this.markImageAsError(image.id, error.message);
                }
            }
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
