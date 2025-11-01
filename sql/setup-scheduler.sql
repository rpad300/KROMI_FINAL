-- ============================================================================
-- VISIONKRONO GPS TRACKING - Configurar Scheduler
-- ============================================================================

-- Verificar se pg_cron está disponível
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE 'pg_cron não está instalado. Execute: CREATE EXTENSION pg_cron;';
        RAISE NOTICE 'No Supabase, isto deve estar disponível automaticamente.';
    ELSE
        RAISE NOTICE 'pg_cron disponível! ✓';
    END IF;
END $$;

-- Remover job anterior se existir
SELECT cron.unschedule('process-gps-inbox') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-gps-inbox'
);

-- Criar job para processar inbox a cada 10 segundos
SELECT cron.schedule(
    'process-gps-inbox',          -- Nome do job
    '*/10 * * * * *',              -- Cron: a cada 10 segundos
    $$SELECT track_process_inbox_messages(100);$$  -- Processar até 100 mensagens
);

-- Verificar se foi criado
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname = 'process-gps-inbox';

-- Informações
SELECT 
    'Scheduler Configurado!' as status,
    'Inbox será processada a cada 10 segundos' as info,
    'Processar até 100 mensagens por vez' as batch_size;

