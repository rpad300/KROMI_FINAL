#!/usr/bin/env node
/*
  Executa um ficheiro SQL usando a connection string do Postgres (service role)
  Env vars suportadas: SUPABASE_DB_URL | DATABASE_URL | POSTGRES_URL | SUPABASE_POSTGRES_URL
*/

const fs = require('fs');
const path = require('path');

// Carregar .env do projeto
try {
  const dotenvPath = path.join(__dirname, '..', '.env');
  require('dotenv').config({ path: dotenvPath });
} catch {}

async function main() {
  try {
    const fileArg = process.argv[2];
    if (!fileArg) {
      console.error('Uso: node scripts/run-sql.js <caminho-do-sql>');
      process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), fileArg);
    if (!fs.existsSync(filePath)) {
      console.error('Arquivo SQL não encontrado:', filePath);
      process.exit(1);
    }

    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_POSTGRES_URL;
    const host = process.env.SUPABASE_DB_HOST || process.env.PGHOST;
    const user = process.env.SUPABASE_DB_USER || process.env.PGUSER || 'postgres';
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD;
    const database = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || 'postgres';
    const port = Number(process.env.SUPABASE_DB_PORT || process.env.PGPORT || 5432);

    // Verificar se há placeholders na connection string
    if (dbUrl) {
      const placeholders = dbUrl.match(/\[.*?\]/g);
      if (placeholders) {
        console.error('❌ Connection string contém placeholders que precisam ser substituídos:');
        placeholders.forEach(p => console.error(`   - ${p}`));
        console.error('\n💡 Obtenha a connection string completa do Dashboard do Supabase:');
        console.error('   Settings → Database → Connection String → Transaction mode');
        console.error('   Certifique-se de substituir [YOUR-PASSWORD] pela senha real');
        console.error('   Se usar pooler, substitua [region] pela região (ex: eu-central-1)');
        process.exit(1);
      }
    }

    if (!dbUrl && !host) {
      console.error('Configuração de Postgres não encontrada. Defina SUPABASE_DB_URL ou SUPABASE_DB_HOST/USER/PASSWORD/NAME.');
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    if (!sql.trim()) {
      console.error('Arquivo SQL vazio:', filePath);
      process.exit(1);
    }

    const { Pool } = require('pg');
    let pool;
    
    // Normalizar connection string
    let finalDbUrl = dbUrl;
    if (dbUrl && dbUrl.startsWith('postgres://')) {
      // Converter postgres:// para postgresql://
      finalDbUrl = dbUrl.replace('postgres://', 'postgresql://');
    }
    
    // Construir configuração de conexão
    let poolConfig = {
      ssl: { rejectUnauthorized: false }
    };
    
    // Preferir configuração por campos discretos se SUPABASE_DB_HOST estiver definido
    if (host) {
      console.log('→ Modo: campos discretos (prioritário)');
      poolConfig.host = host;
      poolConfig.port = port;
      poolConfig.user = user;
      poolConfig.password = password;
      poolConfig.database = database;
    } else if (finalDbUrl && (finalDbUrl.startsWith('postgresql://') || finalDbUrl.startsWith('postgres://'))) {
      console.log('→ Modo: extraindo campos da connection string');
      
      // Tentar usar URL.parse primeiro (mais robusto)
      try {
        const url = require('url');
        const parsed = url.parse(finalDbUrl);
        
        if (parsed.hostname && parsed.port && parsed.pathname) {
          poolConfig.host = parsed.hostname;
          poolConfig.port = parseInt(parsed.port) || 5432;
          poolConfig.user = parsed.auth ? parsed.auth.split(':')[0] : 'postgres';
          poolConfig.password = parsed.auth ? parsed.auth.split(':').slice(1).join(':') : '';
          poolConfig.database = parsed.pathname ? parsed.pathname.replace(/^\//, '').split('?')[0] : 'postgres';
          
          // Decodificar se necessário
          poolConfig.user = decodeURIComponent(poolConfig.user);
          poolConfig.password = decodeURIComponent(poolConfig.password);
          poolConfig.database = decodeURIComponent(poolConfig.database);
          
          console.log('→ Extraído:', { 
            host: poolConfig.host, 
            port: poolConfig.port, 
            database: poolConfig.database,
            user: poolConfig.user 
          });
        } else {
          throw new Error('URL parse incompleto');
        }
      } catch (parseError) {
        console.warn('⚠️ URL.parse falhou, tentando regex:', parseError.message);
        // Fallback para regex
        const urlPattern = /postgresql?:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)\/(.+)/;
        const match = finalDbUrl.match(urlPattern);
        if (match) {
          poolConfig.user = match[1] ? decodeURIComponent(match[1]) : 'postgres';
          poolConfig.password = match[2] ? decodeURIComponent(match[2]) : '';
          poolConfig.host = match[3];
          poolConfig.port = parseInt(match[4]);
          const dbPath = match[5].split('?')[0];
          poolConfig.database = decodeURIComponent(dbPath);
        } else {
          throw new Error('Não foi possível extrair campos da connection string. Formato esperado: postgresql://user:password@host:port/database');
        }
      }
    } else if (host) {
      console.log('→ Modo: campos discretos');
      poolConfig.host = host;
      poolConfig.user = user;
      poolConfig.password = password;
      poolConfig.database = database;
      poolConfig.port = port;
    } else {
      throw new Error('Nem connection string nem host configurados');
    }
    
    console.log('→ Configuração:', { 
      hasConnectionString: !!poolConfig.connectionString, 
      hasHost: !!poolConfig.host,
      host: poolConfig.host || '(via connectionString)'
    });
    
    pool = new Pool(poolConfig);

    console.log('🗄️ Executando SQL:', path.basename(filePath));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ SQL executado com sucesso');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Erro ao executar SQL:', err.message);
      process.exitCode = 1;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    console.error('❌ Falha:', e.message);
    process.exit(1);
  }
}

main();


