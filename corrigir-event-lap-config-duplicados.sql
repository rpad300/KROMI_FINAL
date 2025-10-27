-- ==========================================
-- Correção: event_lap_config duplicados
-- ==========================================
-- 
-- Problema: Múltiplas configurações por evento causam erro 406
-- Solução: Manter apenas a mais recente e adicionar constraint UNIQUE
-- 
-- Data: 2025-10-26
-- ==========================================

-- ==========================================
-- PASSO 1: Backup dos dados atuais
-- ==========================================
-- Execute primeiro para ter backup antes de apagar
CREATE TABLE IF NOT EXISTS event_lap_config_backup AS 
SELECT * FROM event_lap_config;

-- Verificar quantos duplicados existem
SELECT 
    event_id, 
    COUNT(*) as total_configs,
    MIN(created_at) as primeira_config,
    MAX(created_at) as ultima_config
FROM event_lap_config 
GROUP BY event_id 
HAVING COUNT(*) > 1
ORDER BY total_configs DESC;

-- ==========================================
-- PASSO 2: Remover duplicados (manter mais recente)
-- ==========================================

-- Criar tabela temporária com IDs a manter (mais recentes)
CREATE TEMP TABLE configs_to_keep AS
SELECT DISTINCT ON (event_id) id
FROM event_lap_config
ORDER BY event_id, created_at DESC NULLS LAST;

-- Mostrar quantos registros serão removidos
SELECT 
    (SELECT COUNT(*) FROM event_lap_config) as total_antes,
    (SELECT COUNT(*) FROM configs_to_keep) as total_manter,
    (SELECT COUNT(*) FROM event_lap_config) - (SELECT COUNT(*) FROM configs_to_keep) as total_remover;

-- Apagar registros duplicados (manter apenas os da tabela temporária)
DELETE FROM event_lap_config
WHERE id NOT IN (SELECT id FROM configs_to_keep);

-- Verificar resultado
SELECT 
    'Após limpeza' as status,
    COUNT(*) as total_configs,
    COUNT(DISTINCT event_id) as eventos_unicos
FROM event_lap_config;

-- ==========================================
-- PASSO 3: Adicionar constraint UNIQUE
-- ==========================================

-- Adicionar constraint para prevenir futuros duplicados
ALTER TABLE event_lap_config 
DROP CONSTRAINT IF EXISTS event_lap_config_event_id_unique;

ALTER TABLE event_lap_config 
ADD CONSTRAINT event_lap_config_event_id_unique 
UNIQUE (event_id);

-- ==========================================
-- PASSO 4: Verificação final
-- ==========================================

-- Verificar se ainda há duplicados (deve retornar vazio)
SELECT 
    event_id, 
    COUNT(*) as total
FROM event_lap_config 
GROUP BY event_id 
HAVING COUNT(*) > 1;

-- Mostrar resumo final
SELECT 
    'Status final' as info,
    COUNT(*) as total_configuracoes,
    COUNT(DISTINCT event_id) as eventos_com_config
FROM event_lap_config;

-- ==========================================
-- ROLLBACK (se necessário)
-- ==========================================
-- Se algo correr mal, restaurar do backup:
-- 
-- TRUNCATE event_lap_config;
-- INSERT INTO event_lap_config SELECT * FROM event_lap_config_backup;
-- DROP TABLE event_lap_config_backup;
-- ==========================================

-- ==========================================
-- Após confirmar que está tudo OK, apagar backup:
-- DROP TABLE event_lap_config_backup;
-- ==========================================

