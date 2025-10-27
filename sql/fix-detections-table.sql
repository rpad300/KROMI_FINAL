-- =====================================================
-- VisionKrono - Fix Detections Table
-- Adicionar colunas em falta na tabela detections
-- =====================================================

-- Adicionar colunas em falta na tabela detections
DO $$ 
BEGIN
    -- Adicionar event_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE detections ADD COLUMN event_id UUID;
        CREATE INDEX IF NOT EXISTS idx_detections_event ON detections(event_id);
    END IF;

    -- Adicionar proof_image se não existir (para compatibilidade com image-processor)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'proof_image'
    ) THEN
        ALTER TABLE detections ADD COLUMN proof_image TEXT;
    END IF;

    -- Adicionar detection_method se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'detection_method'
    ) THEN
        ALTER TABLE detections ADD COLUMN detection_method TEXT DEFAULT 'Unknown';
        CREATE INDEX IF NOT EXISTS idx_detections_method ON detections(detection_method);
    END IF;

    -- Adicionar device_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'device_id'
    ) THEN
        ALTER TABLE detections ADD COLUMN device_id UUID;
        CREATE INDEX IF NOT EXISTS idx_detections_device ON detections(device_id);
    END IF;

    -- Adicionar processing_result se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'processing_result'
    ) THEN
        ALTER TABLE detections ADD COLUMN processing_result TEXT;
    END IF;

    -- Adicionar confidence se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'confidence'
    ) THEN
        ALTER TABLE detections ADD COLUMN confidence DECIMAL(5, 4);
    END IF;

    -- Adicionar processing_time_ms se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'processing_time_ms'
    ) THEN
        ALTER TABLE detections ADD COLUMN processing_time_ms INTEGER;
    END IF;

END $$;

-- Comentários para as novas colunas
COMMENT ON COLUMN detections.event_id IS 'ID do evento associado à detecção';
COMMENT ON COLUMN detections.proof_image IS 'Imagem de prova em Base64 (compatibilidade)';
COMMENT ON COLUMN detections.detection_method IS 'Método usado para detecção: Gemini, Google Vision, OCR, QR, Hybrid';
COMMENT ON COLUMN detections.device_id IS 'ID do dispositivo que fez a detecção';
COMMENT ON COLUMN detections.processing_result IS 'Resultado detalhado do processamento';
COMMENT ON COLUMN detections.confidence IS 'Nível de confiança da detecção (0.0 a 1.0)';
COMMENT ON COLUMN detections.processing_time_ms IS 'Tempo de processamento em milissegundos';

-- Atualizar RLS se necessário
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

-- Política de acesso (se não existir)
DROP POLICY IF EXISTS "Allow all operations on detections" ON detections;
CREATE POLICY "Allow all operations on detections" 
ON detections FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- CORREÇÃO COMPLETA!
-- Agora a tabela detections tem todas as colunas necessárias:
-- • event_id - para associar a eventos
-- • proof_image - para compatibilidade com image-processor
-- • detection_method - para identificar o método usado
-- • device_id - para rastrear o dispositivo
-- • processing_result - para detalhes do processamento
-- • confidence - para nível de confiança
-- • processing_time_ms - para métricas de performance
-- =====================================================
