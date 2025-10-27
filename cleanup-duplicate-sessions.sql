-- LIMPAR SESSÕES DUPLICADAS
-- Execute este script para limpar sessões antigas e duplicadas

-- 1. Verificar quantas sessões existem
SELECT 
    'Sessões antes da limpeza:' as status,
    COUNT(*) as total_sessoes
FROM user_sessions;

-- 2. Verificar sessões por utilizador
SELECT 
    'Sessões por utilizador:' as info,
    user_id,
    COUNT(*) as total_sessoes
FROM user_sessions
GROUP BY user_id
ORDER BY total_sessoes DESC;

-- 3. Remover sessões expiradas
DELETE FROM user_sessions 
WHERE expires_at < NOW();

-- 4. Remover sessões duplicadas (manter apenas a mais recente)
DELETE FROM user_sessions 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM user_sessions
    ORDER BY user_id, created_at DESC
);

-- 5. Verificar quantas sessões restam
SELECT 
    'Sessões após limpeza:' as status,
    COUNT(*) as total_sessoes
FROM user_sessions;

-- 6. Verificar sessões restantes por utilizador
SELECT 
    'Sessões restantes por utilizador:' as info,
    user_id,
    COUNT(*) as total_sessoes,
    MAX(created_at) as ultima_sessao
FROM user_sessions
GROUP BY user_id
ORDER BY ultima_sessao DESC;

-- 7. Mensagem de sucesso
SELECT 'Limpeza de sessões concluída!' as status;


