-- =====================================================
-- Adicionar código alfanumérico de 6 dígitos aos participantes
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Adicionar coluna participant_code em participants
DO $$ 
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'participant_code'
    ) THEN
        ALTER TABLE participants ADD COLUMN participant_code VARCHAR(6);
        
        -- Criar índice único para garantir códigos únicos
        CREATE UNIQUE INDEX idx_participants_participant_code ON participants(participant_code) 
        WHERE participant_code IS NOT NULL;
        
        -- Comentário para documentação
        COMMENT ON COLUMN participants.participant_code IS 
        'Código alfanumérico único de 6 dígitos gerado automaticamente para cada participante';
    END IF;
END $$;

-- 2. Função para gerar código alfanumérico único para participantes
-- Esta função usa advisory lock para evitar race conditions em inserções concorrentes
CREATE OR REPLACE FUNCTION generate_participant_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    code VARCHAR(6);
    exists_check BOOLEAN;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Semelhantes removidos (0,O,I,1)
    max_attempts INT := 100;
    attempts INT := 0;
    lock_key BIGINT := 123456789; -- Chave única para o lock
BEGIN
    -- Usar advisory lock para evitar race conditions em inserções simultâneas
    PERFORM pg_advisory_xact_lock(lock_key);
    
    LOOP
        -- Gerar código aleatório de 6 caracteres
        code := '';
        FOR i IN 1..6 LOOP
            code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        -- Verificar se código já existe (com lock para evitar duplicados)
        SELECT EXISTS(
            SELECT 1 FROM participants 
            WHERE participant_code = code 
            FOR UPDATE -- Lock para evitar inserções simultâneas com mesmo código
        ) INTO exists_check;
        
        -- Se não existe, retornar
        IF NOT exists_check THEN
            RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Não foi possível gerar código único após % tentativas', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para gerar código automaticamente ao criar participante
-- Este trigger SEMPRE executa no banco de dados, garantindo que nenhum participante
-- seja criado sem código, independentemente de onde a inserção venha (API, frontend, SQL direto)
CREATE OR REPLACE FUNCTION auto_generate_participant_code()
RETURNS TRIGGER AS $$
BEGIN
    -- SEMPRE gerar código se não estiver definido ou se estiver vazio
    -- Isso garante que mesmo tentativas de inserir código manual vazio sejam corrigidas
    IF NEW.participant_code IS NULL OR NEW.participant_code = '' OR LENGTH(TRIM(NEW.participant_code)) = 0 THEN
        NEW.participant_code := generate_participant_code();
    ELSE
        -- Se tentou inserir código manualmente, validar se já existe
        -- Se existir, gerar um novo (proteção contra conflitos)
        IF EXISTS (SELECT 1 FROM participants WHERE participant_code = NEW.participant_code AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) THEN
            -- Código já existe, gerar novo
            NEW.participant_code := generate_participant_code();
        END IF;
        
        -- Validar formato do código (deve ter exatamente 6 caracteres alfanuméricos)
        IF LENGTH(NEW.participant_code) != 6 OR NEW.participant_code !~ '^[A-Z0-9]{6}$' THEN
            -- Formato inválido, gerar novo código válido
            NEW.participant_code := generate_participant_code();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se existir e recriar
-- IMPORTANTE: Este trigger executa SEMPRE no banco de dados, antes de qualquer INSERT
-- Isso garante que o código seja gerado independentemente da origem da inserção:
-- - Inserções via API REST
-- - Inserções via frontend (Supabase Client)
-- - Inserções diretas via SQL
-- - Importações em massa (bulk inserts)
DROP TRIGGER IF EXISTS trigger_auto_generate_participant_code ON participants;
CREATE TRIGGER trigger_auto_generate_participant_code
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_participant_code();

-- Garantir que a coluna é NOT NULL após trigger (opcional, mas recomendado)
-- Comentado porque pode causar erro se já houver dados NULL
-- ALTER TABLE participants ALTER COLUMN participant_code SET NOT NULL;

-- 4. Gerar códigos para participantes existentes que não têm código
-- Usar transação para garantir atomicidade em caso de muitos participantes
DO $$
DECLARE
    participant_record RECORD;
    new_code VARCHAR(6);
BEGIN
    FOR participant_record IN 
        SELECT id FROM participants 
        WHERE participant_code IS NULL OR participant_code = '' OR LENGTH(TRIM(participant_code)) = 0
    LOOP
        -- Gerar código único para cada participante
        new_code := generate_participant_code();
        
        UPDATE participants
        SET participant_code = new_code
        WHERE id = participant_record.id;
    END LOOP;
END $$;

-- 5. Verificar resultado
SELECT 
    COUNT(*) as total_participantes,
    COUNT(participant_code) as com_codigo,
    COUNT(*) - COUNT(participant_code) as sem_codigo
FROM participants;

-- 6. Exemplo de consulta para ver participantes com seus códigos
SELECT 
    id,
    event_id,
    dorsal_number,
    full_name,
    participant_code,
    registration_date
FROM participants
ORDER BY created_at DESC
LIMIT 10;

