-- Criar Perfil Admin (Utilizador já existe)
-- Execute este script para criar o perfil do administrador

-- 1. Verificar se o utilizador existe
SELECT 
    'Utilizador encontrado:' as status,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- 2. Obter ID do utilizador
SELECT 
    'ID para usar:' as info,
    id as user_id
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- 3. Verificar se já existe perfil
SELECT 
    'Perfil existente:' as status,
    user_id,
    email,
    profile_type,
    is_active
FROM user_profiles 
WHERE email = 'Rdias300@gmail.com';

-- 4. Criar perfil (substitua USER_ID pelo ID obtido no passo 2)
-- Exemplo: se o ID for '123e4567-e89b-12d3-a456-426614174000'
INSERT INTO user_profiles (
    user_id,
    email,
    profile_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    'SUBSTITUIR_PELO_ID_REAL',  -- Substitua pelo ID do passo 2
    'Rdias300@gmail.com',
    'admin',
    true,
    now(),
    now()
);

-- 5. Verificar resultado final
SELECT 
    'Resultado final:' as status,
    u.id,
    u.email,
    p.profile_type,
    p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';


