-- =====================================================
-- VisionKrono - Form Builder System
-- Sistema de formulários dinâmicos por evento
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. TABELA DE CAMPOS CATALOGADOS
-- Campos padrão reutilizáveis em múltiplos eventos
CREATE TABLE IF NOT EXISTS form_field_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL UNIQUE,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN (
        'text',              -- Texto curto
        'textarea',          -- Texto longo
        'email',             -- E-mail
        'phone',             -- Telefone
        'number',            -- Número
        'date',              -- Data
        'select',            -- Lista única
        'multiselect',       -- Lista múltipla escolha
        'checkbox',          -- Checkbox
        'country',           -- País
        'tshirt_size',       -- Tamanho de t-shirt
        'club',              -- Clube
        'file',              -- Ficheiro upload
        'consent',           -- Consentimento
        'gdpr_consent'       -- Consentimento GDPR
    )),
    label_translations JSONB DEFAULT '{}',          -- { "pt": "Nome", "en": "Name" }
    description_translations JSONB DEFAULT '{}',    -- Descrições por idioma
    placeholder_translations JSONB DEFAULT '{}',    -- Placeholders por idioma
    options JSONB,                                   -- Opções para select/multiselect
    validation_rules JSONB DEFAULT '{}',            -- { "required": true, "min": 0, "max": 100, "pattern": "..." }
    default_value TEXT,
    help_text_translations JSONB DEFAULT '{}',      -- Texto de ajuda
    metadata JSONB DEFAULT '{}',                    -- Metadados extras
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE FORMULÁRIOS POR EVENTO
CREATE TABLE IF NOT EXISTS event_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    form_slug VARCHAR(200) NOT NULL,                -- URL único: /event/marathon-2024
    form_title_translations JSONB DEFAULT '{}',     -- { "pt": "Inscrição Marathon", "en": "Marathon Registration" }
    form_description_translations JSONB DEFAULT '{}', -- Descrição do formulário
    version INTEGER NOT NULL DEFAULT 1,             -- Versão do formulário
    published_at TIMESTAMPTZ,                       -- Quando foi publicado
    published_by UUID REFERENCES auth.users(id),    -- Quem publicou
    is_active BOOLEAN DEFAULT true,                 -- Formulário ativo
    settings JSONB DEFAULT '{}',                    -- { "max_submissions": 1000, "captcha_enabled": true, "allow_edits": false }
    payment_config JSONB,                           -- { "enabled": true, "amount": 25.00, "currency": "EUR", "payment_method": "stripe" }
    email_confirmation_config JSONB DEFAULT '{}',   -- { "enabled": true, "template_id": "..." }
    language JSONB DEFAULT '["pt"]',                -- Idiomas disponíveis ["pt", "en"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(event_id, form_slug)
);

-- Criar índice separadamente
CREATE INDEX IF NOT EXISTS idx_event_forms_slug ON event_forms(form_slug);

