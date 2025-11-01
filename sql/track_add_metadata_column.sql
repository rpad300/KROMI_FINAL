-- Adicionar coluna metadata se não existir
ALTER TABLE track_routes 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Comentário
COMMENT ON COLUMN track_routes.metadata IS 'Metadados extras (GPX info, configurações específicas, etc.)';

