# Correção: Erro de Recursão Infinita nas Políticas RLS

## Problema Identificado
Erro: `infinite recursion detected in policy for relation "user_profiles"`

**Causa**: As políticas RLS estão fazendo referência à própria tabela `user_profiles`, causando recursão infinita.

## Soluções Disponíveis

### Solução 1: Correção das Políticas (Recomendada)
**Arquivo**: "`../sql/fix-rls-recursion.sql"
- Remove políticas problemáticas
- Cria políticas corrigidas sem recursão
- Mantém segurança RLS

### Solução 2: Políticas Simples
**Arquivo**: "`../sql/fix-rls-simple.sql"
- Usa função auxiliar `is_admin()`
- Políticas mais simples
- Evita recursão com função SECURITY DEFINER

### Solução 3: Desabilitar RLS (Solução Imediata)
**Arquivo**: "`../sql/disable-rls-immediate.sql"
- Desabilita RLS completamente
- Resolve o problema imediatamente
- Menos seguro, mas funcional

## Como Aplicar

### Para Solução Imediata (Recomendado para teste):
1. Executar "`../sql/disable-rls-immediate.sql" no Supabase
2. Testar login novamente
3. Se funcionar, pode implementar soluções mais seguras depois

### Para Solução Corrigida:
1. Executar "`../sql/fix-rls-recursion.sql" no Supabase
2. Verificar se não há erros
3. Testar login

### Para Solução com Função Auxiliar:
1. Executar "`../sql/fix-rls-simple.sql" no Supabase
2. Verificar se função `is_admin()` foi criada
3. Testar login

## Verificação de Sucesso

### No Console do Browser:
```
✅ Supabase conectado
Sistema de autenticação conectado ao SupabaseClient existente
Sistema de autenticação inicializado
Estado de autenticação mudou: SIGNED_IN
```

### Sem Erros:
- Não deve aparecer erro 500
- Não deve aparecer "infinite recursion"
- Login deve funcionar normalmente

## Credenciais de Teste
- **Email**: `Rdias300@gmail.com`
- **Password**: `1234876509`

## Próximos Passos Após Correção

1. **Testar Login**: Verificar se funciona sem erros
2. **Testar Perfis**: Verificar se carrega perfil do utilizador
3. **Testar Permissões**: Verificar se redireciona corretamente
4. **Implementar RLS Seguro**: Se necessário, implementar políticas mais seguras

## Troubleshooting

### Se continuar com erro:
1. Verificar se script foi executado completamente
2. Verificar se não há políticas restantes
3. Tentar solução mais simples (desabilitar RLS)

### Se login funcionar mas sem perfil:
1. Verificar se utilizador foi criado na tabela `user_profiles`
2. Executar script de criação do administrador novamente
3. Verificar se email está correto

## Arquivos Criados
- "`../sql/fix-rls-recursion.sql" - Correção das políticas
- "`../sql/fix-rls-simple.sql" - Políticas com função auxiliar
- "`../sql/disable-rls-immediate.sql" - Desabilitar RLS (solução imediata)


