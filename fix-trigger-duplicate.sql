-- Script alternativo para corrigir trigger duplicado
-- Execute este script se ainda tiver problemas com o trigger

-- Remover trigger existente se existir
DROP TRIGGER IF EXISTS tr_update_classifications ON classifications;

-- Recriar trigger
CREATE TRIGGER tr_update_classifications
    AFTER INSERT OR UPDATE ON classifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_classifications();

-- Verificar se foi criado corretamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'tr_update_classifications';
