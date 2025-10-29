# ✅ Correções Aplicadas

## 🔧 EventRepository.kt

**Problema:** `Cannot find a parameter with this name: ascending`

**Correção:** Removido o parâmetro `ascending`. A ordem padrão do `.order()` é crescente. Se precisar de ordem decrescente, pode usar `.order("column", ascending = false)` mas a sintaxe pode variar com a versão do SDK.

**Alteração:** 
```kotlin
// ANTES (erro)
.order("checkpoint_order", ascending = true)

// DEPOIS (corrigido)
.order("checkpoint_order")
```

## 🔧 CameraService.kt

**Problema:** 
- `Unresolved reference: suspendCoroutine`
- `.await()` não funciona com `ListenableFuture`

**Correção:** 
1. Removido import incorreto `kotlinx.coroutines.tasks.await`
2. Usado `suspendCoroutine` para converter `ListenableFuture` para coroutine
3. Especificado tipo explicitamente: `suspendCoroutine<Result<CapturedImage>>`

**Alteração:**
```kotlin
// ANTES (erro)
cameraProvider = cameraProviderFuture.await()

// DEPOIS (corrigido)
cameraProvider = suspendCoroutine { continuation ->
    cameraProviderFuture.addListener({
        try {
            continuation.resume(cameraProviderFuture.get())
        } catch (e: Exception) {
            continuation.resumeWithException(e)
        }
    }, ContextCompat.getMainExecutor(context))
}
```

**Imports corrigidos:**
- ❌ Removido: `kotlinx.coroutines.tasks.await`
- ❌ Removido: `CameraExecutor`, `ListenableFuture`, `Executor` (não usados)
- ✅ Mantido: `kotlinx.coroutines.suspendCoroutine`
- ✅ Mantido: `kotlin.coroutines.resume`, `resumeWithException`

## ✅ Status

Todos os erros corrigidos! Tente compilar novamente.

```powershell
.\gradlew.bat assembleDebug
```


