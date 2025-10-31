-- Adicionar templates SMS adicionais
INSERT INTO sms_templates (template_key, name, message, description, variables, example_data)
VALUES 
(
    'event_notification',
    'Notificação de Evento',
    'Kromi: Lembrete - {{event_name}} começa em breve! Prepare-se para {{event_date}}. Mais info: {{event_url}}',
    'Template para notificações sobre eventos',
    '[
        {"name": "event_name", "description": "Nome do evento", "required": true},
        {"name": "event_date", "description": "Data do evento", "required": true},
        {"name": "event_url", "description": "URL do evento", "required": false}
    ]'::jsonb,
    '{"event_name": "Maratona do Porto 2025", "event_date": "15/01/2025", "event_url": "https://kromi.online/eventos"}'::jsonb
),
(
    'registration_confirmed',
    'Confirmação de Inscrição',
    'Kromi: A sua inscrição em {{event_name}} foi confirmada! Data: {{event_date}}. Não se esqueça!',
    'Template para confirmar inscrição em evento',
    '[
        {"name": "event_name", "description": "Nome do evento", "required": true},
        {"name": "event_date", "description": "Data do evento", "required": true},
        {"name": "user_name", "description": "Nome do utilizador", "required": false}
    ]'::jsonb,
    '{"event_name": "Maratona do Porto 2025", "event_date": "15/01/2025", "user_name": "João Silva"}'::jsonb
),
(
    'account_locked',
    'Conta Bloqueada',
    'Kromi: A sua conta foi temporariamente bloqueada por segurança. Contacte o suporte se não reconhece esta ação.',
    'Template para avisar sobre bloqueio de conta',
    '[]'::jsonb,
    '{}'::jsonb
),
(
    'security_alert',
    'Alerta de Segurança',
    'Kromi: Detectámos um acesso suspeito na sua conta. Se foi você, ignore esta mensagem. Caso contrário, contacte-nos.',
    'Template para alertas de segurança',
    '[]'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    message = EXCLUDED.message,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    example_data = EXCLUDED.example_data,
    updated_at = NOW();

