/**
 * Verificar quais APIs estão configuradas no .env
 */

require('dotenv').config();

console.log('=== APIS CONFIGURADAS NO .ENV ===\n');

const apis = [
    { name: 'GEMINI', key: 'GEMINI_API_KEY', priority: 1, description: 'Mais barato e rápido' },
    { name: 'DEEPSEEK', key: 'DEEPSEEK_API_KEY', priority: 2, description: 'Alternativa econômica' },
    { name: 'OPENAI', key: 'OPENAI_API_KEY', priority: 3, description: 'Boa qualidade' },
    { name: 'GOOGLE_VISION', key: 'GOOGLE_VISION_API_KEY', priority: 4, description: 'OCR tradicional' }
];

const configured = [];
const notConfigured = [];

apis.forEach(api => {
    const hasKey = !!process.env[api.key];
    const keyPreview = hasKey 
        ? `${process.env[api.key].substring(0, 10)}...` 
        : 'NÃO CONFIGURADA';
    
    if (hasKey) {
        configured.push(api);
        console.log(`✅ ${api.name.padEnd(15)} | Prioridade ${api.priority} | ${api.description}`);
        console.log(`   Key: ${keyPreview}`);
    } else {
        notConfigured.push(api);
        console.log(`❌ ${api.name.padEnd(15)} | ${keyPreview}`);
    }
    console.log('');
});

console.log('=== RESUMO ===');
console.log(`✅ Configuradas: ${configured.length}`);
console.log(`❌ Não configuradas: ${notConfigured.length}`);
console.log('');

if (configured.length > 0) {
    console.log('🔗 ORDEM DE FALLBACK AUTOMÁTICA:');
    configured
        .sort((a, b) => a.priority - b.priority)
        .forEach((api, index) => {
            console.log(`   ${index + 1}. ${api.name} (${api.description})`);
        });
} else {
    console.log('⚠️ NENHUMA API CONFIGURADA!');
    console.log('Configure pelo menos uma API no arquivo .env');
}

console.log('');
console.log('📝 PARA CONFIGURAR:');
console.log('   1. Copie env.example para .env');
console.log('   2. Adicione suas API keys');
console.log('   3. Reinicie o servidor');

