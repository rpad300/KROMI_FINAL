# 📱 Kromi - App Nativa Android

## 👋 Bem-vindo, Desenvolvedor!

Este documento contém **tudo** o que precisa para desenvolver a app nativa de detecção de dorsais.

---

## 🚀 COMEÇAR AQUI

### 1️⃣ **Guia Principal** (LER PRIMEIRO)

📖 **[docs/NATIVE-APP-DEVELOPER-GUIDE.md](docs/NATIVE-APP-DEVELOPER-GUIDE.md)**

Este guia contém:
- ✅ QR Code scanning (obter configuração do dispositivo)
- ✅ Validação de PIN (opcional)
- ✅ Captura de imagem da câmera
- ✅ Detecção de dorsal (OCR - opcional)
- ✅ Envio de dados para backend
- ✅ Exemplos completos de código Kotlin
- ✅ Fluxo completo da aplicação

**COMECE POR AQUI!** 👆

---

## 📸 Formato de Imagem

### 2️⃣ **Guia Rápido de Imagem**

⚡ **[docs/IMAGE-FORMAT-QUICK-GUIDE.md](docs/IMAGE-FORMAT-QUICK-GUIDE.md)**

**Resumo ultra-rápido:**

```kotlin
// ✅ CORRETO - Base64 JPEG puro (sem prefixo)
fun bitmapToBase64(bitmap: Bitmap, quality: Int): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
    return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
}

val imageDataAI = bitmapToBase64(bitmap, 70)      // 70% para AI
val imageDataDisplay = bitmapToBase64(bitmap, 90) // 90% para display

// Resultado deve começar com: "/9j/4AAQ..." (assinatura JPEG)
```

**✅ Sua app JÁ ESTÁ ENVIANDO CORRETAMENTE!** Verificamos e o formato está perfeito.

---

## 📊 Para Onde Enviar os Dados

### 3️⃣ **Destino dos Dados**

📍 **[docs/WHERE-APP-SENDS-DATA.md](docs/WHERE-APP-SENDS-DATA.md)**

A app envia para:
- **Função:** `save_device_detection()`
- **Tabela:** `device_detections`
- **Backend:** Processa automaticamente

---

## 🎯 Fluxo Completo da App

```
┌─────────────────────────────────────────────────────────┐
│ 1. ESCANEAR QR CODE                                     │
│    → Obter access_code                                  │
│    → Chamar get_device_info_by_qr(access_code)         │
│    → Receber: event_id, device_id, checkpoint, etc.    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. VALIDAR PIN (opcional)                               │
│    → Se device_pin existe                               │
│    → Pedir PIN ao usuário                               │
│    → Chamar validate_device_pin(access_code, pin)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CAPTURAR IMAGEM                                      │
│    → Abrir câmera                                        │
│    → Obter GPS (latitude, longitude, accuracy)          │
│    → Capturar Bitmap                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. PROCESSAR IMAGEM                                     │
│    → Comprimir JPEG 70% (AI)                            │
│    → Comprimir JPEG 90% (display)                       │
│    → Converter para Base64 (NO_WRAP)                    │
│    → Resultado: "/9j/4AAQ..." (base64 puro)            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. DETECTAR DORSAL (opcional)                           │
│    → Usar OCR local (ML Kit, Tesseract)                │
│    → Se detectar: dorsal_number = 123                   │
│    → Se não detectar: dorsal_number = null             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. ENVIAR PARA BACKEND                                  │
│    → Chamar save_device_detection()                     │
│    → Passar: access_code, image_data, GPS, timestamp    │
│    → Backend processa automaticamente                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Dados para Enviar

### Campos Obrigatórios ✅

```kotlin
val data = mapOf(
    // OBRIGATÓRIOS
    "access_code" to "ABC123",              // Do QR Code
    "session_id" to "unique-session-id",    // Gerar localmente
    "image_data" to imageDataAI,            // Base64 JPEG 70%
    "latitude" to 38.736946,                // GPS
    "longitude" to -9.142685,               // GPS
    "captured_at" to "2025-10-31T18:30:00Z", // Timestamp ISO 8601
    
    // OPCIONAIS
    "dorsal_number" to 123,                 // Se detectado, senão null
    "display_image" to imageDataDisplay,    // Base64 JPEG 90%
    "accuracy" to 10.5,                     // Precisão GPS em metros
    "image_metadata" to mapOf(
        "width" to 1920,
        "height" to 1080,
        "device_type" to "android"
    )
)

// Enviar via RPC
supabase.rpc("save_device_detection", data)
```

---

## 🔐 Autenticação Supabase

### Configuração

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.0")
}

// Código
val supabase = createSupabaseClient(
    supabaseUrl = "https://lgpyarllyfrgdfzcjwnb.supabase.co",
    supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncHlhcmxseWZyZ2RmemNqd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzEwNTEsImV4cCI6MjA1MjYwNzA1MX0.0E-RvXMTZbS7g0JHUacPJTwAIxvzJ-2xnmSmQcEBMkg"
) {
    install(Postgrest)
}
```

