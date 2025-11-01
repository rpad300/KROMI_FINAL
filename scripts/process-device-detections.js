/**
 * ============================================================================
 * KROMI - Serviço de Processamento de Device Detections
 * ============================================================================
 * Este serviço processa registros da tabela device_detections:
 * - Se tem dorsal_number → Cria detecção diretamente
 * - Se não tem dorsal_number → Envia para image_buffer
 * ============================================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração
const CONFIG = {
    batchSize: 10,           // Processar 10 registros por vez
    intervalSeconds: 5,      // Executar a cada 5 segundos
    maxRetries: 3,           // Máximo de tentativas por registro
    retryDelayMs: 1000       // Delay entre tentativas
};

/**
 * Processar um lote de registros pendentes
 */
async function processBatch() {
    try {
        console.log(`🔄 Processando lote de até ${CONFIG.batchSize} registros...`);
        
        const { data, error } = await supabase.rpc('process_pending_detections', {
            p_batch_size: CONFIG.batchSize
        });
        
        if (error) {
            console.error('❌ Erro ao processar lote:', error);
            return;
        }
        
        if (data && data.success) {
            console.log(`✅ Processados: ${data.processed} | Falhas: ${data.failed} | Total: ${data.total}`);
            
            // Log detalhado de cada resultado
            if (data.results && data.results.length > 0) {
                data.results.forEach((result, index) => {
                    if (result.success) {
                        console.log(`  ✅ ${index + 1}. ${result.action}: ${result.message}`);
                    } else {
                        console.error(`  ❌ ${index + 1}. Erro: ${result.error}`);
                    }
                });
            }
        } else {
            console.log('ℹ️ Nenhum registro pendente para processar');
        }
        
    } catch (error) {
        console.error('❌ Erro geral no processamento:', error);
    }
}

/**
 * Processar um registro específico (útil para debug)
 */
async function processSingle(detectionId) {
    try {
        console.log(`🔍 Processando registro: ${detectionId}`);
        
        const { data, error } = await supabase.rpc('process_device_detection', {
            p_detection_id: detectionId
        });
        
        if (error) {
            console.error('❌ Erro:', error);
            return;
        }
        
        if (data.success) {
            console.log(`✅ Sucesso: ${data.action}`);
            console.log(`   ${data.message}`);
        } else {
            console.error(`❌ Falha: ${data.error}`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

/**
 * Verificar registros pendentes
 */
async function checkPending() {
    try {
        const { data, error } = await supabase
            .from('device_detections')
            .select('id, access_code, dorsal_number, created_at, status')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10);
        
        if (error) {
            console.error('❌ Erro ao verificar pendentes:', error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log(`📊 ${data.length} registros pendentes:`);
            data.forEach((record, index) => {
                const hasDorsal = record.dorsal_number ? '✅' : '📸';
                const age = Math.floor((Date.now() - new Date(record.created_at)) / 1000);
                console.log(`  ${index + 1}. ${hasDorsal} ID: ${record.id.substring(0, 8)}... | Dorsal: ${record.dorsal_number || 'N/A'} | Idade: ${age}s`);
            });
        } else {
            console.log('✅ Nenhum registro pendente');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

/**
 * Estatísticas gerais
 */
async function showStats() {
    try {
        const { data, error } = await supabase
            .from('device_detections')
            .select('status, dorsal_number')
            .limit(1000);  // Últimos 1000 registros
        
        if (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return;
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
        
        console.log('📊 Estatísticas:');
        console.log(`   Total: ${stats.total}`);
        console.log(`   Com dorsal: ${stats.withDorsal} (direto para detections)`);
        console.log(`   Sem dorsal: ${stats.withoutDorsal} (vai para buffer)`);
        console.log(`   Por status:`, stats.byStatus);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

/**
 * Iniciar processamento contínuo
 */
function startContinuousProcessing() {
    console.log('🚀 Iniciando processamento contínuo...');
    console.log(`   Intervalo: ${CONFIG.intervalSeconds}s`);
    console.log(`   Tamanho do lote: ${CONFIG.batchSize}`);
    console.log('');
    
    // Processar imediatamente
    processBatch();
    
    // Processar periodicamente
    setInterval(() => {
        processBatch();
    }, CONFIG.intervalSeconds * 1000);
}

/**
 * Main
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'check':
            await checkPending();
            break;
            
        case 'stats':
            await showStats();
            break;
            
        case 'process':
            const detectionId = args[1];
            if (detectionId) {
                await processSingle(detectionId);
            } else {
                await processBatch();
            }
            break;
            
        case 'start':
        default:
            startContinuousProcessing();
            // Manter processo vivo
            process.on('SIGINT', () => {
                console.log('\n👋 Parando processamento...');
                process.exit(0);
            });
            break;
    }
}

// Executar
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    processBatch,
    processSingle,
    checkPending,
    showStats
};

