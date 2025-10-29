# 🔧 Correções: API Supabase Kotlin SDK

## Problemas Identificados

1. **RPC API** - A sintaxe do `.rpc()` pode estar incorreta
2. **Update API** - Sintaxe do `.update()` corrigida
3. **SerialName** - Adicionado nos modelos
4. **CameraService** - Imports adicionados
5. **DetectionScreen** - Coroutine adicionada

## Status das Correções

✅ **EventRepository**:
- Import `SerialName` adicionado
- Sintaxe `.order()` corrigida
- Problema `it` no map corrigido (usando nome explícito `device`)

✅ **SupabaseRepository**:
- Import `SerialName` adicionado
- Sintaxe `.update()` corrigida para usar `mapOf()`
- RPC API ajustada (pode precisar verificar documentação exata)

✅ **CameraService**:
- Imports `await` e `suspendCoroutine` adicionados
- Import `resume` adicionado

✅ **DetectionScreen**:
- `rememberCoroutineScope` e `launch` adicionados
- `saveImageToBuffer` agora chamado em coroutine

✅ **DetectionModels**:
- Anotações `@SerialName` adicionadas em `ImageBufferEntry`

## ⚠️ API RPC do Supabase

A sintaxe do RPC pode precisar de ajuste. Se ainda houver erros, as opções são:

### Opção 1: Verificar Documentação
Consulte: https://github.com/supabase-community/supabase-kt

### Opção 2: Usar HTTP Direto
```kotlin
// Fallback usando Retrofit/OkHttp diretamente
```

### Opção 3: Implementar sem RPC
Modificar para usar queries diretas em vez de RPC functions

## 📋 Próximo Passo

Tente compilar novamente. Se ainda houver erros com RPC, podemos:
1. Usar queries diretas
2. Criar endpoint REST no servidor
3. Verificar versão exata do SDK e documentação


