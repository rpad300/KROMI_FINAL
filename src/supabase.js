// Configuração do Supabase - Versão Sem Auto-Inicialização
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.initializing = false;
        this.initialized = false;
        this.initPromise = null; // Promise de inicialização para reutilizar
    }
    
    async init() {
        try {
            // Se já inicializado, retornar imediatamente
            if (this.initialized && this.isConnected) {
                console.log('✅ Supabase já inicializado');
                return true;
            }
            
            // Se está a inicializar, aguardar a mesma Promise
            if (this.initializing && this.initPromise) {
                console.log('⏳ Aguardando inicialização em curso...');
                return await this.initPromise;
            }
            
            // Criar nova Promise de inicialização
            this.initializing = true;
            this.initPromise = this._doInit();
            
            const result = await this.initPromise;
            return result;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            this.initializing = false;
            this.initPromise = null;
            return false;
        }
    }
    
    async _doInit() {
        try {
            console.log('🔍 Inicializando Supabase...');
            
            // Carregar configurações do servidor
            const response = await fetch('/api/config');
            const config = await response.json();
            
            // Verificar se tem credenciais
            const supabaseUrl = config.SUPABASE_URL;
            const supabaseKey = config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY;
            
            if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase')) {
                console.warn('⚠️ Supabase não configurado - usando localStorage apenas');
                this.initializing = false;
                return false;
            }
            
            // Importar Supabase dinamicamente
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            
            this.supabase = createClient(supabaseUrl, supabaseKey);
            
            console.log('🔑 Usando chave:', supabaseKey.startsWith('sb_publishable_') ? 'Nova (publishable)' : 'Legada (anon)');
            this.isConnected = true;
            this.initialized = true;
            
            console.log('✅ Supabase conectado');
            
            // Criar tabela se não existir
            await this.ensureTable();
            
            this.initializing = false;
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao conectar Supabase:', error);
            this.initializing = false;
            
            // Fallback: tentar usar configurações hardcoded se disponíveis
            try {
                const fallbackUrl = 'https://mdrvgbztadnluhrrnlob.supabase.co';
                const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcnZnYnp0YWRubHVocnJubG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MDUsImV4cCI6MjA3NjU3MDUwNX0.x2po57tZOQ443NLVURBWDIYQnYbJ4D6O45FlZ5qwmp4';
                
                const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
                this.supabase = createClient(fallbackUrl, fallbackKey);
                
                console.log('🔑 Usando chave: Fallback (hardcoded)');
                this.isConnected = true;
                this.initialized = true;
                
                console.log('✅ Supabase conectado (fallback)');
                
                await this.ensureTable();
                
                this.initializing = false;
                return true;
            } catch (fallbackError) {
                console.error('❌ Erro no fallback:', fallbackError);
                this.initializing = false;
                return false;
            }
        }
    }
    
    async ensureTable() {
        try {
            if (!this.supabase) return;
            
            // Verificar se a tabela detections existe
            const { data, error } = await this.supabase
                .from('detections')
                .select('id')
                .limit(1);
            
            if (error && error.code === '42P01') {
                console.log('📋 Tabela detections não existe - criando...');
                // Tabela não existe, mas não vamos criar aqui
                console.log('⚠️ Tabela detections não existe');
            } else {
                console.log('✅ Tabela "detections" verificada');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar tabela:', error);
        }
    }
    
    // Método ready() - aguarda até estar conectado
    ready() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve(true);
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (this.isConnected) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 50);
            
            // Timeout de 10s
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!this.isConnected) {
                    reject(new Error('Timeout: Supabase não inicializou em 10s'));
                }
            }, 10000);
        });
    }
    
    /**
     * Obter configuração do evento
     * @param {string} configType - Tipo de configuração (ex: 'calibration', 'ai_config', 'nomenclature')
     * @param {string} eventId - ID do evento (opcional, usa localStorage se não fornecido)
     * @returns {Promise<object|null>} - Configuração ou null
     */
    async getConfiguration(configType, eventId = null) {
        try {
            // Garantir que está inicializado
            if (!this.initialized) {
                await this.init();
            }
            
            // Se não tiver eventId ou não estiver conectado, usar localStorage
            if (!eventId || !this.isConnected) {
                const key = eventId 
                    ? `visionkrono:${eventId}:${configType}`
                    : `visionkrono_${configType}`;
                const stored = localStorage.getItem(key);
                return stored ? JSON.parse(stored) : null;
            }
            
            // Buscar no Supabase
            const { data, error } = await this.supabase
                .from('event_configurations')
                .select('*')
                .eq('event_id', eventId)
                .eq('config_type', configType)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // Nenhum registro encontrado
                    console.log(`ℹ️ Nenhuma configuração '${configType}' encontrada para evento ${eventId}`);
                    return null;
                }
                throw error;
            }
            
            console.log(`✅ Configuração '${configType}' carregada do Supabase`);
            return data.config_data;
            
        } catch (error) {
            console.error(`❌ Erro ao obter configuração '${configType}':`, error);
            
            // Fallback para localStorage
            const key = eventId 
                ? `visionkrono:${eventId}:${configType}`
                : `visionkrono_${configType}`;
            const stored = localStorage.getItem(key);
            
            if (stored) {
                console.log(`📦 Usando configuração do localStorage (fallback)`);
                return JSON.parse(stored);
            }
            
            return null;
        }
    }
    
    /**
     * Salvar configuração do evento
     * @param {string} configType - Tipo de configuração
     * @param {object} data - Dados da configuração
     * @param {string} eventId - ID do evento (opcional)
     * @returns {Promise<boolean>} - true se salvou com sucesso
     */
    async saveConfiguration(configType, data, eventId = null) {
        try {
            // Garantir que está inicializado
            if (!this.initialized) {
                await this.init();
            }
            
            // Sempre salvar no localStorage (backup)
            const key = eventId 
                ? `visionkrono:${eventId}:${configType}`
                : `visionkrono_${configType}`;
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`💾 Configuração '${configType}' salva no localStorage`);
            
            // Se não tiver eventId ou não estiver conectado, parar aqui
            if (!eventId || !this.isConnected) {
                return true;
            }
            
            // Salvar no Supabase
            const { error } = await this.supabase
                .from('event_configurations')
                .upsert({
                    event_id: eventId,
                    config_type: configType,
                    config_data: data,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'event_id,config_type'
                });
            
            if (error) throw error;
            
            console.log(`✅ Configuração '${configType}' salva no Supabase`);
            return true;
            
        } catch (error) {
            console.error(`❌ Erro ao salvar configuração '${configType}':`, error);
            
            // Se falhou no Supabase mas salvou no localStorage, ainda é sucesso parcial
            const key = eventId 
                ? `visionkrono:${eventId}:${configType}`
                : `visionkrono_${configType}`;
            if (localStorage.getItem(key)) {
                console.log(`⚠️ Salvo apenas no localStorage (Supabase falhou)`);
                return true;
            }
            
            return false;
        }
    }
}

// Criar instância global do Supabase
const supabaseClient = new SupabaseClient();

// Criar propriedade global para o auth-system.js
window.supabaseClient = supabaseClient;

console.log('🔍 SupabaseClient criado:', supabaseClient);
console.log('🔍 window.supabaseClient definido:', window.supabaseClient);

// NÃO inicializar automaticamente - deixar para o auth-system.js fazer
console.log('⏸️ SupabaseClient criado mas não inicializado automaticamente');

// Criar variável global 'supabase' para compatibilidade
window.supabase = {
    createClient: (url, key) => {
        // Se já temos uma instância conectada, retornar ela
        if (supabaseClient.supabase) {
            return supabaseClient.supabase;
        }
        
        // Caso contrário, criar nova instância
        return supabaseClient.supabase;
    }
};