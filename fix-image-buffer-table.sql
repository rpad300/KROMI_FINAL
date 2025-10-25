-- =====================================================
-- VisionKrono - Fix Image Buffer Table
-- Corrigir colunas em falta na tabela image_buffer
-- =====================================================

-- Verificar e corrigir tabela image_buffer
DO $$ 
BEGIN
    -- Adicionar colunas em falta se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_buffer' AND column_name = 'processing_result'
    ) THEN
        ALTER TABLE image_buffer ADD COLUMN processing_result TEXT;
    END IF;

    -- Verificar se event_id é nullable (deve ser para compatibilidade)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_buffer' 
        AND column_name = 'event_id' 
        AND is_nullable = 'NO'
    ) THEN
        -- Tornar event_id nullable para compatibilidade
        ALTER TABLE image_buffer ALTER COLUMN event_id DROP NOT NULL;
    END IF;

    -- Verificar se display_image existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_buffer' AND column_name = 'display_image'
    ) THEN
        ALTER TABLE image_buffer ADD COLUMN display_image TEXT;
    END IF;

END $$;

-- Comentários para as colunas
COMMENT ON COLUMN image_buffer.processing_result IS 'Resultado detalhado do processamento';
COMMENT ON COLUMN image_buffer.display_image IS 'Imagem para visualização (Base64)';
COMMENT ON COLUMN image_buffer.event_id IS 'ID do evento (nullable para compatibilidade)';

-- Atualizar RLS se necessário
ALTER TABLE image_buffer ENABLE ROW LEVEL SECURITY;

-- Política de acesso (se não existir)
DROP POLICY IF EXISTS "Allow all operations on image_buffer" ON image_buffer;
CREATE POLICY "Allow all operations on image_buffer" 
ON image_buffer FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- CORREÇÃO DO IMAGE_BUFFER COMPLETA!
-- Agora a tabela tem todas as colunas necessárias:
-- • processing_result - para resultados detalhados
-- • display_image - para imagens de visualização
-- • event_id nullable - para compatibilidade
-- =====================================================
