-- Criação rápida da tabela image_buffer
CREATE TABLE IF NOT EXISTS image_buffer (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID,
    device_id UUID,
    session_id TEXT NOT NULL,
    image_data TEXT NOT NULL,
    display_image TEXT,
    image_metadata JSONB DEFAULT '{}',
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(8, 2),
    status TEXT DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    processing_method TEXT,
    detection_results JSONB,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_image_buffer_status ON image_buffer(status);
CREATE INDEX IF NOT EXISTS idx_image_buffer_event ON image_buffer(event_id);

-- RLS
ALTER TABLE image_buffer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on image_buffer" ON image_buffer;
CREATE POLICY "Allow all operations on image_buffer" 
ON image_buffer FOR ALL 
USING (true) 
WITH CHECK (true);