-- 3. TABELA DE CAMPOS DO FORMULÁRIO
-- Relação entre formulário e campos configurados
CREATE TABLE IF NOT EXISTS event_form_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES event_forms(id) ON DELETE CASCADE,
    field_catalog_id UUID REFERENCES form_field_catalog(id) ON DELETE SET NULL,
    -- Campos custom (fora do catálogo)
    field_key VARCHAR(100) NOT NULL,                -- Identificador único do campo no formulário
    field_type VARCHAR(50) NOT NULL,                -- Tipo do campo
    field_order INTEGER NOT NULL DEFAULT 0,         -- Ordem de exibição
    is_required BOOLEAN DEFAULT false,              -- Campo obrigatório
    is_visible BOOLEAN DEFAULT true,                -- Visibilidade
    -- Condições para exibir o campo
    conditional_logic JSONB DEFAULT '{}',           -- { "show_when": { "field": "age", "operator": ">=", "value": 18 } }
    -- Customizações específicas deste formulário
    label_translations JSONB DEFAULT '{}',          -- Override do label
    placeholder_translations JSONB DEFAULT '{}',    -- Override do placeholder
    description_translations JSONB DEFAULT '{}',    -- Override da descrição
    help_text_translations JSONB DEFAULT '{}',      -- Override do help text
    options JSONB,                                   -- Override das opções (se aplicável)
    validation_rules JSONB DEFAULT '{}',            -- Validações específicas
    default_value TEXT,
    metadata JSONB DEFAULT '{}',                    -- Metadados extras
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE SUBMISSÕES
-- Guarda dados submetidos pelos participantes
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES event_forms(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    form_version INTEGER NOT NULL DEFAULT 1,
    submission_data JSONB NOT NULL,                 -- Todos os dados da submissão
    payment_status VARCHAR(50) DEFAULT 'pending',   -- pending, paid, failed, refunded
    payment_id VARCHAR(200),                        -- ID do pagamento (Stripe, etc.)
    payment_amount DECIMAL(10,2),
    payment_currency VARCHAR(10),
    payment_date TIMESTAMPTZ,
    ip_address INET,                                -- IP do submissor
    user_agent TEXT,                                -- User agent
    language VARCHAR(10) DEFAULT 'pt',              -- Idioma usado
    is_confirmed BOOLEAN DEFAULT false,             -- Confirmado via e-mail
    confirmation_token VARCHAR(100) UNIQUE,         -- Token de confirmação
    confirmation_sent_at TIMESTAMPTZ,               -- Quando foi enviado
    confirmed_at TIMESTAMPTZ,                       -- Quando foi confirmado
    status VARCHAR(50) DEFAULT 'draft',             -- draft, submitted, confirmed, cancelled
    metadata JSONB DEFAULT '{}',                    -- Metadados extras
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE FICHEIROS UPLOADED
-- Guarda ficheiros anexados às submissões
CREATE TABLE IF NOT EXISTS form_submission_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    form_field_key VARCHAR(100) NOT NULL,           -- Campo que gerou o upload
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,                     -- Em bytes
    file_type VARCHAR(100),                         -- MIME type
    file_url TEXT NOT NULL,                         -- URL do ficheiro no storage
    storage_bucket VARCHAR(100),                    -- Bucket do Supabase Storage
    storage_path TEXT,                              -- Caminho no storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE REDIRECIONAMENTOS
-- Manter slugs antigos válidos quando o nome do evento muda
CREATE TABLE IF NOT EXISTS event_form_slug_redirects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    old_slug VARCHAR(200) NOT NULL,
    new_slug VARCHAR(200) NOT NULL,
    redirect_count INTEGER DEFAULT 0,               -- Contador de redirecionamentos
    last_redirect_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, old_slug)
);

-- 7. TABELA DE HISTÓRICO DE VERSÕES
-- Histórico de alterações no formulário
CREATE TABLE IF NOT EXISTS event_form_version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES event_forms(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    fields_snapshot JSONB NOT NULL,                 -- Snapshot dos campos
    changes_description TEXT,                       -- Descrição das mudanças
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(form_id, version)
);

