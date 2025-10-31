-- ==========================================
-- Sistema de Templates de SMS
-- ==========================================
-- 
-- Este script cria a estrutura para gestão de templates de SMS
-- com suporte a variáveis dinâmicas
-- 
-- Versão: 1.0
-- Data: 2025-10-27
-- ==========================================

-- 1. TABELA DE TEMPLATES DE SMS
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    message TEXT NOT NULL, -- Mensagem SMS (máx 160 caracteres recomendado)
    description TEXT,
    variables JSONB DEFAULT '[]'::jsonb, -- Array de variáveis disponíveis
    example_data JSONB DEFAULT '{}'::jsonb, -- Dados de exemplo para preview
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE sms_templates IS 'Templates de SMS do sistema VisionKrono';
COMMENT ON COLUMN sms_templates.template_key IS 'Chave única do template (ex: phone_verification, welcome_sms)';
COMMENT ON COLUMN sms_templates.name IS 'Nome amigável do template';
COMMENT ON COLUMN sms_templates.message IS 'Mensagem SMS com variáveis {{var_name}}';
COMMENT ON COLUMN sms_templates.description IS 'Descrição do template e quando é usado';
COMMENT ON COLUMN sms_templates.variables IS 'Array JSON com variáveis disponíveis: [{"name": "code", "description": "Código de verificação", "required": true}]';
COMMENT ON COLUMN sms_templates.example_data IS 'Dados de exemplo para preview: {"code": "123456", "user_name": "João"}';

-- 2. TABELA DE LOG DE SMS ENVIADOS
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending', 'delivered')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Dados adicionais sobre o envio
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE sms_logs IS 'Registo de SMS enviados pelo sistema';
COMMENT ON COLUMN sms_logs.template_key IS 'Chave do template usado';
COMMENT ON COLUMN sms_logs.metadata IS 'Informações adicionais (provider, cost, etc.)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_sms_templates_key ON sms_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_logs_template ON sms_logs(template_key);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);

-- Triggers
CREATE OR REPLACE FUNCTION update_sms_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sms_templates_updated_at
    BEFORE UPDATE ON sms_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_templates_updated_at();

-- RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "sms_templates_policy" ON sms_templates;
CREATE POLICY "sms_templates_policy" ON sms_templates
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sms_logs_policy" ON sms_logs;
CREATE POLICY "sms_logs_policy" ON sms_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Função para renderizar template SMS com variáveis
CREATE OR REPLACE FUNCTION render_sms_template(
    template_key_param TEXT,
    variables_param JSONB
)
RETURNS TABLE (
    message TEXT
) AS $$
DECLARE
    template_record RECORD;
    rendered_message TEXT;
    var_key TEXT;
    var_value TEXT;
BEGIN
    -- Buscar template
    SELECT * INTO template_record
    FROM sms_templates
    WHERE template_key = template_key_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template SMS não encontrado: %', template_key_param;
    END IF;
    
    rendered_message := template_record.message;
    
    -- Substituir variáveis na mensagem
    FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables_param)
    LOOP
        rendered_message := REPLACE(rendered_message, '{{' || var_key || '}}', var_value);
    END LOOP;
    
    RETURN QUERY SELECT rendered_message;
END;
$$ LANGUAGE plpgsql;

-- Comentário descritivo
COMMENT ON FUNCTION render_sms_template(TEXT, JSONB) IS 
'Renderiza um template de SMS substituindo variáveis. 
Parâmetros:
- template_key_param: Chave do template
- variables_param: JSON com variáveis para substituir (ex: {"code": "123456", "user_name": "João"})
Retorna: mensagem renderizada';

-- Inserir templates padrão
INSERT INTO sms_templates (template_key, name, message, description, variables, example_data)
VALUES 
(
    'phone_verification',
    'Verificação de Telefone',
    'Kromi: O seu código de verificação é {{code}}. Expira em {{expires_minutes}} minutos. Não partilhe este código.',
    'Template para envio de código de verificação de telefone',
    '[
        {"name": "code", "description": "Código de verificação de 6 dígitos", "required": true},
        {"name": "expires_minutes", "description": "Minutos até expirar (padrão: 10)", "required": false}
    ]'::jsonb,
    '{"code": "123456", "expires_minutes": "10"}'::jsonb
),
(
    'phone_verification_simple',
    'Verificação de Telefone (Simples)',
    'O seu código Kromi é {{code}}. Válido por {{expires_minutes}} min.',
    'Template simplificado para código de verificação',
    '[
        {"name": "code", "description": "Código de verificação", "required": true},
        {"name": "expires_minutes", "description": "Minutos até expirar", "required": false}
    ]'::jsonb,
    '{"code": "123456", "expires_minutes": "10"}'::jsonb
),
(
    'welcome_sms',
    'Boas-vindas por SMS',
    'Bem-vindo ao Kromi, {{user_name}}! A sua conta foi criada com sucesso. Use o código {{code}} para ativar.',
    'Template para boas-vindas por SMS após registo',
    '[
        {"name": "user_name", "description": "Nome do utilizador", "required": true},
        {"name": "code", "description": "Código de verificação", "required": true}
    ]'::jsonb,
    '{"user_name": "João Silva", "code": "123456"}'::jsonb
),
(
    'login_code',
    'Código de Login',
    'Kromi: O seu código de login é {{code}}. Expira em {{expires_minutes}} minutos.',
    'Template para código de login via telefone',
    '[
        {"name": "code", "description": "Código de login", "required": true},
        {"name": "expires_minutes", "description": "Minutos até expirar", "required": false}
    ]'::jsonb,
    '{"code": "123456", "expires_minutes": "10"}'::jsonb
),
(
    'password_reset_sms',
    'Recuperação de Password',
    'Kromi: O seu código para recuperar a palavra-passe é {{code}}. Expira em {{expires_minutes}} minutos.',
    'Template para recuperação de password via SMS',
    '[
        {"name": "code", "description": "Código de recuperação", "required": true},
        {"name": "expires_minutes", "description": "Minutos até expirar", "required": false}
    ]'::jsonb,
    '{"code": "123456", "expires_minutes": "10"}'::jsonb
),
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

-- Criar view para facilitar consultas
CREATE OR REPLACE VIEW sms_templates_active AS
SELECT 
    id,
    template_key,
    name,
    message,
    description,
    variables,
    example_data,
    is_active,
    created_at,
    updated_at
FROM sms_templates
WHERE is_active = true;

COMMENT ON VIEW sms_templates_active IS 'View com apenas templates SMS ativos';

