-- ==========================================
-- Template de Email de Confirmação de Registro
-- ==========================================
-- Este template é usado para enviar email de confirmação
-- quando um utilizador se regista na plataforma
-- ==========================================

-- Template: Confirmação de Registro
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
    'signup_confirmation',
    'Confirmação de Registro',
    '✅ Confirme o seu registo no VisionKrono',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Registro</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; background: #f9f9f9; }
        .message { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #FC6B03; }
        .btn-container { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; box-shadow: 0 4px 6px rgba(252, 107, 3, 0.3); }
        .btn:hover { opacity: 0.9; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: white; }
        .footer p { margin: 5px 0; }
        .link-alt { color: #666; word-break: break-all; font-size: 12px; margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Confirme o seu Registo</h1>
        </div>
        <div class="content">
            <div class="message">
                <p>Olá <strong>{{user_name}}</strong>,</p>
                <p>Obrigado por te registares no <strong>VisionKrono</strong>!</p>
                <p>Para ativar a tua conta, por favor confirma o teu endereço de email clicando no botão abaixo:</p>
            </div>
            
            <div class="btn-container">
                <a href="{{confirmation_url}}" class="btn">✅ Confirmar Email</a>
            </div>
            
            <div class="info-box">
                <p><strong>⚠️ Importante:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Este link é válido por {{expiry_time}} horas</li>
                    <li>Se não te registaste, podes ignorar este email com segurança</li>
                    <li>Após a confirmação, poderás fazer login na plataforma</li>
                </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Se o botão não funcionar, copia e cola o seguinte link no teu navegador:
            </p>
            <div class="link-alt">{{confirmation_url}}</div>
        </div>
        <div class="footer">
            <p><strong>VisionKrono</strong> - Sistema de Gestão de Eventos</p>
            <p>© 2025 VisionKrono. Todos os direitos reservados.</p>
            <p style="margin-top: 10px; color: #999;">Este email foi enviado automaticamente, por favor não responda.</p>
            <p style="color: #999; font-size: 11px;">Enviado por: system@kromi.online</p>
        </div>
    </div>
</body>
</html>',
    'Template enviado quando um utilizador se regista e precisa confirmar o email',
    '[{"name": "user_name", "description": "Nome completo do utilizador", "required": true}, {"name": "confirmation_url", "description": "URL de confirmação gerada pelo Supabase", "required": true}, {"name": "expiry_time", "description": "Tempo de expiração do link (ex: 24 horas)", "required": false}]'::jsonb,
    '{"user_name": "João Silva", "confirmation_url": "https://192.168.1.219:1144/auth/callback?token=abc123&type=signup", "expiry_time": "24"}'::jsonb,
    true,
    NULL
) ON CONFLICT (template_key) 
DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    example_data = EXCLUDED.example_data,
    updated_at = NOW();

-- Verificação
SELECT 
    '✅ Template de confirmação de registro criado/atualizado!' as status,
    template_key,
    name,
    is_active
FROM email_templates
WHERE template_key = 'signup_confirmation';

