-- SOLUÇÃO AUTOMÁTICA: Criar Perfil Admin
-- Execute este script completo

-- 1. Obter ID do utilizador e criar perfil automaticamente
INSERT INTO user_profiles (
    user_id,
    email,
    profile_type,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    u.id,
    'Rdias300@gmail.com',
    'admin',
    true,
    now(),
    now()
FROM auth.users u 
WHERE u.email = 'Rdias300@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
);

-- 2. Verificar resultado
SELECT 
    'Perfil criado/verificado:' as status,
    u.id,
    u.email,
    p.profile_type,
    p.is_active,
    p.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';

-- 3. Contar perfis criados
SELECT 
    'Total de perfis admin:' as info,
    COUNT(*) as total
FROM user_profiles 
WHERE profile_type = 'admin' AND is_active = true;


