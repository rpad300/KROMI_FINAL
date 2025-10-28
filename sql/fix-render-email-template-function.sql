-- ==========================================
-- Corrigir função render_email_template
-- ==========================================
-- Remove a ambiguidade entre múltiplas versões da função
-- ==========================================

-- Remover todas as versões existentes da função
DROP FUNCTION IF EXISTS render_email_template(text, jsonb);
DROP FUNCTION IF EXISTS render_email_template(text, jsonb, uuid);

-- Criar apenas uma versão com event_id_param opcional (padrão NULL)
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
        -- Buscar template global (event_id IS NULL)
        SELECT * INTO template_record
        FROM email_templates
        WHERE template_key = template_key_param
        AND is_active = true
        AND event_id IS NULL
        LIMIT 1;
        
        template_found := FOUND;
    ELSE
        -- Buscar template do evento específico
        SELECT * INTO template_record
        FROM email_templates
        WHERE template_key = template_key_param
        AND is_active = true
        AND event_id::TEXT = event_id_param::TEXT
        LIMIT 1;
        
        template_found := FOUND;
        
        -- Se não encontrou template do evento, tentar global como fallback
        IF NOT template_found THEN
            SELECT * INTO template_record
            FROM email_templates
            WHERE template_key = template_key_param
            AND is_active = true
            AND event_id IS NULL
            LIMIT 1;
            
            template_found := FOUND;
        END IF;
    END IF;
    
    IF NOT template_found THEN
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

-- Comentário descritivo
COMMENT ON FUNCTION render_email_template(TEXT, JSONB, UUID) IS 
'Renderiza um template de email substituindo variáveis. 
Parâmetros:
- template_key_param: Chave do template
- variables_param: JSON com variáveis para substituir (ex: {"user_name": "João"})
- event_id_param: UUID do evento (opcional). Se NULL, busca template global.
Retorna: subject e body_html renderizados';

-- Verificação
SELECT 
    '✅ Função render_email_template corrigida!' as status,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'render_email_template';

