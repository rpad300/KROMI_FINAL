-- =====================================================
-- Adicionar Email e Telefone aos Participantes
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar colunas email e phone
DO $$ 
BEGIN
    -- Adicionar email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'email'
    ) THEN
        ALTER TABLE participants ADD COLUMN email TEXT;
        RAISE NOTICE 'Coluna email adicionada!';
    END IF;
    
    -- Adicionar phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'phone'
    ) THEN
        ALTER TABLE participants ADD COLUMN phone TEXT;
        RAISE NOTICE 'Coluna phone adicionada!';
    END IF;
END $$;

-- 2. Comentários
COMMENT ON COLUMN participants.email IS 'Email do participante (obrigatório)';
COMMENT ON COLUMN participants.phone IS 'Telefone do participante (obrigatório)';

-- 3. Garantir que RLS permite operações
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- 4. Criar política que permite TUDO (para desenvolvimento)
DROP POLICY IF EXISTS "Allow all operations on participants" ON participants;
CREATE POLICY "Allow all operations on participants" 
ON participants 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'participants'
ORDER BY ordinal_position;

-- 6. Verificar políticas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'participants';

-- =====================================================
-- CAMPOS E POLÍTICAS DE PARTICIPANTES COMPLETOS!
-- Estrutura final:
-- - dorsal_number (obrigatório)
-- - full_name (obrigatório)
-- - email (obrigatório) ✅
-- - phone (obrigatório) ✅
-- - birth_date (obrigatório)
-- - gender (obrigatório)
-- - team_name (opcional)
-- - category (opcional)
--
-- Políticas RLS: ALLOW ALL (desenvolvimento)
-- =====================================================

