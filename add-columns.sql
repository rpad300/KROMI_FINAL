-- Adicionar colunas que faltam nas tabelas existentes

-- Adicionar colunas na tabela detections
ALTER TABLE detections 
ADD COLUMN IF NOT EXISTS proof_image_id UUID;

-- Adicionar coluna na tabela configurations  
ALTER TABLE configurations 
ADD COLUMN IF NOT EXISTS config_image_id UUID;

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'detections' 
ORDER BY ordinal_position;
