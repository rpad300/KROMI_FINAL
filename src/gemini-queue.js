// Sistema de fila para requisições Gemini
class GeminiQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 segundos base
    }
    
    // Adicionar requisição à fila
    async addRequest(requestData) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                requestData,
                resolve,
                reject,
                retryCount: 0,
                timestamp: Date.now()
            });
            
            console.log(`📋 Requisição adicionada à fila Gemini. Fila: ${this.queue.length}`);
            
            // Processar se não estiver processando
            if (!this.processing) {
                this.processQueue();
            }
        });
    }
    
    // Processar fila sequencialmente
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        console.log(`🔄 Iniciando processamento da fila Gemini. Itens: ${this.queue.length}`);
        
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            console.log(`📡 Processando item da fila Gemini (${this.queue.length} restantes)`);
            
            try {
                const result = await this.executeRequest(item.requestData);
                item.resolve(result);
                console.log(`✅ Item processado com sucesso`);
            } catch (error) {
                console.error(`❌ Erro no item da fila:`, error);
                
                // Tentar novamente se não excedeu limite
                if (item.retryCount < this.maxRetries) {
                    item.retryCount++;
                    const delay = this.retryDelay * Math.pow(2, item.retryCount - 1);
                    console.log(`🔄 Tentativa ${item.retryCount}/${this.maxRetries} em ${delay}ms`);
                    
                    // Recolocar na fila com delay
                    setTimeout(() => {
                        this.queue.unshift(item);
                        this.processQueue();
                    }, delay);
                } else {
                    console.error(`❌ Item falhou após ${this.maxRetries} tentativas`);
                    item.reject(error);
                }
            }
            
            // Pequeno delay entre requisições para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.processing = false;
        console.log(`✅ Fila Gemini processada completamente`);
    }
    
    // Executar requisição individual
    async executeRequest(requestData) {
        const { geminiKey, requestBody, model } = requestData;
        
        // Usar modelo especificado ou padrão
        const geminiModel = model || 'gemini-2.5-flash';
        
        console.log(`💎 Enviando requisição para Gemini (${geminiModel})...`);
        console.log(`📊 Tamanho do requestBody: ${JSON.stringify(requestBody).length} caracteres`);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro Gemini ${response.status}:`, errorText);
            
            // Para erro 400, não tentar novamente - é erro de formato
            if (response.status === 400) {
                throw new Error(`Gemini API Error: 400 - Bad Request: ${errorText}`);
            }
            
            throw new Error(`Gemini API Error: ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`💎 Resposta recebida do Gemini com sucesso`);
        
        return result;
    }
    
    // Obter status da fila
    getStatus() {
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            nextItemTimestamp: this.queue.length > 0 ? this.queue[0].timestamp : null
        };
    }
    
    // Limpar fila
    clearQueue() {
        this.queue.forEach(item => {
            item.reject(new Error('Fila limpa'));
        });
        this.queue = [];
        console.log(`🧹 Fila Gemini limpa`);
    }
}

// Instância global da fila
window.geminiQueue = new GeminiQueue();
