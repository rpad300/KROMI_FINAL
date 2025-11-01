# 📸 Especificações de Formato de Imagem - App Nativa

## ✅ Formato CORRETO Atual

A app nativa **JÁ ESTÁ A ENVIAR NO FORMATO CORRETO**. Este documento documenta o formato esperado.

---

## 🎯 Como a Versão Web Processa

### Código da Versão Web (detection-kromi.html)

```javascript
// 1. Capturar imagem da câmera
const video = document.getElementById('cameraVideo');
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

// 2. Converter para Base64 JPEG
const aiVersion = canvas.toDataURL('image/jpeg', 0.7);      // 70% qualidade para AI
const displayVersion = canvas.toDataURL('image/jpeg', 0.9); // 90% qualidade para display

// 3. IMPORTANTE: toDataURL retorna formato: "data:image/jpeg;base64,/9j/4AAQ..."
// Mas o backend espera apenas a parte Base64 (SEM prefixo)

// 4. Remover prefixo antes de enviar
const aiVersionClean = aiVersion.replace(/^data:image\/\w+;base64,/, '');
const displayVersionClean = displayVersion.replace(/^data:image\/\w+;base64,/, '');

// 5. Enviar para Supabase
const bufferEntry = {
    event_id: currentEvent.id,
    device_id: currentDevice,
    session_id: sessionId,
    image_data: aiVersionClean,       // Base64 puro (SEM prefixo)
    display_image: displayVersionClean, // Base64 puro (SEM prefixo)
    image_metadata: {
        width: canvas.width,
        height: canvas.height,
        device_type: 'mobile',
        timestamp: now.toISOString(),
        gps_updated: true
    },
    captured_at: now.toISOString(),
    latitude: currentPosition?.latitude || null,
    longitude: currentPosition?.longitude || null,
    accuracy: currentPosition?.accuracy || null,
    status: 'pending'
};
```

---

## 📱 Especificações para App Android

### ✅ Formato Esperado

```
FORMATO: Base64 puro (SEM prefixo "data:image/jpeg;base64,")
TIPO: JPEG
INÍCIO: /9j/4AAQ... (assinatura JPEG em base64)
```

### ✅ Exemplo de Código Kotlin (CORRETO)

```kotlin
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import java.io.ByteArrayOutputStream

// 1. Capturar imagem da câmera
val bitmap: Bitmap = // ... obter da câmera

// 2. Comprimir para JPEG (duas versões)
fun bitmapToBase64(bitmap: Bitmap, quality: Int): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
    val byteArray = outputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP) // NO_WRAP = sem quebras de linha
}

// Versão para AI (70% qualidade)
val imageDataAI = bitmapToBase64(bitmap, 70)

// Versão para Display (90% qualidade)
val imageDataDisplay = bitmapToBase64(bitmap, 90)

// 3. ✅ CORRETO: Base64 puro, começa com /9j/
println("imageDataAI: ${imageDataAI.substring(0, 20)}") // Deve imprimir: /9j/4AAQSkZJRgABAQAA

// 4. Enviar para backend
val data = mapOf(
    "access_code" to accessCode,
    "session_id" to sessionId,
    "dorsal_number" to dorsalNumber, // null se não detectado
    "image_data" to imageDataAI,      // Base64 puro (70% qualidade)
    "display_image" to imageDataDisplay, // Base64 puro (90% qualidade)
    "image_metadata" to mapOf(
        "width" to bitmap.width,
        "height" to bitmap.height,
        "device_type" to "android",
        "timestamp" to System.currentTimeMillis()
    ),
    "latitude" to latitude,
    "longitude" to longitude,
    "accuracy" to accuracy,
    "captured_at" to ISO8601Timestamp() // Formato: "2025-01-27T18:30:45.123Z"
)

// Chamar RPC save_device_detection
supabase.rpc("save_device_detection", data)
```

---

## ❌ Formatos INCORRETOS (NÃO USAR)

### ❌ ERRADO 1: Com prefixo data:image

```kotlin
// ❌ NÃO FAZER ISTO
val wrong = "data:image/jpeg;base64,/9j/4AAQ..."
```

### ❌ ERRADO 2: Com quebras de linha

```kotlin
// ❌ NÃO FAZER ISTO
val wrong = Base64.encodeToString(byteArray, Base64.DEFAULT) // Tem quebras de linha
```

