-- ============================================================================
-- SISTEMA DE ATRIBUIÇÃO AUTOMÁTICA DE DORSAIS
-- ============================================================================
-- Atribui dorsais automaticamente quando participante é criado via formulário
-- Preserva dorsais que vêm de importação (CSV/Excel)
-- ============================================================================

-- Função de atribuição automática
CREATE OR REPLACE FUNCTION auto_assign_dorsal_number()
RETURNS TRIGGER AS $$
DECLARE
    v_settings JSONB;
    v_mode TEXT;
    v_start_from INTEGER;
    v_next_dorsal INTEGER;
    v_category TEXT;
    v_category_start INTEGER;
    v_category_end INTEGER;
BEGIN
    -- Se já tem dorsal (importação ou manual), manter
    IF NEW.dorsal_number IS NOT NULL THEN
        RAISE NOTICE 'Dorsal já definido: %, mantendo', NEW.dorsal_number;
        RETURN NEW;
    END IF;
    
    -- Buscar configurações do evento
    SELECT settings INTO v_settings
    FROM events
    WHERE id = NEW.event_id;
    
    -- Modo de atribuição (default: sequential)
    v_mode := COALESCE(v_settings->'dorsal_assignment'->>'mode', 'sequential');
    v_start_from := COALESCE((v_settings->'dorsal_assignment'->>'start_from')::INTEGER, 1);
    
    RAISE NOTICE 'Atribuindo dorsal: mode=%, start_from=%', v_mode, v_start_from;
    
    -- ========================================================================
    -- MODO: SEQUENCIAL SIMPLES
    -- ========================================================================
    IF v_mode = 'sequential' THEN
        -- Próximo dorsal disponível para este evento
        SELECT COALESCE(MAX(dorsal_number), v_start_from - 1) + 1 
        INTO v_next_dorsal
        FROM participants
        WHERE event_id = NEW.event_id;
        
        -- Garantir que respeita start_from
        v_next_dorsal := GREATEST(v_next_dorsal, v_start_from);
        
        NEW.dorsal_number := v_next_dorsal;
        RAISE NOTICE 'Dorsal atribuído (sequential): %', v_next_dorsal;
    
    -- ========================================================================
    -- MODO: POR CATEGORIA
    -- ========================================================================
    ELSIF v_mode = 'per_category' THEN
        v_category := NEW.category;
        
        -- Buscar range da categoria
        v_category_start := (v_settings->'dorsal_assignment'->'category_ranges'->v_category->>'start')::INTEGER;
        v_category_end := (v_settings->'dorsal_assignment'->'category_ranges'->v_category->>'end')::INTEGER;
        
        IF v_category_start IS NULL OR v_category_end IS NULL THEN
            -- Categoria não configurada, usar sequencial simples
            SELECT COALESCE(MAX(dorsal_number), v_start_from - 1) + 1 
            INTO v_next_dorsal
            FROM participants
            WHERE event_id = NEW.event_id;
            
            v_next_dorsal := GREATEST(v_next_dorsal, v_start_from);
        ELSE
            -- Próximo dorsal disponível dentro do range da categoria
            SELECT COALESCE(MAX(dorsal_number), v_category_start - 1) + 1 
            INTO v_next_dorsal
            FROM participants
            WHERE event_id = NEW.event_id
                AND category = v_category
                AND dorsal_number >= v_category_start
                AND dorsal_number <= v_category_end;
            
            v_next_dorsal := GREATEST(v_next_dorsal, v_category_start);
            
            -- Verificar se ultrapassou o limite
            IF v_next_dorsal > v_category_end THEN
                RAISE EXCEPTION 'Categoria % esgotou dorsais (limite: %-%). Ajuste as configurações.', 
                    v_category, v_category_start, v_category_end;
            END IF;
        END IF;
        
        NEW.dorsal_number := v_next_dorsal;
        RAISE NOTICE 'Dorsal atribuído (per_category %): %', v_category, v_next_dorsal;
    
    -- ========================================================================
    -- MODO: RANDOM (Sortear dorsais)
    -- ========================================================================
    ELSIF v_mode = 'random' THEN
        -- Sortear dorsal entre start_from e end_at
        DECLARE
            v_end_at INTEGER;
            v_attempts INTEGER := 0;
        BEGIN
            v_end_at := COALESCE((v_settings->'dorsal_assignment'->>'end_at')::INTEGER, 9999);
            
            LOOP
                v_next_dorsal := v_start_from + floor(random() * (v_end_at - v_start_from + 1))::INTEGER;
                
                -- Verificar se dorsal já existe
                IF NOT EXISTS (
                    SELECT 1 FROM participants 
                    WHERE event_id = NEW.event_id 
                    AND dorsal_number = v_next_dorsal
                ) THEN
                    EXIT;
                END IF;
                
                v_attempts := v_attempts + 1;
                IF v_attempts > 100 THEN
                    RAISE EXCEPTION 'Não foi possível encontrar dorsal disponível após 100 tentativas';
                END IF;
            END LOOP;
            
            NEW.dorsal_number := v_next_dorsal;
            RAISE NOTICE 'Dorsal atribuído (random): %', v_next_dorsal;
        END;
    
    ELSE
        -- Modo desconhecido, usar sequencial
        SELECT COALESCE(MAX(dorsal_number), v_start_from - 1) + 1 
        INTO v_next_dorsal
        FROM participants
        WHERE event_id = NEW.event_id;
        
        v_next_dorsal := GREATEST(v_next_dorsal, v_start_from);
        NEW.dorsal_number := v_next_dorsal;
        
        RAISE WARNING 'Modo de atribuição desconhecido: %, usando sequential', v_mode;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir trigger
DROP TRIGGER IF EXISTS auto_assign_dorsal_trigger ON participants;

CREATE TRIGGER auto_assign_dorsal_trigger
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_dorsal_number();

-- Verificar
SELECT 
    'Trigger criado' as status,
    'participants' as tabela,
    'auto_assign_dorsal_trigger' as trigger_name;

-- Exemplo de configuração para events.settings:
/*
{
  "dorsal_assignment": {
    "mode": "sequential",
    "start_from": 1
  }
}

OU

{
  "dorsal_assignment": {
    "mode": "per_category",
    "start_from": 1,
    "category_ranges": {
      "M20": {"start": 1, "end": 100},
      "M30": {"start": 101, "end": 200},
      "F20": {"start": 201, "end": 300}
    }
  }
}

OU

{
  "dorsal_assignment": {
    "mode": "random",
    "start_from": 100,
    "end_at": 999
  }
}
*/

COMMENT ON FUNCTION auto_assign_dorsal_number IS 'Atribui dorsal automaticamente a novos participantes baseado na configuração do evento';

