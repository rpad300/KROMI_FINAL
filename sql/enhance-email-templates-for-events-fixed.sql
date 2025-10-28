-- ==========================================
-- Sistema de Templates de Email Melhorado
-- Suporte para Templates Globais e de Eventos
-- ==========================================
-- Versão: 2.0
-- Data: 2025-10-27
-- ==========================================

-- 1. Adicionar coluna event_id à tabela email_templates
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 2. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_email_templates_event_id ON email_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(event_id) WHERE event_id IS NULL; -- Templates globais
CREATE INDEX IF NOT EXISTS idx_email_templates_event ON email_templates(event_id) WHERE event_id IS NOT NULL; -- Templates de evento

-- 3. Comentários
COMMENT ON COLUMN email_templates.event_id IS 'NULL = template global (admin only), NOT NULL = template do evento';

-- 4. Atualizar RLS para permitir que gestores de eventos vejam seus templates
DROP POLICY IF EXISTS "email_templates_policy" ON email_templates;
DROP POLICY IF EXISTS "email_templates_admin_policy" ON email_templates;

-- Política para admins: veem todos os templates
CREATE POLICY "email_templates_admin_policy" ON email_templates
    FOR ALL 
    USING (
        -- Admin pode ver todos
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
        OR
        -- Gestor de evento pode ver templates do seu evento
        (
            event_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM events 
                WHERE events.id = email_templates.event_id 
                AND events.created_by = auth.uid()
            )
        )
        OR
        -- Templates globais (NULL event_id) apenas para admin
        (event_id IS NULL AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        ))
    )
    WITH CHECK (
        -- Admin pode criar todos
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
        OR
        -- Gestor pode criar templates para seu evento
        (
            event_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM events 
                WHERE events.id = email_templates.event_id 
                AND events.created_by = auth.uid()
            )
        )
    );

-- 5. Atualizar função render_email_template para suportar event_id opcional
CREATE OR REPLACE FUNCTION render_email_template(
    template_key_param TEXT,
    variables_param JSONB,
    event_id_param UUID DEFAULT NULL
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
    template_found BOOLEAN := false;
BEGIN
    -- Buscar template (global ou do evento)
    IF event_id_param IS NULL THEN
        -- Buscar template global
        SELECT * INTO template_record
        FROM email_templates
        WHERE template_key = template_key_param
        AND is_active = true
        AND event_id IS NULL
        LIMIT 1;
        
        template_found := FOUND;
    ELSE
        -- Buscar template do evento
        SELECT * INTO template_record
        FROM email_templates
        WHERE template_key = template_key_param
        AND is_active = true
        AND event_id::TEXT = event_id_param::TEXT
        LIMIT 1;
        
        template_found := FOUND;
    END IF;
    
    IF NOT template_found THEN
        RAISE EXCEPTION 'Template não encontrado';
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

-- 6. Atualizar table email_logs para incluir event_id
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_event_id ON email_logs(event_id);

COMMENT ON COLUMN email_logs.event_id IS 'ID do evento relacionado (opcional)';

-- 7. Atualizar RLS do email_logs
DROP POLICY IF EXISTS "email_logs_policy" ON email_logs;

CREATE POLICY "email_logs_policy" ON email_logs
    FOR ALL 
    USING (
        -- Admin vê todos
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
        OR
        -- Gestor vê logs do seu evento
        (
            event_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM events 
                WHERE events.id = email_logs.event_id 
                AND events.created_by = auth.uid()
            )
        )
        OR
        -- Logs sem evento ou logs globais (apenas admin)
        (
            event_id IS NULL 
            AND EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_profiles.user_id = auth.uid() 
                AND user_profiles.role = 'admin'
            )
        )
    )
    WITH CHECK (
        -- Admin pode criar todos
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
        OR
        -- Gestor pode criar logs para seu evento
        (
            event_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM events 
                WHERE events.id = email_logs.event_id 
                AND events.created_by = auth.uid()
            )
        )
    );

-- 8. Verificação
SELECT 
    '✅ Schema atualizado com sucesso!' as status,
    COUNT(*) FILTER (WHERE event_id IS NULL) as global_templates,
    COUNT(*) FILTER (WHERE event_id IS NOT NULL) as event_templates
FROM email_templates;

