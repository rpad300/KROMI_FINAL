-- ==========================================
-- Sistema de Templates de Email Melhorado
-- Suporte para Templates Globais e de Eventos
-- ==========================================
-- Versão: 3.0 - Com correções de tipo
-- Data: 2025-10-27
-- ==========================================

-- 1. Verificar e adicionar coluna event_id à tabela email_templates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'event_id'
    ) THEN
        ALTER TABLE email_templates ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Coluna event_id adicionada a email_templates';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna event_id já existe em email_templates';
    END IF;
END $$;

-- 2. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_email_templates_event_id ON email_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(event_id) WHERE event_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_templates_event ON email_templates(event_id) WHERE event_id IS NOT NULL;

-- 3. Comentários
COMMENT ON COLUMN email_templates.event_id IS 'NULL = template global (admin only), NOT NULL = template do evento';

-- 4. Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "email_templates_policy" ON email_templates;
DROP POLICY IF EXISTS "email_templates_admin_policy" ON email_templates;

-- Nova política simplificada (apenas admin por enquanto)
CREATE POLICY "email_templates_admin_policy" ON email_templates
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 5. Atualizar função render_email_template de forma simplificada
DROP FUNCTION IF EXISTS render_email_template(TEXT, JSONB, UUID);

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
BEGIN
    -- Buscar template baseado no tipo
    IF event_id_param IS NULL THEN
        -- Buscar template global
        SELECT * INTO template_record
        FROM email_templates
        WHERE template_key = template_key_param
        AND is_active = true
        AND event_id IS NULL
        LIMIT 1;
    ELSE
        -- Buscar template do evento (comparação explícita cast)
        SELECT * INTO template_record
        FROM email_templates
        WHERE template_key = template_key_param
        AND is_active = true
        AND event_id::TEXT = event_id_param::TEXT
        LIMIT 1;
    END IF;
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Adicionar event_id à tabela email_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' 
        AND column_name = 'event_id'
    ) THEN
        ALTER TABLE email_logs ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Coluna event_id adicionada a email_logs';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna event_id já existe em email_logs';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_logs_event_id ON email_logs(event_id);
COMMENT ON COLUMN email_logs.event_id IS 'ID do evento relacionado (opcional)';

-- 7. Atualizar RLS do email_logs
DROP POLICY IF EXISTS "email_logs_policy" ON email_logs;

CREATE POLICY "email_logs_policy" ON email_logs
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 8. Verificação final
SELECT 
    '✅ Schema atualizado com sucesso!' as status,
    COUNT(*) FILTER (WHERE event_id IS NULL) as global_templates,
    COUNT(*) FILTER (WHERE event_id IS NOT NULL) as event_templates
FROM email_templates;

