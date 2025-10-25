// Configuração do Supabase
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
    }
    
    async init() {
        try {
            // Carregar configurações do servidor
            const response = await fetch('/api/config');
            const config = await response.json();
            
            // Verificar se tem credenciais (suporta tanto formato antigo quanto novo)
            const supabaseUrl = config.SUPABASE_URL;
            const supabaseKey = config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY;
            
            if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase')) {
                console.warn('⚠️ Supabase não configurado - usando localStorage apenas');
                return false;
            }
            
            // Importar Supabase dinamicamente
            const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
            
            this.supabase = createClient(supabaseUrl, supabaseKey);
            
            console.log('🔑 Usando chave:', supabaseKey.startsWith('sb_publishable_') ? 'Nova (publishable)' : 'Legada (anon)');
            this.isConnected = true;
            
            console.log('✅ Supabase conectado');
            
            // Criar tabela se não existir
            await this.ensureTable();
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar Supabase:', error);
            
            // Fallback: tentar usar configurações hardcoded se disponíveis
            try {
                const fallbackUrl = 'https://mdrvgbztadnluhrrnlob.supabase.co';
                const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcnZnYnp0YWRubHVocnJubG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTQ1MDUsImV4cCI6MjA3NjU3MDUwNX0.x2po57tZOQ443NLVURBWDIYQnYbJ4D6O45FlZ5qwmp4';
                
                const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
                this.supabase = createClient(fallbackUrl, fallbackKey);
                this.isConnected = true;
                
                console.log('✅ Supabase conectado via fallback');
                await this.ensureTable();
                
                return true;
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
                return false;
            }
        }
    }
    
    async ensureTable() {
        try {
            // Verificar se tabela existe fazendo uma query simples
            const { data, error } = await this.supabase
                .from('detections')
                .select('*')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                console.log('📋 Tabela "detections" não existe - criando...');
                // A tabela será criada manualmente no Supabase Dashboard
                throw new Error('Tabela "detections" não existe. Crie no Supabase Dashboard.');
            }
            
            console.log('✅ Tabela "detections" verificada');
        } catch (error) {
            console.error('❌ Erro ao verificar tabela:', error);
            throw error;
        }
    }
    
    async saveImage(imageType, imageData, metadata = {}) {
        if (!this.isConnected) {
            console.log(`💾 Salvando imagem ${imageType} no localStorage`);
            localStorage.setItem(`visionkrono_image_${imageType}_${Date.now()}`, imageData);
            return null;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('images')
                .insert([{
                    image_type: imageType,
                    image_data: imageData,
                    metadata: metadata
                }])
                .select()
                .single();
            
            if (error) {
                console.error(`❌ Erro ao salvar imagem ${imageType}:`, error);
                localStorage.setItem(`visionkrono_image_${imageType}_${Date.now()}`, imageData);
                return null;
            }
            
            console.log(`✅ Imagem ${imageType} salva no Supabase:`, data.id);
            return data.id;
        } catch (error) {
            console.error(`❌ Erro na conexão ao salvar imagem:`, error);
            localStorage.setItem(`visionkrono_image_${imageType}_${Date.now()}`, imageData);
            return null;
        }
    }
    
    async saveDetection(detection) {
        if (!this.isConnected) {
            console.log('💾 Salvando no localStorage (Supabase não disponível)');
            return this.saveToLocalStorage(detection);
        }
        
        try {
            // Primeiro salvar imagem de prova se existir
            let proofImageId = null;
            if (detection.proofImage) {
                proofImageId = await this.saveImage('proof', detection.proofImage, {
                    dorsal_number: detection.number,
                    dorsal_region: detection.dorsalRegion,
                    timestamp: detection.timestamp
                });
            }
            
            const { data, error } = await this.supabase
                .from('detections')
                .insert([{
                    number: detection.number,
                    timestamp: detection.timestamp,
                    latitude: detection.latitude,
                    longitude: detection.longitude,
                    accuracy: detection.accuracy,
                    device_type: detection.deviceType || 'mobile',
                    session_id: detection.sessionId || this.getSessionId(),
                    event_id: detection.eventId || null,
                    proof_image_id: proofImageId,
                    dorsal_region: detection.dorsalRegion || null
                }]);
            
            if (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
                // Fallback para localStorage
                return this.saveToLocalStorage(detection);
            }
            
            console.log('✅ Detecção salva no Supabase com prova:', detection.number);
            return true;
        } catch (error) {
            console.error('❌ Erro na conexão Supabase:', error);
            return this.saveToLocalStorage(detection);
        }
    }
    
    saveToLocalStorage(detection) {
        try {
            const existing = JSON.parse(localStorage.getItem('visionkrono_detections') || '[]');
            existing.push(detection);
            localStorage.setItem('visionkrono_detections', JSON.stringify(existing));
            console.log('💾 Detecção salva no localStorage');
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar no localStorage:', error);
            return false;
        }
    }
    
    async getDetections(limit = 100) {
        if (!this.isConnected) {
            return this.getFromLocalStorage();
        }
        
        try {
            const { data, error } = await this.supabase
                .from('detections')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('❌ Erro ao buscar detecções:', error);
                return this.getFromLocalStorage();
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Erro na consulta Supabase:', error);
            return this.getFromLocalStorage();
        }
    }
    
    getFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem('visionkrono_detections') || '[]');
        } catch (error) {
            console.error('❌ Erro ao ler localStorage:', error);
            return [];
        }
    }
    
    async subscribeToDetections(callback) {
        if (!this.isConnected) {
            console.log('⚠️ Supabase não conectado - sem tempo real');
            return null;
        }
        
        try {
            const subscription = this.supabase
                .channel('detections_channel')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'detections'
                }, (payload) => {
                    console.log('📡 Nova detecção recebida:', payload.new);
                    callback(payload.new);
                })
                .subscribe();
            
            console.log('📡 Subscrito a atualizações em tempo real');
            return subscription;
        } catch (error) {
            console.error('❌ Erro ao subscrever:', error);
            return null;
        }
    }
    
    getSessionId() {
        let sessionId = localStorage.getItem('visionkrono_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visionkrono_session_id', sessionId);
        }
        return sessionId;
    }
    
    async saveConfiguration(configType, configData) {
        if (!this.isConnected) {
            console.log(`💾 Salvando configuração ${configType} no localStorage`);
            localStorage.setItem(`visionkrono_${configType}`, JSON.stringify(configData));
            return true;
        }
        
        try {
            // Usar upsert para atualizar ou inserir
            const { data, error } = await this.supabase
                .from('configurations')
                .upsert({
                    config_type: configType,
                    config_data: configData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'config_type'
                });
            
            if (error) {
                console.error(`❌ Erro ao salvar configuração ${configType}:`, error);
                // Fallback para localStorage
                localStorage.setItem(`visionkrono_${configType}`, JSON.stringify(configData));
                return false;
            }
            
            console.log(`✅ Configuração ${configType} salva no Supabase`);
            // Também salvar no localStorage como backup
            localStorage.setItem(`visionkrono_${configType}`, JSON.stringify(configData));
            return true;
        } catch (error) {
            console.error(`❌ Erro na conexão ao salvar ${configType}:`, error);
            localStorage.setItem(`visionkrono_${configType}`, JSON.stringify(configData));
            return false;
        }
    }
    
    async saveConfigurationWithImage(configType, configData, imageId) {
        if (!this.isConnected) {
            return this.saveConfiguration(configType, configData);
        }
        
        try {
            const { data, error } = await this.supabase
                .from('configurations')
                .upsert({
                    config_type: configType,
                    config_data: configData,
                    config_image_id: imageId,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'config_type'
                });
            
            if (error) {
                console.error(`❌ Erro ao salvar configuração com imagem:`, error);
                return this.saveConfiguration(configType, configData);
            }
            
            console.log(`✅ Configuração ${configType} salva com imagem`);
            localStorage.setItem(`visionkrono_${configType}`, JSON.stringify(configData));
            return true;
        } catch (error) {
            console.error(`❌ Erro na conexão:`, error);
            return this.saveConfiguration(configType, configData);
        }
    }
    
    async getConfiguration(configType) {
        if (!this.isConnected) {
            console.log(`📂 Carregando configuração ${configType} do localStorage`);
            const local = localStorage.getItem(`visionkrono_${configType}`);
            return local ? JSON.parse(local) : null;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('configurations')
                .select('config_data, updated_at')
                .eq('config_type', configType)
                .maybeSingle(); // Usar maybeSingle em vez de single para evitar erro se não existir
            
            if (error) {
                console.warn(`⚠️ Erro ao carregar configuração ${configType}:`, error);
                // Fallback para localStorage
                const local = localStorage.getItem(`visionkrono_${configType}`);
                return local ? JSON.parse(local) : null;
            }
            
            if (data) {
                console.log(`✅ Configuração ${configType} carregada do Supabase`);
                
                // Atualizar localStorage com dados mais recentes
                localStorage.setItem(`visionkrono_${configType}`, JSON.stringify(data.config_data));
                
                return data.config_data;
            } else {
                console.log(`📂 Configuração ${configType} não encontrada na base de dados`);
                // Fallback para localStorage
                const local = localStorage.getItem(`visionkrono_${configType}`);
                return local ? JSON.parse(local) : null;
            }
        } catch (error) {
            console.error(`❌ Erro na conexão ao carregar ${configType}:`, error);
            // Fallback para localStorage
            const local = localStorage.getItem(`visionkrono_${configType}`);
            return local ? JSON.parse(local) : null;
        }
    }
    
    async getAllConfigurations() {
        const configs = {};
        
        // Carregar todas as configurações necessárias
        const configTypes = ['number_area', 'calibration', 'calibration_image'];
        
        for (const type of configTypes) {
            configs[type] = await this.getConfiguration(type);
        }
        
        return configs;
    }
}

// Exportar para uso global
window.SupabaseClient = SupabaseClient;

// Criar instância global do Supabase
const supabaseClient = new SupabaseClient();

// Inicializar automaticamente
supabaseClient.init().then(() => {
    console.log('✅ Supabase conectado');
}).catch(error => {
    console.error('❌ Erro ao conectar Supabase:', error);
});

// Criar variável global 'supabase' para compatibilidade
window.supabase = {
    createClient: (url, key) => {
        // Se já temos uma instância conectada, retornar ela
        if (supabaseClient.isConnected && supabaseClient.supabase) {
            return supabaseClient.supabase;
        }
        
        // Caso contrário, criar nova instância
        return supabaseClient.supabase;
    }
};

// Também disponibilizar a instância diretamente
window.supabaseClient = supabaseClient;
