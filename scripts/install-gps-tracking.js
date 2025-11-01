#!/usr/bin/env node

/**
 * VisionKrono - Instalador Automático do Módulo GPS Tracking
 * 
 * Executa todos os scripts SQL na ordem correta
 * 
 * USO:
 * node scripts/install-gps-tracking.js
 * 
 * REQUISITOS:
 * - Configurar credenciais Supabase abaixo OU via variáveis de ambiente
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURAÇÃO - SUBSTITUIR COM SUAS CREDENCIAIS
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sua-service-role-key-aqui';

// ============================================================================
// SCRIPTS SQL NA ORDEM CORRETA
// ============================================================================

const SQL_FILES = [
  'sql/track_module_schema.sql',
  'sql/track_module_rls.sql',
  'sql/track_module_functions.sql',
  'sql/track_module_mobile_inbox.sql',
  'sql/track_module_inbox_processor.sql',
  'sql/track_module_seeds.sql'  // Opcional - comentar se não quiser dados demo
];

// ============================================================================
// FUNÇÕES
// ============================================================================

function loadSQL(filename) {
  const filepath = path.join(__dirname, '..', filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Ficheiro não encontrado: ${filename}`);
  }
  
  return fs.readFileSync(filepath, 'utf8');
}

async function executeSQLFile(supabase, filename) {
  console.log(`\n📄 Executando: ${filename}...`);
  
  try {
    const sql = loadSQL(filename);
    
    // Executar SQL via rpc ou query
    // Nota: Supabase JS não tem execução direta de SQL multi-statement
    // Precisamos usar a REST API diretamente
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      // Alternativa: usar endpoint direto do PostgREST
      // Como fallback, tentamos via SQL Editor endpoint
      const pgResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: sql
      });
      
      if (!pgResponse.ok) {
        throw new Error(`HTTP ${pgResponse.status}: ${await pgResponse.text()}`);
      }
    }
    
    console.log(`✅ ${filename} executado com sucesso!`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao executar ${filename}:`);
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  VisionKrono - Instalador GPS Tracking Módulo');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Verificar credenciais
  if (SUPABASE_URL.includes('seu-projeto') || SUPABASE_SERVICE_KEY.includes('sua-service')) {
    console.error('❌ ERRO: Configure as credenciais Supabase primeiro!\n');
    console.log('Edite o ficheiro scripts/install-gps-tracking.js');
    console.log('OU defina as variáveis de ambiente:');
    console.log('  export NEXT_PUBLIC_SUPABASE_URL="https://..."');
    console.log('  export SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
    process.exit(1);
  }
  
  console.log(`🔗 Conectando a: ${SUPABASE_URL}\n`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Executar cada ficheiro
  let success = 0;
  let failed = 0;
  
  for (const file of SQL_FILES) {
    const result = await executeSQLFile(supabase, file);
    if (result) {
      success++;
    } else {
      failed++;
      
      // Perguntar se quer continuar
      console.log('\n⚠️  Erro encontrado. Continuar? (Ctrl+C para cancelar)');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Resumo
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  INSTALAÇÃO CONCLUÍDA');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Sucesso: ${success}/${SQL_FILES.length}`);
  console.log(`❌ Falhas:  ${failed}/${SQL_FILES.length}\n`);
  
  if (failed === 0) {
    console.log('🎉 Módulo GPS Tracking instalado com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Verificar tabelas criadas no Supabase Dashboard');
    console.log('2. Configurar scheduler para processar inbox');
    console.log('3. Testar com dados demo (se carregou seeds)');
    console.log('4. Consultar MOBILE_APP_INBOX_README.md para app móvel\n');
  } else {
    console.log('⚠️  Algumas partes falharam. Verifique os erros acima.');
    console.log('Pode executar os scripts manualmente via Supabase Dashboard.\n');
  }
}

// ============================================================================
// EXECUTAR
// ============================================================================

main().catch(error => {
  console.error('\n❌ ERRO FATAL:');
  console.error(error);
  process.exit(1);
});

