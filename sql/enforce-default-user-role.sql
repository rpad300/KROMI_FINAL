-- ==========================================
-- Garantir que registros públicos sempre criam como 'user'
-- ==========================================
-- 
-- Este script cria uma constraint/função para garantir que
-- apenas utilizadores criados por admin podem ter role diferente de 'user'
-- 
-- Versão: 1.0
-- Data: 2025-10-30
-- ==========================================

-- Função para validar role ao inserir perfil
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Se não tem created_by (registro público), forçar role = 'user'
    IF NEW.created_by IS NULL THEN
        NEW.role := 'user';
        NEW.profile_type := 'participant';
    END IF;
    
    -- Garantir que role nunca é NULL
    IF NEW.role IS NULL THEN
        NEW.role := 'user';
    END IF;
    
    -- Se role é 'user' mas profile_type é diferente, corrigir
    IF NEW.role = 'user' AND NEW.profile_type NOT IN ('participant', 'user') THEN
        NEW.profile_type := 'participant';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger antes de inserir
DROP TRIGGER IF EXISTS trigger_validate_user_role_insert ON user_profiles;
CREATE TRIGGER trigger_validate_user_role_insert
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_role();

-- Função para validar role ao atualizar perfil (apenas admin pode mudar)
CREATE OR REPLACE FUNCTION validate_role_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Se role está sendo alterado
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Verificar se foi criado por admin (created_by não é NULL)
        -- Se não foi criado por admin, não permitir mudança para admin/moderator
        IF OLD.created_by IS NULL AND NEW.role IN ('admin', 'moderator') THEN
            RAISE EXCEPTION 'Apenas administradores podem atribuir roles de admin ou moderator. Registros públicos sempre começam como user.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger antes de atualizar (comentado - vamos confiar na validação server-side)
-- DROP TRIGGER IF EXISTS trigger_validate_role_update ON user_profiles;
-- CREATE TRIGGER trigger_validate_role_update
--     BEFORE UPDATE ON user_profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_role_update();

-- Atualizar registros existentes que possam ter role NULL ou inválido
UPDATE user_profiles
SET 
    role = COALESCE(role, 'user'),
    profile_type = CASE 
        WHEN profile_type IS NULL OR profile_type NOT IN ('admin', 'event_manager', 'participant') THEN
            CASE 
                WHEN role = 'admin' THEN 'admin'
                WHEN role = 'moderator' THEN 'event_manager'
                ELSE 'participant'
            END
        ELSE profile_type
    END
WHERE role IS NULL OR role NOT IN ('admin', 'moderator', 'user');

SELECT '✅ Validação de roles aplicada!' as status;

