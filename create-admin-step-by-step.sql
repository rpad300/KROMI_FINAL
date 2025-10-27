-- SOLUÇÃO DIRETA: Criar Admin Passo a Passo
-- Execute cada bloco separadamente

-- BLOCO 1: Verificar se utilizador existe
SELECT 
    'Utilizador existe:' as status,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- BLOCO 2: Se não existir, criar utilizador
-- (Execute apenas se o BLOCO 1 não retornar resultados)
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

-- BLOCO 3: Obter ID do utilizador
SELECT 
    'ID para usar no próximo passo:' as info,
    id as user_id
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- BLOCO 4: Criar perfil (substitua USER_ID pelo ID do BLOCO 3)
-- Exemplo: se o ID for '123e4567-e89b-12d3-a456-426614174000'
-- INSERT INTO user_profiles (user_id, email, profile_type, is_active, created_at, updated_at) 
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'Rdias300@gmail.com', 'admin', true, now(), now());

-- BLOCO 5: Verificar resultado final
SELECT 
    'Resultado final:' as status,
    u.id,
    u.email,
    p.profile_type,
    p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';


