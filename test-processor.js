// Teste rápido do processador
require('dotenv').config();
const BackgroundImageProcessor = require('./background-processor');

console.log('🧪 Testando Processador...\n');

console.log('📋 Verificando variáveis de ambiente:');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ Não configurada');
console.log('  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada');
console.log('  SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada');

console.log('\n🚀 Iniciando processador...\n');

const processor = new BackgroundImageProcessor();

processor.init().then(success => {
    if (success) {
        console.log('\n✅ Processador iniciado com sucesso!');
        console.log('📋 Monitorando buffer...');
        console.log('⏰ Aguarde 10 segundos para ver se processa...\n');
        
        // Aguardar 15 segundos e depois parar
        setTimeout(() => {
            console.log('\n🛑 Teste concluído. Se viu mensagens de processamento acima, está funcionando!');
            processor.stop();
            process.exit(0);
        }, 15000);
    } else {
        console.log('\n❌ Falha ao iniciar processador');
        console.log('Verifique as configurações acima');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n❌ Erro:', error);
    process.exit(1);
});

