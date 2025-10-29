-- =====================================================
-- Adicionar código de acesso alfanumérico aos dispositivos
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Adicionar coluna access_code em event_devices
DO $$ 
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'access_code'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN access_code VARCHAR(6);
        
        -- Criar índice único para garantir códigos únicos
        CREATE UNIQUE INDEX idx_event_devices_access_code ON event_devices(access_code) 
        WHERE access_code IS NOT NULL;
        
        -- Comentário para documentação
        COMMENT ON COLUMN event_devices.access_code IS 
        'Código alfanumérico de 6 dígitos para acesso manual ao dispositivo como alternativa ao QR Code';
    END IF;
END $$;

-- 2. Função para gerar código alfanumérico único
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    code VARCHAR(6);
    exists_check BOOLEAN;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Semelhantes removidos (0,O,I,1)
    max_attempts INT := 100;
    attempts INT := 0;
BEGIN
    LOOP
        -- Gerar código aleatório de 6 caracteres
        code := '';
        FOR i IN 1..6 LOOP
            code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        -- Verificar se código já existe
        SELECT EXISTS(SELECT 1 FROM event_devices WHERE access_code = code) INTO exists_check;
        
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

-- 3. Trigger para gerar código automaticamente ao criar dispositivo
CREATE OR REPLACE FUNCTION auto_generate_access_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Se access_code não está definido, gerar automaticamente
    IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
        NEW.access_code := generate_access_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se existir e recriar
DROP TRIGGER IF EXISTS trigger_auto_generate_access_code ON event_devices;
CREATE TRIGGER trigger_auto_generate_access_code
    BEFORE INSERT ON event_devices
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_access_code();

-- 4. Gerar códigos para dispositivos existentes que não têm código
UPDATE event_devices
SET access_code = generate_access_code()
WHERE access_code IS NULL OR access_code = '';

-- 5. Verificar resultado
SELECT 
    COUNT(*) as total_dispositivos,
    COUNT(access_code) as com_codigo,
    COUNT(*) - COUNT(access_code) as sem_codigo
FROM event_devices;


