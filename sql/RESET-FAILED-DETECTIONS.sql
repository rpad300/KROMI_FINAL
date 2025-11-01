-- ============================================================================
-- KROMI - Reset registros que falharam para reprocessamento
-- ============================================================================
-- Este script reseta registros com status 'failed' para 'pending' para reprocessamento
-- APENAS execute isto se quiser reprocessar registros que falharam
-- ============================================================================

-- Ver quantos registros falharam
SELECT COUNT(*) as total_failed
FROM device_detections
WHERE status = 'failed';

-- Resetar registros falhados para pending (descomente para executar)
-- UPDATE device_detections
-- SET status = 'pending',
--     processing_error = NULL,
--     processed_at = NULL
-- WHERE status = 'failed'
--     AND processing_error LIKE '%device_id%';

-- ============================================================================
-- ⚠️ NOTA: Descomente as linhas acima se quiser reprocessar registros falhados
-- ============================================================================