---

## 🧪 Como Testar

### 1. Verificar Formato de Imagem

```kotlin
fun testImageFormat(imageData: String) {
    // Teste 1: Deve começar com /9j/ (JPEG)
    if (imageData.startsWith("/9j/")) {
        println("✅ Formato JPEG correto!")
    } else {
        println("❌ ERRO: Não é JPEG ou tem prefixo")
    }
    
    // Teste 2: Não deve ter prefixo
    if (imageData.contains("data:image")) {
        println("❌ ERRO: Tem prefixo data:image - remover!")
    } else {
        println("✅ Base64 puro - correto!")
    }
    
    // Teste 3: Tamanho razoável
    val sizeKB = imageData.length * 3 / 4 / 1024
    println("Tamanho: ${sizeKB}KB")
    if (sizeKB in 10..50) {
        println("✅ Tamanho adequado")
    } else if (sizeKB > 100) {
        println("⚠️ Muito grande - considerar reduzir qualidade")
    } else {
        println("⚠️ Muito pequeno - qualidade pode estar baixa")
    }
}
```

### 2. Ver Imagens Enviadas

Aceder a: `http://localhost:1144/src/view-device-detection-image.html`

Esta página mostra todas as imagens enviadas pela app com:
- Visualização da imagem
- Todos os metadados (GPS, timestamp, status)
- Navegação entre registros

---

## 📚 Documentação Completa

### Índice de Todos os Documentos

📑 **[docs/NATIVE-APP-INDEX.md](docs/NATIVE-APP-INDEX.md)**

Contém links organizados para:
- Guias por tópico
- Busca por caso de uso
- Troubleshooting
- Scripts de teste

---

## ✅ Checklist de Desenvolvimento

### Fase 1: Setup Inicial
- [ ] Configurar Supabase SDK
- [ ] Testar conexão com backend
- [ ] Implementar permissões (câmera, GPS)

### Fase 2: QR Code
- [ ] Implementar scanner QR Code
- [ ] Chamar `get_device_info_by_qr()`
- [ ] Armazenar configuração do dispositivo

### Fase 3: Câmera e GPS
- [ ] Implementar captura de imagem (CameraX)
- [ ] Implementar obtenção de GPS
- [ ] Testar qualidade e tamanho das imagens

### Fase 4: Processamento
- [ ] Implementar compressão JPEG (70% e 90%)
- [ ] Implementar conversão Base64 (NO_WRAP)
- [ ] Validar formato (começa com `/9j/`)

### Fase 5: OCR (Opcional)
- [ ] Integrar ML Kit ou Tesseract
- [ ] Detectar dorsais na imagem
- [ ] Validar números detectados

### Fase 6: Envio de Dados
- [ ] Implementar chamada `save_device_detection()`
- [ ] Enviar todos os campos obrigatórios
- [ ] Tratar erros e retry

### Fase 7: Testes
- [ ] Testar com QR Code real
- [ ] Verificar imagens na página de visualização
- [ ] Testar detecção de dorsais
- [ ] Validar GPS em tempo real

---

## 🆘 Troubleshooting

### "Access code inválido"
→ Verificar QR Code escaneado  
→ Confirmar que dispositivo está em `event_devices`

### "Imagem não aparece no backend"
→ Verificar formato (deve começar com `/9j/`)  
→ Usar `Base64.NO_WRAP` (não `DEFAULT`)  
→ Ver **[docs/IMAGE-FORMAT-QUICK-GUIDE.md](docs/IMAGE-FORMAT-QUICK-GUIDE.md)**

### "Erro de GPS"
→ GPS é obrigatório  
→ Pedir permissão `ACCESS_FINE_LOCATION`  
→ Enviar mesmo que accuracy seja baixa

### "Erro de UUID"
→ Já corrigido no backend  
→ Reiniciar servidor se persistir

---

## 📞 Contato e Suporte

- **Documentação Principal:** `docs/NATIVE-APP-DEVELOPER-GUIDE.md`
- **Formato de Imagem:** `docs/IMAGE-FORMAT-QUICK-GUIDE.md`
- **Índice Completo:** `docs/NATIVE-APP-INDEX.md`

---

## 🎉 Nota Final

**Parabéns!** O formato de imagem que está a enviar **JÁ ESTÁ CORRETO**. Verificámos e tudo está perfeito:

- ✅ Base64 puro (sem prefixo `data:image`)
- ✅ JPEG comprimido
- ✅ Começa com `/9j/` (assinatura JPEG)
- ✅ Tamanho adequado (~19KB)

Continue assim! 🚀

---

**Boa sorte com o desenvolvimento!** 💪

Se tiver dúvidas, consulte a documentação detalhada nos links acima.

