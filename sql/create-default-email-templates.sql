-- ==========================================
-- Criar Templates de Email Padrão
-- ==========================================
-- Este script cria templates de email padrão
-- se ainda não existirem na base de dados
-- ==========================================

-- Template: Boas-vindas (para novos utilizadores)
INSERT INTO email_templates (
    template_key,
    name,
    subject,
    body_html,
    description,
    variables,
    example_data,
    is_active,
    event_id
) VALUES (
    'welcome_user',
    'Email de Boas-vindas',
    '🎉 Bem-vindo ao VisionKrono - {{user_name}}',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao VisionKrono</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials { background: #fff; padding: 20px; border-left: 4px solid #FC6B03; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 30px; background: #FC6B03; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao VisionKrono!</h1>
        </div>
        <div class="content">
            <p>Olá <strong>{{user_name}}</strong>,</p>
            <p>Estamos felizes por te dar as boas-vindas ao VisionKrono! A tua conta foi criada com sucesso.</p>
            
            <div class="credentials">
                <p><strong>📧 Email:</strong> {{user_email}}</p>
                <p><strong>🔑 Password Temporária:</strong> <code>{{temporary_password}}</code></p>
            </div>
            
            <p><strong>⚠️ Importante:</strong> Esta password é temporária. Serás obrigado a alterá-la no primeiro login.</p>
            
            <p><strong>Próximos passos:</strong></p>
            <ol>
                <li>Acesse o sistema através do link: <a href="{{app_url}}">{{app_url}}</a></li>
                <li>Faça login com as credenciais acima</li>
                <li>Complete o seu perfil</li>
                <li>Altere a sua password</li>
            </ol>
            
            <div style="text-align: center;">
                <a href="{{app_url}}" class="btn">🔐 Acessar Sistema</a>
            </div>
        </div>
        <div class="footer">
            <p>© 2025 VisionKrono. Todos os direitos reservados.</p>
            <p>Este email foi enviado automaticamente, por favor não responda.</p>
        </div>
    </div>
</body>
</html>',
    'Template enviado quando um novo utilizador é criado pelo admin',
    '[{"name": "user_name", "description": "Nome completo do utilizador", "required": true}, {"name": "user_email", "description": "Email do utilizador", "required": true}, {"name": "temporary_password", "description": "Password temporária gerada", "required": true}, {"name": "app_url", "description": "URL da aplicação", "required": true}]'::jsonb,
    '{"user_name": "João Silva", "user_email": "joao@example.com", "temporary_password": "TempPass123!", "app_url": "https://kromi.online"}'::jsonb,
    true,
    NULL
) ON CONFLICT (template_key) DO NOTHING;

-- Template: Recuperação de Password
INSERT INTO email_templates (
    template_key,
    name,
    subject,
    body_html,
    description,
    variables,
    example_data,
    is_active,
    event_id
) VALUES (
    'password_reset',
    'Recuperação de Password',
    '🔒 Recuperação de Password - VisionKrono',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
        .btn { display: inline-block; padding: 12px 30px; background: #DC2626; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Recuperação de Password</h1>
        </div>
        <div class="content">
            <p>Olá <strong>{{user_name}}</strong>,</p>
            <p>Recebemos uma solicitação para recuperar a tua password.</p>
            <p>Clique no botão abaixo para redefinir a tua password:</p>
            
            <div style="text-align: center;">
                <a href="{{reset_url}}" class="btn">🔑 Redefinir Password</a>
            </div>
            
            <p><strong>⚠️ Importante:</strong> Este link é válido por {{expiry_time}} minutos.</p>
            <p>Se não solicitaste esta recuperação, podes ignorar este email com segurança.</p>
        </div>
        <div class="footer">
            <p>© 2025 VisionKrono. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>',
    'Template para recuperação de password',
    '[{"name": "user_name", "description": "Nome do utilizador", "required": true}, {"name": "reset_url", "description": "URL de recuperação", "required": true}, {"name": "expiry_time", "description": "Tempo de expiração (ex: 30 minutos)", "required": true}]'::jsonb,
    '{"user_name": "João Silva", "reset_url": "https://kromi.online/reset?token=abc123", "expiry_time": "30"}'::jsonb,
    true,
    NULL
) ON CONFLICT (template_key) DO NOTHING;

-- Verificação
SELECT 
    '✅ Templates padrão criados/verificados!' as status,
    COUNT(*) as total_templates,
    COUNT(*) FILTER (WHERE event_id IS NULL) as global_templates,
    COUNT(*) FILTER (WHERE event_id IS NOT NULL) as event_templates
FROM email_templates;