-- 8. TABELA DE AUDITORIA
-- Logs de quem alterou o quê e quando
CREATE TABLE IF NOT EXISTS form_builder_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES event_forms(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,                   -- created, updated, deleted, published, unpublished
    entity_type VARCHAR(100) NOT NULL,              -- form, field, submission
    entity_id UUID,                                 -- ID da entidade alterada
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    changes JSONB DEFAULT '{}',                     -- Dados alterados
    metadata JSONB DEFAULT '{}',                    -- Metadados extras
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FUNÇÃO: Gerar slug único a partir do nome do evento
CREATE OR REPLACE FUNCTION generate_event_form_slug(event_name TEXT, event_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    slug_exists BOOLEAN;
    counter INTEGER := 0;
BEGIN
    -- Normalizar: minúsculas, remover acentos, substituir espaços por hífen
    base_slug := LOWER(event_name);
    
    -- Remover acentos
    base_slug := TRANSLATE(base_slug, 
        'áàâãäéèêëíìîïóòôõöúùûüçñýÿ',
        'aaaaaeeeeiiiioooouuuucnyy'
    );
    
    -- Remover caracteres especiais, manter apenas letras, números e hífen
    base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9-]', '-', 'g');
    
    -- Remover múltiplos hífens consecutivos
    base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
    
    -- Remover hífens no início e fim
    base_slug := TRIM(base_slug, '-');
    
    -- Garantir que não está vazio
    IF base_slug = '' THEN
        base_slug := 'event-' || SUBSTRING(event_id::TEXT, 1, 8);
    END IF;
    
    final_slug := base_slug;
    
    -- Verificar unicidade (para o mesmo event_id ou outro event_id)
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM event_forms 
            WHERE form_slug = final_slug 
            AND id != event_id  -- Permitir atualização do mesmo evento
        ) INTO slug_exists;
        
        EXIT WHEN NOT slug_exists;
        
        -- Se existe, adicionar contador
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNÇÃO: Criar redirecionamento ao mudar slug
CREATE OR REPLACE FUNCTION create_form_slug_redirect()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o slug mudou e existe um slug antigo
    IF OLD.form_slug IS DISTINCT FROM NEW.form_slug AND OLD.form_slug IS NOT NULL THEN
        INSERT INTO event_form_slug_redirects (event_id, old_slug, new_slug)
        VALUES (NEW.event_id, OLD.form_slug, NEW.form_slug)
        ON CONFLICT (event_id, old_slug) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. TRIGGER: Criar redirecionamento ao atualizar slug
CREATE TRIGGER trigger_create_form_slug_redirect
    AFTER UPDATE OF form_slug ON event_forms
    FOR EACH ROW
    WHEN (OLD.form_slug IS DISTINCT FROM NEW.form_slug)
    EXECUTE FUNCTION create_form_slug_redirect();

-- 12. FUNÇÃO: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. TRIGGERS: Atualizar updated_at
CREATE TRIGGER update_form_field_catalog_updated_at 
    BEFORE UPDATE ON form_field_catalog 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_forms_updated_at 
    BEFORE UPDATE ON event_forms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_form_fields_updated_at 
    BEFORE UPDATE ON event_form_fields 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at 
    BEFORE UPDATE ON form_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 14. FUNÇÃO: Registar auditoria
CREATE OR REPLACE FUNCTION log_form_builder_action(
    p_form_id UUID,
    p_event_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_user_id UUID,
    p_user_email TEXT,
    p_changes JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO form_builder_audit_logs (
        form_id, event_id, action, entity_type, entity_id,
        user_id, user_email, changes, metadata, ip_address
    )
    VALUES (
        p_form_id, p_event_id, p_action, p_entity_type, p_entity_id,
        p_user_id, p_user_email, p_changes, p_metadata, p_ip_address
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 15. FUNÇÃO: Validar pagamento
CREATE OR REPLACE FUNCTION validate_submission_payment(
    p_submission_id UUID,
    p_payment_status TEXT,
    p_payment_id TEXT DEFAULT NULL,
    p_payment_amount DECIMAL DEFAULT NULL,
    p_payment_currency TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    form_payment_config JSONB;
BEGIN
    -- Buscar configuração de pagamento do formulário
    SELECT f.payment_config
    INTO form_payment_config
    FROM event_forms f
    INNER JOIN form_submissions s ON s.form_id = f.id
    WHERE s.id = p_submission_id;
    
    -- Se não tem pagamento configurado, sempre válido
    IF form_payment_config IS NULL OR (form_payment_config->>'enabled')::boolean = false THEN
        RETURN p_payment_status IS NULL OR p_payment_status = 'pending';
    END IF;
    
    -- Se tem pagamento configurado, validar
    RETURN p_payment_status IN ('paid', 'pending');
END;
$$ LANGUAGE plpgsql;

-- 16. RLS Policies (Row Level Security)
-- Habilitar RLS
ALTER TABLE form_field_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_form_slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_form_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para form_field_catalog (público ler, apenas admins escrever)
CREATE POLICY "Anyone can read catalog fields" 
    ON form_field_catalog FOR SELECT 
    USING (true);

CREATE POLICY "Only admins can insert catalog fields" 
    ON form_field_catalog FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Only admins can update catalog fields" 
    ON form_field_catalog FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Políticas para event_forms (organizadores podem gerir seus formulários)
CREATE POLICY "Anyone can read published forms" 
    ON event_forms FOR SELECT 
    USING (is_active = true AND published_at IS NOT NULL);

CREATE POLICY "Organizers can manage their event forms" 
    ON event_forms FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_forms.event_id
            AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT)
        )
    );

