-- Adicionar índice para melhorar performance da query de perfil
-- Este script resolve o problema de timeout na query do perfil

-- Verificar se já existe índice
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND indexdef LIKE '%user_id%';

-- Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
ON user_profiles (user_id);

-- Verificar se o índice foi criado
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND indexdef LIKE '%user_id%';

-- Testar query com EXPLAIN para ver performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM user_profiles 
WHERE user_id = '8d772aff-15f2-4484-9dec-5e1646a1b863';


