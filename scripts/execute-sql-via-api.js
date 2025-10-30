#!/usr/bin/env node
/*
  Executa SQL via endpoint HTTP do servidor (usando service role)
*/

const fs = require('fs');
const path = require('path');
const https = require('https');

// Carregar .env
try {
  const dotenvPath = path.join(__dirname, '..', '.env');
  require('dotenv').config({ path: dotenvPath });
} catch {}

async function executeSqlViaAPI() {
  try {
    const fileArg = process.argv[2];
    if (!fileArg) {
      console.error('Uso: node scripts/execute-sql-via-api.js <nome-do-script>');
      console.error('Scripts permitidos: create-site-global-metadata-table, add-platform-context, etc.');
      process.exit(1);
    }

    // Mapear nome do script para arquivo
    const scriptMap = {
      'create-site-global-metadata-table': 'create-site-global-metadata-table.sql',
      'add-platform-context': 'add-platform-context.sql',
      'add-social-platforms-thumbnails': 'add-social-platforms-thumbnails.sql',
      'add-social-platforms-metadata': 'add-social-platforms-metadata.sql'
    };

    const scriptName = scriptMap[fileArg] ? fileArg : fileArg.replace('.sql', '');
    
    if (!scriptMap[scriptName]) {
      console.error(`❌ Script "${scriptName}" não está na whitelist.`);
      console.error('Scripts permitidos:', Object.keys(scriptMap).join(', '));
      process.exit(1);
    }

    const serverPort = process.env.PORT || 1144;
    const serverUrl = `https://localhost:${serverPort}`;
    
    console.log(`🚀 Executando SQL via API: ${scriptName}`);
    console.log(`📡 Servidor: ${serverUrl}`);

    // Fazer requisição POST ao endpoint
    const postData = JSON.stringify({ script: scriptName });
    
    const options = {
      hostname: 'localhost',
      port: serverPort,
      path: '/api/admin/execute-sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': process.env.SESSION_COOKIE || '' // Será necessário autenticar primeiro
      },
      rejectUnauthorized: false // Aceitar certificado auto-assinado
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.success) {
              console.log('✅', result.message || 'SQL executado com sucesso');
              resolve(result);
            } else {
              console.error('❌ Erro:', result.error);
              process.exit(1);
            }
          } catch (e) {
            console.error('❌ Erro ao parsear resposta:', data);
            process.exit(1);
          }
        });
      });

      req.on('error', (e) => {
        console.error('❌ Erro na requisição:', e.message);
        console.error('💡 Certifique-se de que o servidor está rodando (npm start)');
        process.exit(1);
      });

      req.write(postData);
      req.end();
    });
    
  } catch (e) {
    console.error('❌ Falha:', e.message);
    process.exit(1);
  }
}

executeSqlViaAPI();