CREATE POLICY "Admins can manage all forms" 
    ON event_forms FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Políticas para event_form_fields (mesmas regras que event_forms)
CREATE POLICY "Anyone can read published form fields" 
    ON event_form_fields FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM event_forms f
            WHERE f.id = event_form_fields.form_id
            AND f.is_active = true AND f.published_at IS NOT NULL
        )
    );

CREATE POLICY "Organizers can manage form fields" 
    ON event_form_fields FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM events e
            INNER JOIN event_forms f ON f.event_id = e.id
            WHERE f.id = event_form_fields.form_id
            AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT)
        )
    );

CREATE POLICY "Admins can manage all form fields" 
    ON event_form_fields FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- Políticas para form_submissions (organizadores podem ver suas submissões)
CREATE POLICY "Organizers can read their event submissions" 
    ON form_submissions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = form_submissions.event_id
            AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT)
        )
    );

CREATE POLICY "Anyone can create submissions" 
    ON form_submissions FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_forms f
            WHERE f.id = form_submissions.form_id
            AND f.is_active = true AND f.published_at IS NOT NULL
        )
    );

-- Políticas para form_submission_files (mesmas regras que submissions)
CREATE POLICY "Organizers can read submission files" 
    ON form_submission_files FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM form_submissions s
            INNER JOIN events e ON e.id = s.event_id
            WHERE s.id = form_submission_files.submission_id
            AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT)
        )
    );

CREATE POLICY "Anyone can upload files for submissions" 
    ON form_submission_files FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_submissions s
            INNER JOIN event_forms f ON f.id = s.form_id
            WHERE s.id = form_submission_files.submission_id
            AND f.is_active = true AND f.published_at IS NOT NULL
        )
    );

-- Políticas para audit logs (apenas organizadores podem ver seus logs)
CREATE POLICY "Organizers can read their event audit logs" 
    ON form_builder_audit_logs FOR SELECT 
    USING (
        event_id IS NULL OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = form_builder_audit_logs.event_id
            AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT)
        )
    );

CREATE POLICY "System can insert audit logs" 
    ON form_builder_audit_logs FOR INSERT 
    WITH CHECK (true);  -- Permite inserção via triggers e funções

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_event_forms_event_id ON event_forms(event_id);
CREATE INDEX IF NOT EXISTS idx_event_form_fields_form_id ON event_form_fields(form_id);

-- Índices para form_submissions
CREATE INDEX IF NOT EXISTS idx_submissions_form ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event ON form_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_payment ON form_submissions(payment_status);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_version ON form_submissions(form_id, form_version);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions(created_at DESC);

-- Índices para form_submission_files
CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON form_submission_files(submission_id);

