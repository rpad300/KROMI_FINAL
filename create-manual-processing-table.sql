-- Criar tabela para processamento manual de imagens
-- Esta tabela armazena imagens que precisam ser processadas manualmente

CREATE TABLE IF NOT EXISTS manual_processing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id UUID NOT NULL REFERENCES image_buffer(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_id UUID NOT NULL,
    session_id UUID NOT NULL,
    device_order INTEGER NOT NULL,
    image_data TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_by UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    detected_number INTEGER,
    confidence DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE manual_processing IS 'Tabela para processamento manual de imagens que não puderam ser processadas automaticamente';
COMMENT ON COLUMN manual_processing.image_id IS 'ID da imagem no buffer';
COMMENT ON COLUMN manual_processing.event_id IS 'ID do evento';
COMMENT ON COLUMN manual_processing.device_id IS 'ID do dispositivo';
COMMENT ON COLUMN manual_processing.session_id IS 'ID da sessão';
COMMENT ON COLUMN manual_processing.device_order IS 'Ordem do dispositivo no evento';
COMMENT ON COLUMN manual_processing.image_data IS 'Dados da imagem em Base64';
COMMENT ON COLUMN manual_processing.captured_at IS 'Data/hora de captura da imagem';
COMMENT ON COLUMN manual_processing.status IS 'Status do processamento: pending, processing, completed, failed';
COMMENT ON COLUMN manual_processing.processed_by IS 'ID do usuário que processou (se aplicável)';
COMMENT ON COLUMN manual_processing.processed_at IS 'Data/hora do processamento';
COMMENT ON COLUMN manual_processing.detected_number IS 'Número detectado manualmente';
COMMENT ON COLUMN manual_processing.confidence IS 'Confiança da detecção manual';
COMMENT ON COLUMN manual_processing.notes IS 'Notas adicionais sobre o processamento';

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_manual_processing_event_id ON manual_processing(event_id);
CREATE INDEX IF NOT EXISTS idx_manual_processing_status ON manual_processing(status);
CREATE INDEX IF NOT EXISTS idx_manual_processing_created_at ON manual_processing(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_processing_device_id ON manual_processing(device_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_manual_processing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_manual_processing_updated_at
    BEFORE UPDATE ON manual_processing
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_processing_updated_at();

-- Habilitar RLS
ALTER TABLE manual_processing ENABLE ROW LEVEL SECURITY;

-- Política RLS para permitir leitura e escrita
DROP POLICY IF EXISTS "manual_processing_policy" ON manual_processing;
CREATE POLICY "manual_processing_policy" ON manual_processing
    FOR ALL USING (true) WITH CHECK (true);

-- Função para obter imagens pendentes de processamento manual
CREATE OR REPLACE FUNCTION get_pending_manual_processing(event_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    image_id UUID,
    event_id UUID,
    device_id UUID,
    session_id UUID,
    device_order INTEGER,
    image_data TEXT,
    captured_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id,
        mp.image_id,
        mp.event_id,
        mp.device_id,
        mp.session_id,
        mp.device_order,
        mp.image_data,
        mp.captured_at,
        mp.created_at
    FROM manual_processing mp
    WHERE mp.status = 'pending'
    AND (event_id_param IS NULL OR mp.event_id = event_id_param)
    ORDER BY mp.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar processamento manual como concluído
CREATE OR REPLACE FUNCTION complete_manual_processing(
    processing_id UUID,
    detected_number_param INTEGER,
    confidence_param DECIMAL(3,2) DEFAULT 1.0,
    notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    processing_record RECORD;
BEGIN
    -- Buscar registro
    SELECT * INTO processing_record 
    FROM manual_processing 
    WHERE id = processing_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Processamento manual não encontrado ou já processado: %', processing_id;
    END IF;
    
    -- Atualizar registro
    UPDATE manual_processing 
    SET 
        status = 'completed',
        detected_number = detected_number_param,
        confidence = confidence_param,
        notes = notes_param,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = processing_id;
    
    -- Criar classificação se número foi detectado
    IF detected_number_param IS NOT NULL THEN
        INSERT INTO classifications (
            event_id,
            dorsal_number,
            device_id,
            device_order,
            detection_time,
            detection_method,
            confidence_score,
            proof_image,
            created_at
        ) VALUES (
            processing_record.event_id,
            detected_number_param,
            processing_record.device_id,
            processing_record.device_order,
            processing_record.captured_at,
            'Manual Processing',
            confidence_param,
            processing_record.image_data,
            NOW()
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar processamento manual como falhado
CREATE OR REPLACE FUNCTION fail_manual_processing(
    processing_id UUID,
    notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE manual_processing 
    SET 
        status = 'failed',
        notes = notes_param,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = processing_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Processamento manual não encontrado ou já processado: %', processing_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
