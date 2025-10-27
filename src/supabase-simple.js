// Configuração do Supabase - Versão Simplificada
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.initializing = false; // Evitar múltiplas inicializações
    }
    
    async init() {
        try {
            // Evitar múltiplas inicializações
            if (this.initializing) {
                console.log('⏳ Supabase já está a inicializar...');
                return false;
            }
            
            if (this.supabase && this.isConnected) {
                console.log('✅ Supabase já inicializado');
                return true;
            }
            
            this.initializing = true;
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
                
                console.log('✅ Supabase conectado (fallback)');
                
                await this.ensureTable();
                
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
}

// Criar instância global do Supabase
const supabaseClient = new SupabaseClient();

// Criar propriedade global para o auth-system.js
window.supabaseClient = supabaseClient;

console.log('🔍 SupabaseClient criado:', supabaseClient);
console.log('🔍 window.supabaseClient definido:', window.supabaseClient);

// Inicializar automaticamente com timeout
setTimeout(async () => {
    try {
        await supabaseClient.init();
        console.log('✅ Supabase inicializado automaticamente');
    } catch (error) {
        console.error('❌ Erro na inicialização automática:', error);
    }
}, 1000); // Aguardar 1 segundo antes de inicializar

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


