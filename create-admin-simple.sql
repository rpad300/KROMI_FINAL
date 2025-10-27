-- Script Simples: Verificar e Criar Admin
-- Execute este script passo a passo

-- 1. Verificar se o utilizador existe
SELECT 'Verificando utilizador...' as status;
SELECT id, email FROM auth.users WHERE email = 'Rdias300@gmail.com';

-- 2. Verificar se existe perfil
SELECT 'Verificando perfil...' as status;
SELECT user_id, email, profile_type FROM user_profiles WHERE email = 'Rdias300@gmail.com';

-- 3. Se não existir utilizador, criar manualmente
-- (Execute apenas se o passo 1 não retornar resultados)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
) VALUES (
    gen_random_uuid(),
    'Rdias300@gmail.com',
    crypt('1234876509', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated'
);

-- 4. Obter ID do utilizador
SELECT 'ID do utilizador:' as info, id FROM auth.users WHERE email = 'Rdias300@gmail.com';

-- 5. Criar perfil (substitua USER_ID pelo ID obtido no passo 4)
-- Exemplo: INSERT INTO user_profiles (user_id, email, profile_type, is_active) VALUES ('USER_ID_AQUI', 'Rdias300@gmail.com', 'admin', true);

-- 6. Verificar resultado final
SELECT 'Resultado final:' as status;
SELECT 
    u.id,
    u.email,
    p.profile_type,
    p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';


