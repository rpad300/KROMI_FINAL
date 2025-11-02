-- ============================================================================
-- CORREÇÃO: Alterar event_date de DATE para TIMESTAMPTZ para suportar hora
-- ============================================================================
-- Este script altera a coluna event_date na tabela events de DATE para TIMESTAMPTZ
-- Isso permite armazenar e recuperar a hora junto com a data

-- IMPORTANTE: Faça backup antes de executar!
-- Se houver dados existentes, eles serão convertidos preservando a hora como 00:00:00

BEGIN;

-- Verificar se a coluna existe e qual é o tipo atual
DO $$
DECLARE
    current_type TEXT;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'event_date'
      AND table_schema = 'public';
    
    IF current_type IS NULL THEN
        RAISE EXCEPTION 'Coluna event_date não encontrada na tabela events';
    END IF;
    
    IF current_type = 'date' THEN
        RAISE NOTICE 'Coluna event_date é DATE. Convertendo para TIMESTAMPTZ...';
        
        -- Primeiro, converter valores existentes de DATE para TIMESTAMPTZ
        -- Preservar a data e usar 00:00:00 como hora padrão
        UPDATE events
        SET event_date = (event_date::text || ' 00:00:00+00')::timestamptz
        WHERE event_date IS NOT NULL;
        
        -- Alterar o tipo da coluna
        ALTER TABLE events
        ALTER COLUMN event_date TYPE TIMESTAMPTZ
        USING event_date::timestamptz;
        
        RAISE NOTICE '✅ Coluna event_date convertida para TIMESTAMPTZ com sucesso!';
    ELSIF current_type = 'timestamp with time zone' OR current_type = 'timestamptz' THEN
        RAISE NOTICE 'Coluna event_date já é TIMESTAMPTZ. Nenhuma alteração necessária.';
    ELSE
        RAISE WARNING 'Coluna event_date é do tipo: %. Tipo não reconhecido.', current_type;
    END IF;
END $$;

-- Verificar resultado
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name = 'event_date'
  AND table_schema = 'public';

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute este SELECT para verificar se a conversão funcionou:
-- SELECT id, name, event_date, pg_typeof(event_date) FROM events LIMIT 5;




