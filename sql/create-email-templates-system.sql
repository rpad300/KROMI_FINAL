-- ==========================================
-- Sistema de Templates de Email
-- ==========================================
-- 
-- Este script cria a estrutura para gestão de templates de email
-- com suporte a variáveis dinâmicas e preview HTML
-- 
-- Versão: 1.0
-- Data: 2025-10-27
-- ==========================================

-- 1. TABELA DE TEMPLATES DE EMAIL
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    description TEXT,
    variables JSONB DEFAULT '[]'::jsonb, -- Array de variáveis disponíveis
    example_data JSONB DEFAULT '{}'::jsonb, -- Dados de exemplo para preview
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE email_templates IS 'Templates de email do sistema VisionKrono';
COMMENT ON COLUMN email_templates.template_key IS 'Chave única do template (ex: welcome_user, password_reset)';
COMMENT ON COLUMN email_templates.name IS 'Nome amigável do template';
COMMENT ON COLUMN email_templates.subject IS 'Assunto do email';
COMMENT ON COLUMN email_templates.body_html IS 'Corpo do email em HTML';
COMMENT ON COLUMN email_templates.description IS 'Descrição do template e quando é usado';
COMMENT ON COLUMN email_templates.variables IS 'Array JSON com variáveis disponíveis: [{"name": "user_name", "description": "Nome do utilizador", "required": true}]';
COMMENT ON COLUMN email_templates.example_data IS 'Dados de exemplo para preview: {"user_name": "João Silva", "login_url": "https://..."}';

-- 2. TABELA DE LOG DE EMAILS ENVIADOS
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending', 'bounced')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Dados adicionais sobre o envio
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE email_logs IS 'Registo de emails enviados pelo sistema';
COMMENT ON COLUMN email_logs.template_key IS 'Chave do template usado';
COMMENT ON COLUMN email_logs.metadata IS 'Informações adicionais (IP, user_agent, etc.)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Triggers
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "email_templates_policy" ON email_templates;
CREATE POLICY "email_templates_policy" ON email_templates
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "email_logs_policy" ON email_logs;
CREATE POLICY "email_logs_policy" ON email_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Função para renderizar template com variáveis
CREATE OR REPLACE FUNCTION render_email_template(
    template_key_param TEXT,
    variables_param JSONB
)
RETURNS TABLE (
    subject TEXT,
    body_html TEXT
) AS $$
DECLARE
    template_record RECORD;
    rendered_subject TEXT;
    rendered_body TEXT;
    var_key TEXT;
    var_value TEXT;
BEGIN
    -- Buscar template
    SELECT * INTO template_record
    FROM email_templates
    WHERE template_key = template_key_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template não encontrado: %', template_key_param;
    END IF;
    
    rendered_subject := template_record.subject;
    rendered_body := template_record.body_html;
    
    -- Substituir variáveis no subject e body
    FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables_param)
    LOOP
        rendered_subject := REPLACE(rendered_subject, '{{' || var_key || '}}', var_value);
        rendered_body := REPLACE(rendered_body, '{{' || var_key || '}}', var_value);
    END LOOP;
    
    RETURN QUERY SELECT rendered_subject, rendered_body;
END;
$$ LANGUAGE plpgsql;

-- Inserir templates padrão
INSERT INTO email_templates (template_key, name, subject, body_html, description, variables, example_data)
VALUES 
(
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
    '{"user_name": "João Silva", "user_email": "joao@example.com", "temporary_password": "TempPass123!", "app_url": "https://kromi.online"}'::jsonb
),
(
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
    '{"user_name": "João Silva", "reset_url": "https://kromi.online/reset?token=abc123", "expiry_time": "30"}'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;

-- Verificar inserção
SELECT 
    template_key,
    name,
variables,
example_data
FROM email_templates
ORDER BY created_at;

