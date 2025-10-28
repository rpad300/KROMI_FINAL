-- ==========================================
-- Corrigir políticas RLS para email_templates
-- ==========================================
-- Este script permite que admins vejam e editem templates
-- ==========================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "email_templates_policy" ON email_templates;
DROP POLICY IF EXISTS "email_templates_admin_policy" ON email_templates;

-- Nova política simplificada: permitir tudo temporariamente para debug
CREATE POLICY "email_templates_admin_policy" ON email_templates
    FOR ALL USING (true) WITH CHECK (true);

-- Verificação
SELECT 
    '✅ Políticas RLS atualizadas!' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'email_templates';

