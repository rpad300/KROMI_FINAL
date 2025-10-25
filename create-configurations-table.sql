-- Criar tabela configurations se não existir
CREATE TABLE IF NOT EXISTS configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_type TEXT NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Política de acesso
DROP POLICY IF EXISTS "Allow all operations on configurations" ON configurations;
CREATE POLICY "Allow all operations on configurations" 
ON configurations FOR ALL 
USING (true) 
WITH CHECK (true);

-- Inserir configurações padrão se não existirem
INSERT INTO configurations (config_type, config_data) 
VALUES 
    ('dorsal_pattern', '{"patterns": []}'),
    ('number_area', '{"x": 0, "y": 0, "width": 100, "height": 100}'),
    ('calibration', '{"calibrated": false}')
ON CONFLICT (config_type) DO NOTHING;
