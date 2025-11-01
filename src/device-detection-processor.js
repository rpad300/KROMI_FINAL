/**
 * ============================================================================
 * KROMI - Processador de Device Detections (App Nativa)
 * ============================================================================
 * Este serviço processa registros da tabela device_detections:
 * - Se tem dorsal_number → Cria detecção diretamente
 * - Se não tem dorsal_number → Envia para image_buffer
 * ============================================================================
 */

const { createClient } = require('@supabase/supabase-js');

class DeviceDetectionProcessor {
    constructor() {
        this.isProcessing = false;
        this.processInterval = null;
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            console.error('❌ DeviceDetectionProcessor: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
            return;
        }
        
        this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
        
        // Configuração
        this.batchSize = 10;           // Processar 10 registros por vez
        this.checkInterval = 5000;     // Verificar a cada 5 segundos
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        const colors = {
            error: '\x1b[31m',    // Vermelho
            warn: '\x1b[33m',      // Amarelo
            info: '\x1b[36m',      // Ciano
            success: '\x1b[32m',   // Verde
            reset: '\x1b[0m'
        };
        
        const color = colors[type] || colors.info;
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
        
        console.log(`${color}[DeviceDetectionProcessor ${timestamp}] ${prefix} ${message}${colors.reset}`);
    }

    /**
     * Inicializar processador
     */
    async init() {
        try {
            this.log('Inicializando processador de device detections...', 'info');
            
            // Verificar se função RPC existe
            const { data: rpcTest, error: rpcError } = await this.supabase.rpc('process_pending_detections', {
                p_batch_size: 0  // Teste com batch size 0
            });
            
            if (rpcError && rpcError.message && rpcError.message.includes('does not exist')) {
                this.log('Função process_pending_detections não existe. Execute sql/native-app-detections-table.sql', 'error');
                return false;
            }
            
            this.log('Processador inicializado com sucesso', 'success');
            return true;
        } catch (error) {
            this.log(`Erro ao inicializar: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Iniciar processamento contínuo
     */
    startAutoProcessor() {
        if (this.processInterval) {
            this.log('Processador já está rodando', 'warn');
            return;
        }

        this.log(`Iniciando processamento contínuo (intervalo: ${this.checkInterval / 1000}s)`, 'info');
        
        // Processar imediatamente
        this.processBatch();
        
        // Processar periodicamente
        this.processInterval = setInterval(() => {
            this.processBatch();
        }, this.checkInterval);
    }

    /**
     * Parar processamento
     */
    stop() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
            this.log('Processamento parado', 'info');
        }
    }

    /**
     * Processar um lote de registros pendentes
     */
    async processBatch() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;

            this.log(`Verificando registros pendentes (lote: ${this.batchSize})...`, 'info');

            const { data, error } = await this.supabase.rpc('process_pending_detections', {
                p_batch_size: this.batchSize
            });

            if (error) {
                this.log(`Erro ao processar lote: ${error.message}`, 'error');
                return;
            }

            if (data && data.success) {
                const processed = data.processed || 0;
                const failed = data.failed || 0;
                const total = data.total || 0;

                if (total > 0) {
                    this.log(`Processados: ${processed} | Falhas: ${failed} | Total: ${total}`, 'success');
                    
                    // Log detalhado de cada resultado
                    if (data.results && data.results.length > 0) {
                        data.results.forEach((result, index) => {
                            if (result.success) {
                                const action = result.action === 'direct_detection' ? '✅ Direto' : '📸 Buffer';
                                this.log(`${index + 1}. ${action}: ${result.message}`, 'success');
                            } else {
                                this.log(`${index + 1}. Erro: ${result.error}`, 'error');
                            }
                        });
                    }
                }
            } else {
                // Sem registros pendentes é normal, não logar
            }

        } catch (error) {
            this.log(`Erro geral no processamento: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Processar um registro específico (útil para debug)
     */
    async processSingle(detectionId) {
        try {
            this.log(`Processando registro específico: ${detectionId}`, 'info');

            const { data, error } = await this.supabase.rpc('process_device_detection', {
                p_detection_id: detectionId
            });

            if (error) {
                this.log(`Erro: ${error.message}`, 'error');
                return false;
            }

            if (data && data.success) {
                const action = data.action === 'direct_detection' ? '✅ Direto para detections' : '📸 Enviado para buffer';
                this.log(`${action}: ${data.message}`, 'success');
                return true;
            } else {
                this.log(`Falha: ${data?.error || 'Erro desconhecido'}`, 'error');
                return false;
            }

        } catch (error) {
            this.log(`Erro: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Verificar estatísticas
     */
    async getStats() {
        try {
            const { data, error } = await this.supabase
                .from('device_detections')
                .select('status, dorsal_number')
                .limit(1000);

            if (error) {
                this.log(`Erro ao buscar estatísticas: ${error.message}`, 'error');
                return null;
            }

            const stats = {
                total: data.length,
                byStatus: {},
                withDorsal: 0,
                withoutDorsal: 0
            };

            data.forEach(record => {
                // Por status
                stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;

                // Por dorsal
                if (record.dorsal_number !== null) {
                    stats.withDorsal++;
                } else {
                    stats.withoutDorsal++;
                }
            });

            return stats;
        } catch (error) {
            this.log(`Erro ao buscar estatísticas: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Verificar registros pendentes
     */
    async checkPending() {
        try {
            const { data, error } = await this.supabase
                .from('device_detections')
                .select('id, access_code, dorsal_number, created_at, status')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(10);

            if (error) {
                this.log(`Erro ao verificar pendentes: ${error.message}`, 'error');
                return [];
            }

            return data || [];
        } catch (error) {
            this.log(`Erro ao verificar pendentes: ${error.message}`, 'error');
            return [];
        }
    }
}

module.exports = DeviceDetectionProcessor;

