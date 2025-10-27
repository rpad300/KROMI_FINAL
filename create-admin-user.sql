-- Verificar e Criar Utilizador Administrador
-- Execute este script para verificar se o admin existe

-- 1. Verificar se o utilizador existe na tabela auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- 2. Verificar se existe perfil na tabela user_profiles
SELECT 
    user_id,
    email,
    profile_type,
    is_active,
    created_at
FROM user_profiles 
WHERE email = 'Rdias300@gmail.com';

-- 3. Se não existir utilizador, criar
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
) ON CONFLICT (email) DO NOTHING;

-- 4. Obter ID do utilizador criado
SELECT id FROM auth.users WHERE email = 'Rdias300@gmail.com';

-- 5. Criar perfil do administrador (sem ON CONFLICT)
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

-- 6. Verificar resultado final
SELECT 
    u.id,
    u.email,
    p.profile_type,
    p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';

-- 7. Mensagem de sucesso
SELECT 'Utilizador administrador verificado/criado com sucesso!' as status;