### ❌ ERRADO 3: PNG em vez de JPEG

```kotlin
// ❌ NÃO FAZER ISTO
bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream) // Muito pesado
```

---

## 🔍 Como Verificar se Está Correto

### Teste 1: Verificar início da string

```kotlin
// ✅ CORRETO: Deve começar com /9j/
if (imageDataAI.startsWith("/9j/")) {
    println("✅ Formato JPEG Base64 correto!")
} else {
    println("❌ Formato incorreto! Deve começar com /9j/")
}
```

### Teste 2: Verificar tamanho

```kotlin
// ✅ Tamanho esperado: ~15-30KB (dependendo da resolução)
val sizeKB = imageDataAI.length * 3 / 4 / 1024 // Base64 para bytes para KB
println("Tamanho da imagem: ${sizeKB}KB")

// Se > 100KB: qualidade muito alta ou resolução muito grande
// Se < 5KB: qualidade muito baixa ou imagem muito pequena
```

### Teste 3: Verificar sem prefixo

```kotlin
// ✅ NÃO deve conter prefixo
if (imageDataAI.contains("data:image")) {
    println("❌ ERRO: Contém prefixo data:image! Remover antes de enviar.")
} else {
    println("✅ Sem prefixo - correto!")
}
```

---

## 📊 Parâmetros de Qualidade

| Versão | Campo | Qualidade JPEG | Uso |
|--------|-------|----------------|-----|
| AI | `image_data` | 70% | Processamento OCR/AI (menor tamanho) |
| Display | `display_image` | 90% | Exibição no frontend (melhor qualidade) |

---

## 🎯 Resumo para o Desenvolvedor

### O que FAZER ✅

1. **Capturar** imagem da câmera como Bitmap
2. **Comprimir** para JPEG com qualidade 70% (AI) e 90% (display)
3. **Converter** para Base64 usando `Base64.NO_WRAP`
4. **Verificar** que começa com `/9j/` (assinatura JPEG)
5. **Enviar** Base64 puro (SEM prefixo `data:image`)

### O que NÃO FAZER ❌

1. ❌ Não adicionar prefixo `data:image/jpeg;base64,`
2. ❌ Não usar `Base64.DEFAULT` (tem quebras de linha)
3. ❌ Não usar PNG (muito pesado)
4. ❌ Não comprimir com qualidade 100% (desnecessário e grande)
5. ❌ Não enviar sem GPS/timestamp

---

## 🔗 Exemplo Completo Kotlin

```kotlin
// Função helper completa
fun processImageForBackend(bitmap: Bitmap): Map<String, Any?> {
    // Comprimir versões
    val imageDataAI = bitmapToBase64(bitmap, 70)
    val imageDataDisplay = bitmapToBase64(bitmap, 90)
    
    // Verificar formato
    require(imageDataAI.startsWith("/9j/")) {
        "Formato de imagem incorreto! Deve começar com /9j/"
    }
    
    // Obter GPS atual
    val location = getLastKnownLocation() // Implementar
    
    // Retornar dados prontos para envio
    return mapOf(
        "access_code" to getAccessCode(),
        "session_id" to getSessionId(),
        "dorsal_number" to detectDorsal(bitmap), // null se não detectado
        "image_data" to imageDataAI,
        "display_image" to imageDataDisplay,
        "image_metadata" to mapOf(
            "width" to bitmap.width,
            "height" to bitmap.height,
            "device_type" to "android"
        ),
        "latitude" to location?.latitude,
        "longitude" to location?.longitude,
        "accuracy" to location?.accuracy,
        "captured_at" to getCurrentTimestampISO8601()
    )
}

// Helper para Base64
fun bitmapToBase64(bitmap: Bitmap, quality: Int): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
    val byteArray = outputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP)
}

// Helper para timestamp ISO 8601
fun getCurrentTimestampISO8601(): String {
    return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date())
}
```

---

## ✅ Confirmação

**A app nativa JÁ ESTÁ A ENVIAR NO FORMATO CORRETO:**
- ✅ Base64 puro (sem prefixo)
- ✅ JPEG comprimido
- ✅ Começa com `/9j/`
- ✅ Tamanho adequado (~19KB)

**Nenhuma alteração necessária no código de imagem da app!**

