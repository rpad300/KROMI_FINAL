class ImageProcessor {
    constructor() {
        this.isRunning = false;
        this.processInterval = null;
        this.autoMode = true; // Modo automático ativado por padrão
        this.isProcessingBuffer = false; // Evitar múltiplas execuções simultâneas
        this.stats = {
            queueLength: 0,
            processingCount: 0,
            completedCount: 0,
            errorCount: 0,
            totalProcessed: 0,
            avgProcessingTime: 0,
            processingTimes: []
        };
        
        this.setupElements();
        this.setupEventListeners();
        this.initSupabase();
        this.startStatusUpdates();
        
        // Iniciar automaticamente após inicialização
        setTimeout(() => {
            this.startAutoProcessor();
        }, 2000);
    }
    
    setupElements() {
        this.startProcessorBtn = document.getElementById('startProcessorBtn');
        this.stopProcessorBtn = document.getElementById('stopProcessorBtn');
        this.clearQueueBtn = document.getElementById('clearQueueBtn');
        this.clearBufferBtn = document.getElementById('clearBufferBtn');
        this.clearLogBtn = document.getElementById('clearLogBtn');
        
        // Elementos de status
        this.queueLength = document.getElementById('queueLength');
        this.processingCount = document.getElementById('processingCount');
        this.completedCount = document.getElementById('completedCount');
        this.errorCount = document.getElementById('errorCount');
        this.totalProcessed = document.getElementById('totalProcessed');
        this.avgProcessingTime = document.getElementById('avgProcessingTime');
        
        // Log
        this.logEntries = document.getElementById('logEntries');
    }
    
    setupEventListeners() {
        this.startProcessorBtn.addEventListener('click', () => this.startProcessor());
        this.stopProcessorBtn.addEventListener('click', () => this.stopProcessor());
        this.clearQueueBtn.addEventListener('click', () => this.clearQueue());
        this.clearBufferBtn.addEventListener('click', () => this.clearBuffer());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
    }
    
    async initSupabase() {
        try {
            console.log('🔍 Inicializando Supabase...');
            this.supabaseClient = new SupabaseClient();
            await this.supabaseClient.init();
            console.log('✅ Supabase inicializado');
            this.log('✅ Supabase inicializado', 'success');
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            this.log('❌ Erro ao inicializar Supabase: ' + error.message, 'error');
        }
    }
    
    async startAutoProcessor() {
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;
        this.autoMode = true;
        this.updateButtonStates();
        
        this.log('🤖 Processador automático iniciado', 'success');
        
        // Processar a cada 3 segundos (mais frequente para modo automático)
        this.processInterval = setInterval(async () => {
            await this.processImageBuffer();
        }, 3000);
        
        // Processar imediatamente
        await this.processImageBuffer();
    }
    
    async startProcessor() {
        if (this.isRunning) {
            this.log('⚠️ Processador já está rodando', 'warning');
            return;
        }
        
        this.isRunning = true;
        this.autoMode = false; // Modo manual
        this.updateButtonStates();
        
        this.log('🚀 Processador manual iniciado', 'success');
        
        // Processar a cada 5 segundos
        this.processInterval = setInterval(async () => {
            await this.processImageBuffer();
        }, 5000);
        
        // Processar imediatamente
        await this.processImageBuffer();
    }
    
    async stopProcessor() {
        if (!this.isRunning) {
            this.log('⚠️ Processador já está parado', 'warning');
            return;
        }
        
        this.isRunning = false;
        this.autoMode = false;
        this.updateButtonStates();
        
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        
        this.log('⏹️ Processador parado', 'info');
    }
    
    updateButtonStates() {
        if (this.isRunning) {
            this.startProcessorBtn.disabled = true;
            this.stopProcessorBtn.disabled = false;
            
            if (this.autoMode) {
                this.startProcessorBtn.textContent = '🤖 Automático Ativo';
                this.startProcessorBtn.className = 'btn primary disabled';
            } else {
                this.startProcessorBtn.textContent = '🚀 Manual Ativo';
                this.startProcessorBtn.className = 'btn primary disabled';
            }
        } else {
            this.startProcessorBtn.disabled = false;
            this.stopProcessorBtn.disabled = true;
            this.startProcessorBtn.textContent = '🚀 Iniciar Manual';
            this.startProcessorBtn.className = 'btn primary';
        }
        
        // Atualizar indicador automático
        const autoIndicator = document.querySelector('.auto-indicator');
        if (autoIndicator) {
            if (this.isRunning && this.autoMode) {
                autoIndicator.style.display = 'inline-block';
                autoIndicator.querySelector('.auto-text').textContent = 'Modo Automático Ativo';
                autoIndicator.querySelector('.auto-description').textContent = 'Processa automaticamente quando há imagens pendentes';
            } else if (this.isRunning && !this.autoMode) {
                autoIndicator.style.display = 'inline-block';
                autoIndicator.querySelector('.auto-text').textContent = 'Modo Manual Ativo';
                autoIndicator.querySelector('.auto-description').textContent = 'Processamento controlado manualmente';
            } else {
                autoIndicator.style.display = 'none';
            }
        }
    }
    
    async processImageBuffer() {
        // Evitar múltiplas execuções simultâneas
        if (this.isProcessingBuffer) {
            console.log('⚠️ Processamento de buffer já em andamento, pulando...');
            return;
        }
        
        this.isProcessingBuffer = true;
        
        try {
            // Buscar imagens pendentes (status = 'pending')
            const { data: images, error } = await this.supabaseClient.supabase
                .from('image_buffer')
                .select('*')
                .eq('status', 'pending')
                .order('captured_at', { ascending: true })
                .limit(5); // Processar 5 imagens por vez
            
            if (error) {
                throw new Error(`Erro ao buscar imagens: ${error.message}`);
            }
            
            if (!images || images.length === 0) {
                this.stats.queueLength = 0;
                this.updateStatus();
                
                // No modo automático, se não há imagens, reduzir frequência
                if (this.autoMode && this.processInterval) {
                    clearInterval(this.processInterval);
                    this.processInterval = setInterval(async () => {
                        await this.processImageBuffer();
                    }, 10000); // 10 segundos quando não há imagens
                }
                return;
            }
            
            // Se há imagens e estamos em modo automático, aumentar frequência
            if (this.autoMode && this.processInterval) {
                clearInterval(this.processInterval);
                this.processInterval = setInterval(async () => {
                    await this.processImageBuffer();
                }, 3000); // 3 segundos quando há imagens
            }
            
            this.stats.queueLength = images.length;
            this.updateStatus();
            
            this.log(`📋 Processando ${images.length} imagens...`, 'info');
            
            // Marcar como processando
            const imageIds = images.map(img => img.id);
            await this.supabaseClient.supabase
                .from('image_buffer')
                .update({ status: 'processing' })
                .in('id', imageIds);
            
            this.stats.processingCount = images.length;
            this.updateStatus();
            
            // Processar com Gemini
            const startTime = Date.now();
            await this.processImagesWithGemini(images);
            const processingTime = Date.now() - startTime;
            
            // Atualizar estatísticas
            this.stats.processingTimes.push(processingTime);
            if (this.stats.processingTimes.length > 10) {
                this.stats.processingTimes.shift(); // Manter apenas os últimos 10
            }
            
            this.stats.completedCount += images.length;
            this.stats.totalProcessed += images.length;
            this.stats.processingCount = 0;
            
            this.updateStatus();
            
            this.log(`✅ Processadas ${images.length} imagens em ${processingTime}ms`, 'success');
            
        } catch (error) {
            console.error('❌ Erro no processamento:', error);
            this.log('❌ Erro no processamento: ' + error.message, 'error');
            this.stats.errorCount++;
            this.stats.processingCount = 0;
            this.updateStatus();
        } finally {
            this.isProcessingBuffer = false;
        }
    }
    
    async processImagesWithGemini(images) {
        if (!images || images.length === 0) return;
        
        try {
            // Preparar dados para Gemini
            const imageData = images.map(img => {
                // Remover qualquer prefixo data:image/...;base64, da string Base64
                let cleanBase64 = img.image_data;
                if (cleanBase64.includes(',')) {
                    cleanBase64 = cleanBase64.split(',')[1];
                }
                
                return {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: cleanBase64
                    }
                };
            });
            
            const requestBody = {
                contents: [{
                    parts: [
                        {
                            text: `Analise estas ${images.length} imagens de corrida e identifique números de dorsais (bib numbers). 

INSTRUÇÕES:
1. Procure por números de dorsais nas imagens
2. Cada linha deve conter apenas o número encontrado na imagem correspondente
3. Se não encontrar número, escreva "NENHUM"
4. Se encontrar múltiplos números, escreva apenas o mais visível
5. Responda apenas com os números, um por linha, na ordem das imagens

FORMATO DE RESPOSTA:
123
456
NENHUM
789

Analise as imagens:`
                        },
                        ...imageData
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 65536  // Máximo permitido pelo Gemini 2.5 Flash
                }
            };
            
            // Usar a fila Gemini
            const geminiKey = await this.getGeminiKey();
            const result = await window.geminiQueue.addRequest({
                geminiKey: geminiKey,
                requestBody: requestBody
            });
            
            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
                throw new Error('Resposta inválida do Gemini');
            }
            
            const responseText = result.candidates[0].content.parts[0].text;
            const lines = responseText.trim().split('\n');
            
            // Processar cada imagem
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const line = lines[i] || 'NENHUM';
                
                if (line.trim().toUpperCase() === 'NENHUM' || !line.trim()) {
                    // Marcar como descartada
                    await this.supabaseClient.supabase
                        .from('image_buffer')
                        .update({ 
                            status: 'discarded',
                            processed_at: new Date().toISOString(),
                            processing_result: 'Nenhum número detectado'
                        })
                        .eq('id', image.id);
                    
                    this.log(`📷 Imagem ${i + 1}: Nenhum número detectado`, 'info');
                    continue;
                }
                
                // Extrair número
                const numberMatch = line.match(/\d+/);
                if (!numberMatch) {
                    // Marcar como descartada
                    await this.supabaseClient.supabase
                        .from('image_buffer')
                        .update({ 
                            status: 'discarded',
                            processed_at: new Date().toISOString(),
                            processing_result: 'Número inválido: ' + line
                        })
                        .eq('id', image.id);
                    
                    this.log(`📷 Imagem ${i + 1}: Número inválido - "${line}"`, 'warning');
                    continue;
                }
                
                const number = parseInt(numberMatch[0]);
                
                // Log para debug
                console.log(`📊 Salvando detecção: número=${number}, event_id=${image.event_id}`);
                
                // Salvar detecção
                const { error: saveError } = await this.supabaseClient.supabase
                    .from('detections')
                    .insert([{
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
                        detection_method: 'Gemini Processor'
                    }]);
                
                if (saveError) {
                    console.error('❌ Erro ao salvar detecção:', saveError);
                    this.log(`❌ Erro ao salvar detecção ${number}: ${saveError.message}`, 'error');
                } else {
                    console.log(`✅ Detecção ${number} salva com event_id=${image.event_id}`);
                    this.log(`✅ Detecção salva: ${number}`, 'success');
                }
                
                // Marcar como processada
                await this.supabaseClient.supabase
                    .from('image_buffer')
                    .update({ 
                        status: 'processed',
                        processed_at: new Date().toISOString(),
                        processing_result: `Número detectado: ${number}`
                    })
                    .eq('id', image.id);
            }
            
        } catch (error) {
            console.error('❌ Erro no processamento Gemini:', error);
            this.log('❌ Erro no processamento Gemini: ' + error.message, 'error');
            
            // Marcar todas as imagens como erro
            for (const image of images) {
                try {
                    await this.supabaseClient.supabase
                        .from('image_buffer')
                        .update({ 
                            status: 'error',
                            processed_at: new Date().toISOString(),
                            processing_result: 'Erro no processamento: ' + error.message
                        })
                        .eq('id', image.id);
                } catch (updateError) {
                    console.error('❌ Erro ao atualizar status da imagem:', updateError);
                }
            }
            
            // Se for erro 400, não tentar novamente
            if (error.message.includes('400')) {
                this.log('⚠️ Erro 400 - não será tentado novamente', 'warning');
                return; // Não relançar o erro
            }
            
            throw error;
        }
    }
    
    async getGeminiKey() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            return config.GEMINI_API_KEY;
        } catch (error) {
            throw new Error('Erro ao obter chave Gemini: ' + error.message);
        }
    }
    
    clearQueue() {
        if (window.geminiQueue) {
            window.geminiQueue.clearQueue();
            this.log('🧹 Fila Gemini limpa', 'info');
        }
    }
    
    async clearBuffer() {
        if (!confirm('⚠️ Tem certeza que deseja limpar todo o buffer de imagens?\n\nIsso irá remover:\n• Todas as imagens pendentes\n• Todas as imagens processadas\n• Todas as imagens descartadas\n\nEsta ação não pode ser desfeita!')) {
            return;
        }
        
        try {
            this.log('🗑️ Iniciando limpeza do buffer em lotes...', 'info');
            
            // Deletar em lotes para evitar timeout
            const batchSize = 100;
            let deletedTotal = 0;
            let hasMore = true;
            
            while (hasMore) {
                // Buscar IDs em lote
                const { data: records, error: selectError } = await this.supabaseClient.supabase
                    .from('image_buffer')
                    .select('id')
                    .limit(batchSize);
                
                if (selectError) {
                    throw new Error(`Erro ao buscar registros: ${selectError.message}`);
                }
                
                if (!records || records.length === 0) {
                    hasMore = false;
                    break;
                }
                
                // Deletar o lote
                const ids = records.map(r => r.id);
                const { error: deleteError } = await this.supabaseClient.supabase
                    .from('image_buffer')
                    .delete()
                    .in('id', ids);
                
                if (deleteError) {
                    throw new Error(`Erro ao deletar lote: ${deleteError.message}`);
                }
                
                deletedTotal += records.length;
                this.log(`🗑️ Deletados ${deletedTotal} registros...`, 'info');
                
                // Se deletou menos que o lote, não há mais registros
                if (records.length < batchSize) {
                    hasMore = false;
                }
            }
            
            // Atualizar estatísticas
            this.stats.queueLength = 0;
            this.stats.processingCount = 0;
            this.stats.completedCount = 0;
            this.stats.errorCount = 0;
            this.stats.totalProcessed = 0;
            this.stats.processingTimes = [];
            this.updateStatus();
            
            this.log(`✅ Buffer limpo com sucesso! Total: ${deletedTotal} registros`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao limpar buffer:', error);
            this.log('❌ Erro ao limpar buffer: ' + error.message, 'error');
        }
    }
    
    clearLog() {
        this.logEntries.innerHTML = '';
        this.log('📝 Log limpo', 'info');
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.logEntries.appendChild(logEntry);
        this.logEntries.scrollTop = this.logEntries.scrollHeight;
        
        // Manter apenas os últimos 100 logs
        while (this.logEntries.children.length > 100) {
            this.logEntries.removeChild(this.logEntries.firstChild);
        }
    }
    
    updateStatus() {
        this.queueLength.textContent = this.stats.queueLength;
        this.processingCount.textContent = this.stats.processingCount;
        this.completedCount.textContent = this.stats.completedCount;
        this.errorCount.textContent = this.stats.errorCount;
        this.totalProcessed.textContent = this.stats.totalProcessed;
        
        // Calcular tempo médio
        if (this.stats.processingTimes.length > 0) {
            const avgTime = this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length;
            this.avgProcessingTime.textContent = `${(avgTime / 1000).toFixed(1)}s`;
        }
    }
    
    startStatusUpdates() {
        // Atualizar status a cada 2 segundos
        setInterval(() => {
            this.updateStatus();
        }, 2000);
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.imageProcessor = new ImageProcessor();
});
