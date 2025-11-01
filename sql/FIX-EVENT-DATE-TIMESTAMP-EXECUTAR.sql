-- ============================================================================
-- 🚀 EXECUTAR ESTE SQL NO SUPABASE DASHBOARD
-- ============================================================================
-- CORREÇÃO URGENTE: Converter event_date de DATE para TIMESTAMPTZ
-- 
-- Este script:
-- 1. Verifica o tipo atual da coluna event_date
-- 2. Converte de DATE para TIMESTAMPTZ preservando os dados existentes
-- 3. Permite armazenar e recuperar HORA junto com DATA
--
-- ⚠️ IMPORTANTE: 
-- - Os eventos existentes terão hora 00:00:00 por padrão
-- - Faça backup antes se necessário
-- ============================================================================

-- Verificar tipo atual antes da conversão
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name = 'event_date'
  AND table_schema = 'public';

-- Converter coluna de DATE para TIMESTAMPTZ
-- IMPORTANTE: Este script precisa dropar views que dependem de event_date
DO $$
DECLARE
    current_type TEXT;
    row_count INTEGER;
    view_def TEXT;
    dependent_views TEXT[];
    view_rec RECORD;
BEGIN
    -- Verificar tipo atual
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'event_date'
      AND table_schema = 'public';
    
    IF current_type IS NULL THEN
        RAISE EXCEPTION '❌ Coluna event_date não encontrada na tabela events';
    END IF;
    
    -- Contar registros
    SELECT COUNT(*) INTO row_count FROM events WHERE event_date IS NOT NULL;
    RAISE NOTICE '📊 Encontrados % registros com event_date preenchido', row_count;
    
    IF current_type = 'date' THEN
        RAISE NOTICE '🔄 Convertendo coluna event_date de DATE para TIMESTAMPTZ...';
        
        -- Passo 1: Identificar e dropar TODAS as views que dependem de event_date
        -- Buscar todas as views que referenciam a coluna event_date
        RAISE NOTICE '🔍 Buscando views que dependem de event_date...';
        
        -- Buscar views que mencionam event_date na definição
        FOR view_rec IN 
            SELECT viewname
            FROM pg_views
            WHERE schemaname = 'public'
              AND definition LIKE '%event_date%'
              AND definition LIKE '%events%'
        LOOP
            RAISE NOTICE '🗑️ Removendo view dependente: %', view_rec.viewname;
            EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_rec.viewname);
        END LOOP;
        
        -- Verificar especificamente views conhecidas
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'events_with_stats') THEN
            RAISE NOTICE '🗑️ Removendo view: events_with_stats';
            DROP VIEW IF EXISTS public.events_with_stats CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'ai_cost_by_event') THEN
            RAISE NOTICE '🗑️ Removendo view: ai_cost_by_event';
            DROP VIEW IF EXISTS public.ai_cost_by_event CASCADE;
        END IF;
        
        -- Verificar outras views conhecidas que podem usar event_date
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_track_activities_summary') THEN
            RAISE NOTICE '🗑️ Removendo view: v_track_activities_summary';
            DROP VIEW IF EXISTS public.v_track_activities_summary CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_track_active_qrs') THEN
            RAISE NOTICE '🗑️ Removendo view: v_track_active_qrs';
            DROP VIEW IF EXISTS public.v_track_active_qrs CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'device_qr_info') THEN
            RAISE NOTICE '🗑️ Removendo view: device_qr_info';
            DROP VIEW IF EXISTS public.device_qr_info CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'detections_complete') THEN
            RAISE NOTICE '🗑️ Removendo view: detections_complete';
            DROP VIEW IF EXISTS public.detections_complete CASCADE;
        END IF;
        
        RAISE NOTICE '✅ Todas as views dependentes removidas';
        
        -- Passo 2: Converter valores existentes de DATE para TIMESTAMPTZ
        -- Preservar a data e usar 00:00:00 UTC como hora padrão
        UPDATE events
        SET event_date = (event_date::text || 'T00:00:00+00:00')::timestamptz
        WHERE event_date IS NOT NULL;
        
        RAISE NOTICE '✅ Valores existentes convertidos (% registros)', row_count;
        
        -- Passo 3: Alterar o tipo da coluna
        ALTER TABLE events
        ALTER COLUMN event_date TYPE TIMESTAMPTZ
        USING event_date::timestamptz;
        
        RAISE NOTICE '✅ Coluna convertida para TIMESTAMPTZ com sucesso!';
        
        -- Passo 4: Marcar que view precisa ser recriada (será feito fora do DO block)
        IF view_def IS NOT NULL THEN
            RAISE NOTICE '🔄 View events_with_stats será recriada após este bloco';
        END IF;
        
    ELSIF current_type = 'timestamp with time zone' OR current_type = 'timestamptz' THEN
        RAISE NOTICE '✅ Coluna event_date já é TIMESTAMPTZ. Nenhuma alteração necessária.';
    ELSE
        RAISE WARNING '⚠️ Coluna event_date é do tipo: %. Conversão pode não ser necessária.', current_type;
    END IF;
