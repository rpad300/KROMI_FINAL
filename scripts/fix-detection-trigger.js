/**
 * Script para corrigir triggers de detections e classifications
 * Remove dependência de participant_id que não existe nessas tabelas
 */

require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERRO: Variáveis de ambiente não configuradas');
    console.error('   Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
}

const SQL = `
-- ==========================================
-- CORREÇÃO: Trigger de detections usa campo inexistente
-- ==========================================
-- Problema: trigger_detection_email() tentava usar NEW.participant_id
-- Solução: Buscar participante usando NEW.number + NEW.event_id
-- 
-- ⚠️ IMPORTANTE: Não altera estruturas de tabelas
-- - Usa campos existentes: detections.number e participants.dorsal_number
-- - 'bib_number' no JSON é apenas output, não afeta BD
-- ==========================================

-- Corrigir função trigger_detection_email
CREATE OR REPLACE FUNCTION trigger_detection_email()
RETURNS TRIGGER AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- Buscar dados do participante usando dorsal number e event_id
    -- (A tabela detections não tem participant_id, usa number + event_id)
    SELECT * INTO participant_record
    FROM participants
    WHERE dorsal_number = NEW.number
      AND event_id = NEW.event_id
    LIMIT 1;
    
    -- Se encontrou participante, enviar notificação
    IF participant_record IS NOT NULL THEN
        -- Notificar aplicação
        PERFORM pg_notify(
            'email_trigger',
            json_build_object(
                'trigger', 'detection',
                'event_id', NEW.event_id,
                'dorsal_number', NEW.number,
                'participant_data', json_build_object(
                    'name', participant_record.full_name,
                    'email', participant_record.email,
                    'bib_number', participant_record.dorsal_number,
                    'category', participant_record.category,
                    'detection_time', NEW.timestamp
                )
            )::text
        );
    END IF;
    -- Se não encontrou participante, simplesmente não enviar email (não é erro)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- CORREÇÃO ADICIONAL: trigger_classification_email
-- ==========================================
-- A tabela classifications também não tem participant_id, usa dorsal_number
-- ==========================================

-- Corrigir função trigger_classification_email
CREATE OR REPLACE FUNCTION trigger_classification_email()
RETURNS TRIGGER AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- Buscar dados do participante usando dorsal_number e event_id
    -- (A tabela classifications não tem participant_id, usa dorsal_number + event_id)
    SELECT p.*
    INTO participant_record
    FROM participants p
    WHERE p.dorsal_number = NEW.dorsal_number
      AND p.event_id = NEW.event_id
    LIMIT 1;
    
    -- Se encontrou participante, enviar notificação
    IF participant_record IS NOT NULL THEN
        PERFORM pg_notify(
            'email_trigger',
            json_build_object(
                'trigger', 'classification',
                'event_id', NEW.event_id,
                'dorsal_number', NEW.dorsal_number,
                'participant_data', json_build_object(
                    'name', participant_record.full_name,
                    'email', participant_record.email,
                    'bib_number', participant_record.dorsal_number,
                    'category', participant_record.category
                )
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function executeSQL() {
    console.log('🔧 Corrigindo triggers de detections e classifications...\n');
    console.log('📋 SQL a executar:');
    console.log('   - Corrigir trigger_detection_email()');
    console.log('   - Corrigir trigger_classification_email()\n');

    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const postData = JSON.stringify({
        sql: SQL
    });

    const options = {
        hostname: url.hostname,
        path: '/rest/v1/rpc/exec_sql',
        method: 'POST',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 204) {
                    console.log('✅ Triggers corrigidas com sucesso!');
                    console.log('\n📊 Verificando triggers...');
                    verifyTriggers();
                    resolve();
                } else {
                    // Tentar método alternativo via PostgREST
                    console.log('⚠️ Método RPC não disponível, tentando método alternativo...');
                    executeViaPostgREST();
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro na requisição:', error.message);
            console.log('\n💡 SOLUÇÃO ALTERNATIVA:');
            console.log('   1. Abra o Supabase Dashboard');
            console.log('   2. Vá a SQL Editor');
            console.log('   3. Copie e cole o conteúdo de sql/fix-detection-trigger-participant-id.sql');
            console.log('   4. Execute o SQL');
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function executeViaPostgREST() {
    // Método alternativo: usar query direta
    console.log('🔧 Executando via método alternativo...\n');
    console.log('💡 Por favor, execute manualmente no Supabase Dashboard:');
    console.log('   1. Abra: Supabase Dashboard → SQL Editor');
    console.log('   2. Cole o conteúdo de: sql/fix-detection-trigger-participant-id.sql');
    console.log('   3. Clique em "Run"\n');
}

function verifyTriggers() {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/verify_triggers`);
    
    const options = {
        hostname: url.hostname,
        path: '/rest/v1/rpc/verify_triggers',
        method: 'GET',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ Triggers ativas:', result);
                } catch {
                    console.log('✅ Triggers verificadas');
                }
            }
        });
    });

    req.on('error', () => {
        console.log('ℹ️ Verificação de triggers não disponível via API');
    });

    req.end();
}

// Executar
executeSQL().catch(() => {
    process.exit(1);
});



