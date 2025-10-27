/**
 * Script de diagnóstico para verificar variáveis de ambiente
 * Executar no servidor Node.js
 * 
 * Uso: node check-env.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 Diagnóstico de Variáveis de Ambiente\n');
console.log('==========================================\n');

// Verificar variáveis críticas
const checks = [
    {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        value: process.env.NEXT_PUBLIC_SUPABASE_URL,
        required: true,
        type: 'URL'
    },
    {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        required: true,
        type: 'Key (pública)'
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        value: process.env.SUPABASE_SERVICE_ROLE_KEY,
        required: false,
        type: 'Key (secreta) - IMPORTANTE para RLS bypass',
        critical: true
    },
    {
        name: 'PORT',
        value: process.env.PORT,
        required: false,
        type: 'Número'
    }
];

let hasErrors = false;
let hasCriticalWarnings = false;

checks.forEach(check => {
    const exists = !!check.value;
    const icon = exists ? '✅' : (check.required ? '❌' : '⚠️');
    
    console.log(`${icon} ${check.name}`);
    console.log(`   Tipo: ${check.type}`);
    
    if (exists) {
        // Mostrar apenas início e fim da chave (segurança)
        if (check.value.length > 20) {
            const start = check.value.substring(0, 10);
            const end = check.value.substring(check.value.length - 5);
            console.log(`   Valor: ${start}...${end} (${check.value.length} chars)`);
        } else {
            console.log(`   Valor: ${check.value}`);
        }
    } else {
        console.log(`   Valor: NÃO CONFIGURADO`);
        
        if (check.required) {
            hasErrors = true;
            console.log(`   ⚠️ OBRIGATÓRIO!`);
        }
        
        if (check.critical) {
            hasCriticalWarnings = true;
            console.log(`   ⚠️ CRÍTICO: Sem esta key, RLS vai bloquear queries!`);
            console.log(`   💡 Obter em: Supabase Dashboard → Settings → API → service_role (secret)`);
        }
    }
    
    console.log('');
});

console.log('==========================================\n');

// Resumo
if (hasErrors) {
    console.log('❌ ERRO: Variáveis obrigatórias faltando!');
    console.log('');
} else if (hasCriticalWarnings) {
    console.log('⚠️ AVISO: SERVICE_ROLE_KEY não configurada!');
    console.log('');
    console.log('📝 Impacto:');
    console.log('   - Queries do servidor ficam sujeitas a RLS');
    console.log('   - Admin pode não ver todos os eventos');
    console.log('   - Necessário criar policies RLS corretas');
    console.log('');
    console.log('🔧 Solução:');
    console.log('   1. Obter service_role key do Supabase Dashboard');
    console.log('   2. Adicionar ao .env:');
    console.log('      SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...');
    console.log('   3. Reiniciar servidor');
    console.log('');
} else {
    console.log('✅ Todas as variáveis configuradas corretamente!');
    console.log('');
}

// Testar conexão Supabase
console.log('🧪 Testando conexão Supabase...\n');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && (serviceKey || anonKey)) {
    const key = serviceKey || anonKey;
    const keyType = serviceKey ? 'SERVICE ROLE' : 'ANON';
    
    console.log(`🔑 Usando key: ${keyType}`);
    
    const supabase = createClient(supabaseUrl, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    // Testar query
    supabase.from('events').select('id,name', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.log('❌ Erro ao consultar eventos:', error.message);
                if (error.message.includes('policy')) {
                    console.log('');
                    console.log('🔒 RLS está bloqueando!');
                    console.log('💡 Soluções:');
                    console.log('   A) Configurar SUPABASE_SERVICE_ROLE_KEY');
                    console.log('   B) Executar: psql < fix-rls-admin-access.sql');
                }
            } else {
                console.log(`✅ Consulta bem-sucedida: ${count} evento(s) encontrado(s)`);
                
                if (count === 0) {
                    console.log('');
                    console.log('⚠️ Base de dados tem 0 eventos');
                    console.log('💡 Criar evento de teste:');
                    console.log("   INSERT INTO events (name, event_date, is_active)");
                    console.log("   VALUES ('Evento Teste', CURRENT_DATE, true);");
                } else {
                    console.log('');
                    console.log(`📊 Existem ${count} evento(s) na base de dados`);
                    
                    if (keyType === 'ANON') {
                        console.log('⚠️ Mas usa ANON key - RLS pode estar filtrando!');
                    } else {
                        console.log('✅ Service role bypassa RLS - admin deve ver todos!');
                    }
                }
            }
            
            console.log('\n==========================================\n');
            process.exit(0);
        })
        .catch(err => {
            console.log('❌ Exceção:', err.message);
            console.log('\n==========================================\n');
            process.exit(1);
        });
} else {
    console.log('❌ Não foi possível testar - faltam variáveis');
    console.log('\n==========================================\n');
    process.exit(1);
}