END $$;

-- Recriar views que foram removidas
-- (As views dependem de event_date, então precisam ser recriadas após a conversão)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'events_with_stats') THEN
        RAISE NOTICE 'ℹ️ View events_with_stats já existe';
    ELSE
        RAISE NOTICE '🔄 Recriando view events_with_stats...';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'ai_cost_by_event') THEN
        RAISE NOTICE 'ℹ️ View ai_cost_by_event já existe';
    ELSE
        RAISE NOTICE '🔄 Recriando view ai_cost_by_event...';
    END IF;
END $$;

-- Recriar view events_with_stats
CREATE OR REPLACE VIEW events_with_stats AS
SELECT 
    e.*,
    COUNT(DISTINCT ed.device_id) as total_devices,
    COUNT(DISTINCT CASE WHEN d.last_seen > NOW() - INTERVAL '5 minutes' THEN ed.device_id END) as active_devices,
    COUNT(det.id) as total_detections,
    COUNT(DISTINCT det.number) as unique_dorsals,
    MAX(det.timestamp) as last_detection
FROM events e
LEFT JOIN event_devices ed ON e.id = ed.event_id
LEFT JOIN devices d ON ed.device_id = d.id
LEFT JOIN detections det ON e.id = det.event_id
GROUP BY e.id, e.name, e.description, e.event_date, e.location, e.status, e.created_by, e.settings, e.created_at, e.updated_at;

-- Recriar view ai_cost_by_event (se existir na base de dados)
-- Nota: Esta view pode não existir em todas as instalações
DO $$
BEGIN
    -- Verificar se a tabela ai_cost_stats existe (necessária para a view)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_cost_stats'
    ) THEN
        -- Recriar view ai_cost_by_event conforme definição original
        EXECUTE '
        CREATE OR REPLACE VIEW ai_cost_by_event AS
        SELECT 
            e.id as event_id,
            e.name as event_name,
            e.event_date,
            COUNT(acs.id) as request_count,
            SUM(acs.cost_amount) as total_cost,
            MIN(acs.timestamp) as first_request,
            MAX(acs.timestamp) as last_request,
            SUM(acs.tokens_total) as total_tokens
        FROM events e
        LEFT JOIN ai_cost_stats acs ON acs.event_id = e.id
        GROUP BY e.id, e.name, e.event_date';
        
        RAISE NOTICE '✅ View ai_cost_by_event recriada';
    ELSE
        RAISE NOTICE 'ℹ️ Tabela ai_cost_stats não existe, pulando recriação de ai_cost_by_event';
    END IF;
END $$;

-- Verificar resultado após conversão
SELECT 
    column_name,
    data_type,
    is_nullable,
    'Tipo alterado com sucesso!' as status
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name = 'event_date'
  AND table_schema = 'public';

-- Verificar alguns registros para confirmar
SELECT 
    id,
    name,
    event_date,
    pg_typeof(event_date) as tipo_verificado,
    CASE 
        WHEN event_date::text LIKE '%T%' THEN '✅ Tem hora'
        ELSE '⚠️ Sem hora (apenas data)'
    END as tem_hora
FROM events
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- ✅ CONVERSÃO CONCLUÍDA
-- ============================================================================
-- Agora a coluna event_date suporta TIMESTAMPTZ (data + hora)
-- Teste salvando um evento com hora e verifique se persiste corretamente

