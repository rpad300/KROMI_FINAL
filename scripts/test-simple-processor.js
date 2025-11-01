/**
 * Testar processador simples (processa no servidor)
 */

const DeviceDetectionProcessorSimple = require('../src/device-detection-processor-simple');

async function test() {
    console.log('=== TESTE DO PROCESSADOR SIMPLES ===\n');

    const processor = new DeviceDetectionProcessorSimple();
    
    const initialized = await processor.init();
    if (!initialized) {
        console.error('❌ Falha ao inicializar');
        process.exit(1);
    }

    console.log('✅ Processador inicializado\n');
    console.log('📋 Processando registros pendentes...\n');

    await processor.processPendingDetections();

    console.log('\n✅ Processamento concluído!');
    process.exit(0);
}

test().catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
});