-- Índices para audit logs
CREATE INDEX IF NOT EXISTS idx_audit_form ON form_builder_audit_logs(form_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON form_builder_audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON form_builder_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON form_builder_audit_logs(created_at DESC);

-- Campos de catálogo iniciais (exemplos)
INSERT INTO form_field_catalog (field_key, field_type, label_translations, validation_rules) VALUES
    ('full_name', 'text', '{"pt": "Nome Completo", "en": "Full Name"}', '{"required": true, "minLength": 2, "maxLength": 100}'),
    ('email', 'email', '{"pt": "E-mail", "en": "E-mail"}', '{"required": true}'),
    ('phone', 'phone', '{"pt": "Telefone", "en": "Phone"}', '{"required": false}'),
    ('birth_date', 'date', '{"pt": "Data de Nascimento", "en": "Birth Date"}', '{"required": true}'),
    ('gender', 'select', '{"pt": "Género", "en": "Gender"}', '{"required": true}'),
    ('country', 'country', '{"pt": "País", "en": "Country"}', '{"required": true}'),
    ('tshirt_size', 'tshirt_size', '{"pt": "Tamanho de T-shirt", "en": "T-shirt Size"}', '{"required": false}'),
    ('club', 'club', '{"pt": "Clube", "en": "Club"}', '{"required": false}'),
    ('medical_notes', 'textarea', '{"pt": "Notas Médicas", "en": "Medical Notes"}', '{"required": false, "maxLength": 500}'),
    ('gdpr_consent', 'gdpr_consent', '{"pt": "Consentimento GDPR", "en": "GDPR Consent"}', '{"required": true}')
ON CONFLICT (field_key) DO NOTHING;

-- Atualizar opções de campos específicos
UPDATE form_field_catalog 
SET options = '{"pt": ["Masculino", "Feminino", "Outro"], "en": ["Male", "Female", "Other"]}'::jsonb
WHERE field_key = 'gender';

UPDATE form_field_catalog 
SET options = '{"pt": ["XS", "S", "M", "L", "XL", "XXL"], "en": ["XS", "S", "M", "L", "XL", "XXL"]}'::jsonb
WHERE field_key = 'tshirt_size';

UPDATE form_field_catalog 
SET default_value = '{"pt": "Concordo em ceder os meus dados pessoais para fins de gestão do evento", "en": "I agree to provide my personal data for event management purposes"}'::text
WHERE field_key = 'gdpr_consent';

COMMENT ON TABLE form_field_catalog IS 'Catálogo de campos reutilizáveis para formulários de inscrição';
COMMENT ON TABLE event_forms IS 'Formulários de inscrição por evento';
COMMENT ON TABLE event_form_fields IS 'Campos configurados em cada formulário';
COMMENT ON TABLE form_submissions IS 'Submissões de formulários pelos participantes';
COMMENT ON TABLE form_submission_files IS 'Ficheiros anexados às submissões';
COMMENT ON TABLE event_form_slug_redirects IS 'Redirecionamentos de slugs antigos';
COMMENT ON TABLE event_form_version_history IS 'Histórico de versões dos formulários';
COMMENT ON TABLE form_builder_audit_logs IS 'Logs de auditoria de ações no form builder';

COMMENT ON FUNCTION generate_event_form_slug(TEXT, UUID) IS 'Gera um slug único baseado no nome do evento';
COMMENT ON FUNCTION create_form_slug_redirect() IS 'Cria redirecionamento quando o slug muda';
COMMENT ON FUNCTION log_form_builder_action(UUID, UUID, TEXT, TEXT, UUID, UUID, TEXT, JSONB, JSONB, INET) IS 'Regista ação no log de auditoria';
COMMENT ON FUNCTION validate_submission_payment(UUID, TEXT, TEXT, DECIMAL, TEXT) IS 'Valida estado de pagamento da submissão';

-- =====================================================
-- ✅ SETUP COMPLETO
-- =====================================================
-- Todas as tabelas, funções, triggers, policies e dados iniciais foram criados
-- O sistema de Form Builder está pronto para uso

SELECT '✅ Form Builder System criado com sucesso!' AS status,
       NOW() AS created_at;

