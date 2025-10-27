-- Verificar se a função end_device_session existe
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'end_device_session';


