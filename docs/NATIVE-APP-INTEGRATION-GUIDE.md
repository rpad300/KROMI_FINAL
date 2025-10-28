# Guia de Integração: App Nativa de Leitura de Dorsais

## Objetivo

Este documento especifica onde a aplicação nativa deve **LER** informações do evento e para onde deve **ENVIAR** as leituras de dorsais capturadas.

## Fluxo Visual Resumido

```
┌─────────────────────────────────────────────────────────────────┐
│                    APP NATIVA - FLUXO COMPLETO                  │
└─────────────────────────────────────────────────────────────────┘

1️⃣ AUTENTICAÇÃO
   ┌──────────────────────────┐
   │ GET /rest/v1/events      │  ← Buscar evento activo
   │ ?status=eq.active        │
   └──────────────────────────┘
              ↓
   ┌──────────────────────────┐
   │ Utilizador insere PIN    │  ← Input 4-6 dígitos
   └──────────────────────────┘
              ↓
   ┌──────────────────────────────────────────────────┐
   │ GET /rest/v1/event_devices                       │
   │ ?event_id=eq.[UUID]&device_pin=eq.[PIN]          │
   └──────────────────────────────────────────────────┘
              ↓
   📦 Guardar: event_id, device_id, checkpoint_name, checkpoint_order

2️⃣ CAPTURA (Escolher uma opção)

   OPÇÃO A: Buffer (servidor processa)
   ┌────────────────────────┐
   │ Capturar foto          │
   │ Converter Base64       │
   │ Adicionar GPS          │
   └────────────────────────┘
              ↓
   ┌────────────────────────────────────┐
   │ POST /rest/v1/image_buffer         │
   │ {                                  │
   │   event_id, device_id,             │
   │   image_data, captured_at          │
   │ }                                  │
   └────────────────────────────────────┘

   OPÇÃO B: Directo (app processa OCR)
   ┌────────────────────────┐
   │ Capturar foto          │
   │ OCR local → número     │
   │ Adicionar GPS          │
   └────────────────────────┘
              ↓
   ┌────────────────────────────────────┐
   │ POST /rest/v1/detections           │
   │ {                                  │
   │   event_id, number, timestamp,     │
   │   device_order ← OBRIGATÓRIO       │
   │ }                                  │
   └────────────────────────────────────┘

3️⃣ RESULTADO
   ✅ Dorsal registado no checkpoint
   📊 Dados prontos para classificação
```

---

## 1. Autenticação e URL Base

### URL da API Supabase
```
URL: https://[SEU-PROJECT].supabase.co
API Key: [SUPABASE_ANON_KEY]
```

### Headers Obrigatórios
Todas as requisições HTTP devem incluir:
- `apikey: [SUPABASE_ANON_KEY]`
- `Authorization: Bearer [SUPABASE_ANON_KEY]`
- `Content-Type: application/json`
- `Prefer: return=representation` (para receber dados inseridos)

---

## 2. AUTENTICAÇÃO: Evento + PIN para Identificar Checkpoint

### 2.1. Fluxo de Autenticação

A app nativa deve autenticar-se identificando:
1. **Evento** (qual competição)
2. **Checkpoint/Ponto** (qual local de leitura, identificado por PIN)

**Sequência:**
```
1. App pede ID do Evento (ou busca evento activo)
2. App pede PIN ao utilizador (4-6 dígitos)
3. App valida Evento + PIN contra servidor
4. Servidor retorna dados do checkpoint associado
5. App usa event_id + checkpoint para todas as leituras
```

### 2.2. Validar PIN e Obter Checkpoint

**Endpoint REST:**
```
GET /rest/v1/event_devices?event_id=eq.[UUID]&device_pin=eq.[PIN]&select=*
```

**Exemplo:**
```
GET /rest/v1/event_devices?event_id=eq.a1b2c3d4-e5f6-7890-abcd-ef1234567890&device_pin=eq.1234&select=*
```

**Resposta de Sucesso (PIN Correto):**
```json
[
  {
    "id": "event-device-uuid",
    "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "device_id": "device-uuid",
    "device_pin": "1234",
    "checkpoint_name": "Km 10",
    "checkpoint_order": 2,
    "checkpoint_type": "intermediate",
    "role": "detector",
    "max_sessions": 1,
    "active_sessions": 0,
    "assigned_at": "2025-10-20T10:00:00Z",
    "assigned_by": "admin-user-id"
  }
]
```

**Resposta de Erro (PIN Errado):**
```json
[]
```

Se o array estiver vazio, o PIN está errado ou não existe configuração para esse evento.

### 2.3. Dados Obtidos na Autenticação

Após validação bem-sucedida, **guardar em memória**:

| Campo | Uso |
|-------|-----|
| `event_id` | Identificador do evento (usar em todas as leituras) |
| `device_id` | Identificador do dispositivo registado |
| `checkpoint_name` | Nome do ponto (ex: "Km 10", "Meta") - **mostrar ao utilizador** |
| `checkpoint_order` | Ordem sequencial (1, 2, 3...) - **enviar nas leituras** |
| `checkpoint_type` | Tipo: `start`, `finish`, `intermediate`, `timing`, `control`, `aid_station` |
| `role` | Papel do dispositivo: `detector`, `supervisor`, `admin` |
| `max_sessions` | Máximo de sessões simultâneas permitidas neste checkpoint |

### 2.4. Interface de Autenticação

**Ecrã 1 - Selecção de Evento:**
```
┌──────────────────────────────┐
│   Selecionar Evento          │
├──────────────────────────────┤
│                              │
│  [Buscar Evento Activo]      │
│                              │
│  ou                          │
│                              │
│  ID do Evento:               │
│  ┌────────────────────────┐  │
│  │ ______________________ │  │
│  └────────────────────────┘  │
│                              │
│  [Continuar]                 │
│                              │
└──────────────────────────────┘
```

**Ecrã 2 - Inserir PIN:**
```
┌──────────────────────────────┐
│   Maratona de Lisboa 2025    │
├──────────────────────────────┤
│                              │
│  Insira o PIN do Checkpoint: │
│                              │
│  ┌─────┬─────┬─────┬─────┐  │
│  │  1  │  2  │  3  │  4  │  │
│  └─────┴─────┴─────┴─────┘  │
│                              │
│  [Validar]                   │
│                              │
└──────────────────────────────┘
```

**Ecrã 3 - Confirmação:**
```
┌──────────────────────────────┐
│   ✅ Autenticado             │
├──────────────────────────────┤
│                              │
│  Evento: Maratona Lisboa     │
│  Checkpoint: Km 10           │
│  Ordem: 2                    │
│  Tipo: Intermédio            │
│                              │
│  [Iniciar Captura]           │
│                              │
└──────────────────────────────┘
```

### 2.5. Tratamento de Erros de Autenticação

| Situação | Mensagem ao Utilizador | Acção |
|----------|------------------------|-------|
| PIN errado | "PIN inválido. Verifique e tente novamente." | Permitir nova tentativa |
| Evento não activo | "Evento não está activo. Contacte o organizador." | Voltar à selecção de evento |
| Sem internet | "Sem ligação. Verifique a internet." | Retry automático |
| Evento não existe | "Evento não encontrado. Verifique o ID." | Voltar à selecção de evento |
| Max sessões atingido | "Limite de dispositivos atingido neste checkpoint." | Contactar administrador |

---

## 3. ONDE LER: Informação do Evento

### 3.1. Obter Evento Ativo

**Endpoint REST:**
```
GET /rest/v1/events?status=eq.active&select=*
```

**Resposta Esperada:**
```json
[
  {
    "id": "uuid-do-evento",
    "name": "Nome do Evento",
    "description": "Descrição do evento",
    "event_date": "2025-10-28",
    "location": "Local do evento",
    "status": "active",
    "created_by": "user-id",
    "settings": {},
    "event_started_at": "2025-10-28T09:00:00Z",
    "event_ended_at": null,
    "is_active": true,
    "device_sequence": [],
    "scheduled_start_time": "2025-10-28T09:00:00Z",
    "auto_start_enabled": true,
    "created_at": "2025-10-20T10:00:00Z",
    "updated_at": "2025-10-28T08:55:00Z"
  }
]
```

### 3.2. Campos Importantes do Evento

| Campo | Tipo | Descrição | Uso na App |
|-------|------|-----------|------------|
| `id` | UUID | Identificador único do evento | **OBRIGATÓRIO**: Enviar em todas as leituras |
| `name` | Texto | Nome do evento | Mostrar no interface da app |
| `status` | Texto | Estado: `active`, `paused`, `completed`, `cancelled` | Apenas aceitar leituras se `active` |
| `event_started_at` | Timestamp UTC | Momento exacto de início do evento | Calcular tempos de passagem |
| `is_active` | Boolean | Se evento está activo | Validar antes de capturar |
| `event_date` | Data | Data do evento | Informação contextual |
| `location` | Texto | Local do evento | Informação contextual |
| `settings` | JSON | Configurações específicas | Parâmetros de detecção (ver secção 3.3) |

### 3.3. Configurações no Campo `settings` (JSON)

O campo `settings` pode conter:

```json
{
  "detection_confidence_threshold": 0.7,
  "duplicate_window_seconds": 5,
  "gps_required": true,
  "auto_process": true,
  "image_quality": "medium",
  "batch_size": 5
}
```

| Parâmetro | Descrição | Valor Padrão |
|-----------|-----------|--------------|
| `detection_confidence_threshold` | Confiança mínima para aceitar leitura (0.0 a 1.0) | 0.7 |
| `duplicate_window_seconds` | Janela temporal para detecção de duplicados | 5 |
| `gps_required` | Se GPS é obrigatório | true |
| `auto_process` | Processar automaticamente ou enviar para buffer | true |
| `image_quality` | Qualidade da imagem: `low`, `medium`, `high` | medium |
| `batch_size` | Número de imagens por lote para processamento | 5 |

### 3.4. Validações Antes de Capturar

A app deve verificar:
1. `status == "active"` → Se não, mostrar erro "Evento não está activo"
2. `is_active == true` → Se não, mostrar erro "Evento pausado"
3. `event_started_at` não é nulo → Se nulo, evento ainda não iniciou
4. Timestamp actual está entre `event_started_at` e `event_ended_at` (se existir)

---

## 4. PARA ONDE ENVIAR: Leituras de Dorsais

Existem **2 destinos possíveis** dependendo do modo de funcionamento:

### Opção A: Buffer de Processamento (RECOMENDADO)
### Opção B: Leitura Directa

---

## 4.1. OPÇÃO A: Enviar para Buffer de Processamento

**Quando usar:** Quando a app captura imagens e o servidor faz o processamento OCR/IA.

### Endpoint REST:
```
POST /rest/v1/image_buffer
```

### Campos Obrigatórios

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `event_id` | UUID | ID do evento activo (obtido na autenticação) | ✅ Sim |
| `device_id` | UUID | ID do dispositivo (obtido na autenticação PIN) | ✅ Sim |
| `session_id` | Texto | ID único da sessão de captura | ✅ Sim |
| `image_data` | Texto | Imagem em Base64 (versão optimizada para IA) | ✅ Sim |
| `captured_at` | Timestamp UTC | Momento exacto da captura | ✅ Sim |

### Campos Opcionais Recomendados

| Campo | Tipo | Descrição | Enviar Se |
|-------|------|-----------|-----------|
| `display_image` | Texto | Imagem em Base64 (versão legível) | Quer guardar imagem de visualização |
| `latitude` | Decimal | Coordenada GPS (8 casas decimais) | GPS disponível |
| `longitude` | Decimal | Coordenada GPS (8 casas decimais) | GPS disponível |
| `accuracy` | Decimal | Precisão GPS em metros | GPS disponível |
| `image_metadata` | JSON | Metadados da captura | Informação adicional disponível |

### Campos de Sistema (Não Enviar)

Estes campos são geridos automaticamente pelo servidor:
- `id` → Gerado automaticamente
- `status` → Começa como `pending`
- `processed_at`, `processed_by`, `detection_results`, `processing_method`, `processing_time_ms` → Preenchidos após processamento
- `expires_at` → Definido automaticamente (7 dias)
- `created_at` → Timestamp de inserção

### Exemplo de Payload

```json
{
  "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_id": "device-uuid-obtido-na-autenticacao",
  "session_id": "device-abc-session-20251028-001",
  "image_data": "iVBORw0KGgoAAAANSUhEUgAA...(base64 truncado)",
  "display_image": "iVBORw0KGgoAAAANSUhEUgAA...(base64 opcional)",
  "captured_at": "2025-10-28T10:15:30.123Z",
  "latitude": 38.7223,
  "longitude": -9.1393,
  "accuracy": 5.2,
  "image_metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg",
    "compression": 80,
    "device_model": "iPhone 14",
    "camera": "rear",
    "checkpoint_name": "Km 10",
    "checkpoint_order": 2
  }
}
```

### Formato da Imagem Base64

**image_data (para IA):**
- Resolução: 800x600 px ou menor
- Formato: JPEG
- Qualidade: 70-80%
- Tamanho: < 200 KB
- Encoding: `data:image/jpeg;base64,[base64_string]` OU apenas `[base64_string]`

**display_image (para visualização):**
- Resolução: 1920x1080 px ou original
- Formato: JPEG
- Qualidade: 85-95%
- Tamanho: < 500 KB
- Encoding: `data:image/jpeg;base64,[base64_string]` OU apenas `[base64_string]`

### Resposta de Sucesso

```json
{
  "id": "buffer-uuid-gerado",
  "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "captured_at": "2025-10-28T10:15:30.123Z",
  "created_at": "2025-10-28T10:15:31.456Z"
}
```

### Estados do Buffer

| Estado | Significado | Próximo Passo |
|--------|-------------|---------------|
| `pending` | Aguarda processamento | Será processada automaticamente |
| `processing` | Em processamento | Aguardar resultado |
| `processed` | Processada com sucesso | Leituras criadas em `detections` |
| `discarded` | Descartada (sem dorsais detectados) | Nenhuma acção |

---

## 4.2. OPÇÃO B: Enviar Leitura Directa

**Quando usar:** Quando a app já faz OCR/detecção localmente e envia apenas o número do dorsal.

### Endpoint REST:
```
POST /rest/v1/detections
```

### Campos Obrigatórios

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `event_id` | UUID | ID do evento activo (obtido na autenticação) | ✅ Sim |
| `number` | Inteiro | Número do dorsal detectado | ✅ Sim |
| `timestamp` | Timestamp UTC | Momento da detecção | ✅ Sim |
| `session_id` | Texto | ID da sessão de captura | ✅ Sim |
| `device_order` | Inteiro | Ordem do checkpoint (obtido na autenticação) | ✅ Sim |

### Campos Opcionais Recomendados

| Campo | Tipo | Descrição | Enviar Se |
|-------|------|-----------|-----------|
| `latitude` | Decimal | Coordenada GPS | GPS disponível |
| `longitude` | Decimal | Coordenada GPS | GPS disponível |
| `accuracy` | Decimal | Precisão GPS em metros | GPS disponível |
| `device_type` | Texto | Tipo: `mobile`, `tablet`, `desktop` | Conhecido |
| `proof_image` | Texto | Imagem Base64 que originou detecção | Quer guardar prova |
| `dorsal_region` | JSON | Coordenadas do dorsal na imagem | OCR retornou bounding box |
| `checkpoint_time` | Timestamp UTC | Mesmo valor que `timestamp` (compatibilidade) | Sempre |

### Campos de Sistema (Não Enviar)
- `id` → Gerado automaticamente
- `created_at` → Timestamp de inserção
- `split_time`, `total_time` → Calculados pelo servidor
- `is_penalty`, `penalty_reason` → Geridos pelo sistema

### Exemplo de Payload

```json
{
  "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "number": 1234,
  "timestamp": "2025-10-28T10:15:30.123Z",
  "session_id": "device-abc-session-20251028-001",
  "device_order": 2,
  "checkpoint_time": "2025-10-28T10:15:30.123Z",
  "latitude": 38.7223,
  "longitude": -9.1393,
  "accuracy": 5.2,
  "device_type": "mobile",
  "proof_image": "iVBORw0KGgoAAAANSUhEUgAA...(base64 opcional)",
  "dorsal_region": {
    "x": 450,
    "y": 320,
    "width": 120,
    "height": 80,
    "confidence": 0.95
  }
}
```

### Formato do Campo `dorsal_region`

```json
{
  "x": 450,           // Coordenada X do canto superior esquerdo
  "y": 320,           // Coordenada Y do canto superior esquerdo  
  "width": 120,       // Largura da região em pixels
  "height": 80,       // Altura da região em pixels
  "confidence": 0.95  // Confiança da detecção (0.0 a 1.0)
}
```

### Resposta de Sucesso

```json
{
  "id": "detection-uuid-gerado",
  "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "number": 1234,
  "timestamp": "2025-10-28T10:15:30.123Z",
  "created_at": "2025-10-28T10:15:31.456Z"
}
```

---

## 5. Registar Dispositivo (Opcional mas Recomendado)

Se quiser rastrear dispositivos específicos, primeiro registar o dispositivo:

### Endpoint:
```
POST /rest/v1/devices
```

### Payload:
```json
{
  "device_name": "iPhone-14-Dispositivo-001",
  "device_type": "mobile",
  "user_agent": "VisionKrono Native iOS/1.0",
  "last_seen": "2025-10-28T10:00:00Z",
  "status": "active"
}
```

### Resposta:
```json
{
  "id": "device-uuid-gerado",
  "device_name": "iPhone-14-Dispositivo-001",
  "status": "active"
}
```

**Guardar o `id` retornado** e usar como `device_id` nas inserções no buffer.

### Associar Dispositivo ao Evento:

```
POST /rest/v1/event_devices
```

```json
{
  "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_id": "device-uuid-obtido",
  "role": "detector"
}
```

**Roles possíveis:**
- `detector` → Dispositivo de captura de imagens/dorsais
- `supervisor` → Dispositivo de supervisão/validação
- `admin` → Dispositivo de administração

---

## 6. Geração de `session_id`

O `session_id` identifica uma sessão de captura única.

### Formato Recomendado:
```
[device-identifier]-[timestamp]-[random]
```

### Exemplos:
```
iphone14pro-20251028-100530-abc123
android-pixel7-20251028-095215-xyz789
tablet-ipad-20251028-110045-def456
```

### Regras:
- **Único por sessão**: Gerar novo ID ao iniciar app ou ao trocar de evento
- **Persistente durante sessão**: Manter o mesmo ID enquanto app estiver activa
- **Máximo 255 caracteres**
- **Sem espaços ou caracteres especiais** (usar apenas: a-z, 0-9, hífen, underscore)

### Implementação Sugerida:

**iOS (Swift):**
```swift
let deviceID = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
let timestamp = ISO8601DateFormatter().string(from: Date())
let random = UUID().uuidString.prefix(6)
let sessionID = "\(deviceID)-\(timestamp)-\(random)"
```

**Android (Kotlin):**
```kotlin
val deviceID = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
val timestamp = System.currentTimeMillis()
val random = UUID.randomUUID().toString().take(6)
val sessionID = "$deviceID-$timestamp-$random"
```

---

## 7. Fluxo Completo da App

### 7.1. Inicialização

```
1. App inicia
2. Conectar ao Supabase com API Key
3. Gerar session_id único
4. Ecrã de autenticação:
   a. Buscar evento activo: GET /rest/v1/events?status=eq.active
   b. Pedir PIN ao utilizador
   c. Validar PIN: GET /rest/v1/event_devices?event_id=eq.[UUID]&device_pin=eq.[PIN]
   d. Se inválido: mostrar erro e pedir novamente
   e. Se válido: guardar event_id, device_id, checkpoint_name, checkpoint_order
5. Mostrar confirmação: "Autenticado em [Evento] - Checkpoint [Nome]"
6. Activar modo de captura
```

### 7.2. Durante Captura (Modo Buffer)

```
1. Utilizador tira foto ou vídeo captura frame
2. Processar imagem:
   - Redimensionar para 800x600 (image_data)
   - Opcionalmente manter resolução original (display_image)
   - Converter para Base64
3. Obter GPS (se disponível)
4. Preparar payload:
   - event_id (da autenticação)
   - device_id (da autenticação)
   - session_id
   - image_data
   - captured_at
   - GPS
   - checkpoint info em image_metadata
5. POST /rest/v1/image_buffer
6. Receber confirmação
7. Mostrar na UI: "Imagem enviada - Checkpoint: [Nome]"
8. (Opcional) Consultar status periodicamente
```

### 7.3. Durante Captura (Modo Directo)

```
1. Utilizador tira foto
2. Processar imagem localmente com OCR/IA
3. Extrair número do dorsal e confiança
4. Se confiança < threshold configurado → descartar ou pedir validação manual
5. Obter GPS (se disponível)
6. Preparar payload:
   - event_id (da autenticação)
   - number (detectado)
   - timestamp
   - session_id
   - device_order (da autenticação) ← OBRIGATÓRIO
   - checkpoint_time (mesmo que timestamp)
   - GPS
7. POST /rest/v1/detections
8. Receber confirmação
9. Mostrar na UI: "Dorsal 1234 registado - Checkpoint: [Nome]"
```

### 7.4. Sincronização Offline (Se Implementado)

```
1. Se sem internet:
   - Guardar payloads em SQLite local
   - Marcar como "pending_sync"
2. Quando internet retornar:
   - Enviar payloads na ordem cronológica
   - Marcar como "synced" após sucesso
   - Remover da fila local
```

---

## 8. Tratamento de Erros

### 8.1. Erros Comuns

| Código HTTP | Erro | Causa Provável | Solução |
|-------------|------|----------------|---------|
| 400 | Bad Request | Campo obrigatório em falta ou formato inválido | Validar payload antes de enviar |
| 401 | Unauthorized | API Key inválida ou ausente | Verificar headers de autenticação |
| 404 | Not Found | Endpoint errado ou recurso não existe | Verificar URL e event_id |
| 409 | Conflict | Duplicação (device_name único, etc) | Usar ID existente ou nome diferente |
| 413 | Payload Too Large | Imagem Base64 muito grande | Comprimir ou redimensionar imagem |
| 422 | Unprocessable Entity | Violação de constraint (FK, etc) | Verificar se event_id existe |
| 500 | Internal Server Error | Erro no servidor | Retry com backoff exponencial |

### 8.2. Validações Antes de Enviar

**Validar sempre:**
- `event_id` não está vazio e é UUID válido
- `session_id` não está vazio
- `timestamp` ou `captured_at` está em formato ISO 8601 UTC
- `number` (se directo) é inteiro positivo
- `image_data` (se buffer) não está vazio e é Base64 válido
- GPS (se obrigatório) está disponível

**Limites de tamanho:**
- `image_data`: < 500 KB (idealmente < 200 KB)
- `display_image`: < 1 MB
- `proof_image`: < 500 KB
- Payload total: < 2 MB

---

## 9. Consultas Úteis Durante Operação

### 9.1. Verificar Estado do Buffer

```
GET /rest/v1/image_buffer?event_id=eq.[UUID]&status=eq.pending&select=id,captured_at,status
```

Mostra imagens ainda não processadas.

### 9.2. Listar Leituras do Evento

```
GET /rest/v1/detections?event_id=eq.[UUID]&order=timestamp.desc&limit=100
```

Mostra últimas 100 leituras.

### 9.3. Contar Leituras Únicas

```
GET /rest/v1/detections?event_id=eq.[UUID]&select=number
```

Processa localmente para obter dorsais únicos.

### 9.4. Verificar Dispositivos do Evento

```
GET /rest/v1/event_devices?event_id=eq.[UUID]&select=*,devices(*)
```

Lista dispositivos autorizados.

---

## 10. Boas Práticas

### 10.1. Performance

- **Comprimir imagens** antes de Base64 (JPEG 70-80%)
- **Enviar em batch** se offline (mas manter ordem cronológica)
- **Implementar retry** com backoff exponencial (1s, 2s, 4s, 8s...)
- **Limitar tamanho** das imagens (máx 200 KB para IA)
- **Usar cache** para event_id (não buscar a cada captura)

### 10.2. Segurança

- **Nunca** incluir a API Key no código fonte (usar variáveis de ambiente)
- **Validar** event_id e status antes de cada captura
- **Não armazenar** imagens sensíveis permanentemente no dispositivo
- **Limpar cache** de imagens após sync bem-sucedido

### 10.3. UX

- **Feedback imediato**: Mostrar confirmação visual após envio
- **Indicador de progresso**: Mostrar upload de imagem
- **Modo offline**: Avisar utilizador se sem internet
- **Validação visual**: Destacar região do dorsal detectado
- **Contador**: Mostrar quantos dorsais já foram capturados

### 10.4. Debugging

- **Logs estruturados**: Registar event_id, session_id, timestamp de cada operação
- **Guardar payloads falhados**: Para análise posterior
- **Monitorizar GPS**: Alertar se precisão > 20 metros
- **Testar edge cases**: Sem internet, GPS desligado, evento pausado

---

## 11. Resumo Rápido

### ✅ Antes de Começar (Autenticação)

| Tarefa | Endpoint | Dados |
|--------|----------|-------|
| 1. Obter evento activo | `GET /rest/v1/events?status=eq.active` | → Mostrar nome ao utilizador |
| 2. Pedir PIN ao utilizador | Interface da app | → Input numérico 4-6 dígitos |
| 3. Validar PIN + Obter checkpoint | `GET /rest/v1/event_devices?event_id=eq.[UUID]&device_pin=eq.[PIN]` | → Guardar `event_id`, `device_id`, `checkpoint_name`, `checkpoint_order` |

### 📸 Durante Operação (Escolher uma opção)

**OPÇÃO A - Buffer (Servidor processa):**
```
POST /rest/v1/image_buffer
{
  "event_id": "...",
  "device_id": "...",
  "session_id": "...",
  "image_data": "base64...",
  "captured_at": "2025-10-28T10:15:30Z",
  "latitude": 38.7223,
  "longitude": -9.1393
}
```

**OPÇÃO B - Directo (App processa):**
```
POST /rest/v1/detections
{
  "event_id": "...",
  "number": 1234,
  "timestamp": "2025-10-28T10:15:30Z",
  "session_id": "...",
  "device_order": 2,
  "checkpoint_time": "2025-10-28T10:15:30Z",
  "latitude": 38.7223,
  "longitude": -9.1393
}
```

### 🔑 Campos Obrigatórios Mínimos

**Buffer:**
- `event_id`, `device_id`, `session_id`, `image_data`, `captured_at`

**Directo:**
- `event_id`, `number`, `timestamp`, `session_id`, `device_order`

**GPS (se `gps_required: true` em settings):**
- `latitude`, `longitude`

---

## 12. Suporte e Troubleshooting

### Problemas Comuns

**"PIN inválido"**
- Verificar se evento_id está correcto
- Pedir ao utilizador para confirmar o PIN com o organizador
- Não existe configuração de checkpoint para esse evento + PIN

**"Event not found"**
- Verificar se evento existe: `GET /rest/v1/events?id=eq.[UUID]`
- Verificar se status é `active`

**"Missing device_order" ou "Missing checkpoint"**
- Utilizador não fez autenticação com PIN
- Forçar fluxo de autenticação antes de permitir capturas

**"Invalid Base64"**
- Remover prefixo `data:image/jpeg;base64,` se presente
- Validar que string é Base64 válido

**"GPS required"**
- Verificar `settings.gps_required` do evento
- Solicitar permissões de localização no SO
- Enviar `latitude`, `longitude`, `accuracy`

**"Payload too large"**
- Reduzir resolução da imagem
- Aumentar compressão JPEG (60-70%)
- Não enviar `display_image` se não necessário

---

## Anexo: Estruturas Completas das Tabelas

### Tabela `events`

```
id                    UUID PRIMARY KEY
name                  TEXT NOT NULL
description           TEXT
event_date            DATE
location              TEXT
status                TEXT DEFAULT 'active'
created_by            TEXT
settings              JSONB DEFAULT '{}'
event_started_at      TIMESTAMPTZ
event_ended_at        TIMESTAMPTZ
is_active             BOOLEAN DEFAULT false
device_sequence       JSONB DEFAULT '[]'
scheduled_start_time  TIMESTAMPTZ
auto_start_enabled    BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ DEFAULT NOW()
updated_at            TIMESTAMPTZ DEFAULT NOW()
```

### Tabela `image_buffer`

```
id                UUID PRIMARY KEY
event_id          UUID NOT NULL REFERENCES events(id)
device_id         UUID REFERENCES devices(id)
session_id        TEXT NOT NULL
image_data        TEXT NOT NULL
display_image     TEXT
image_metadata    JSONB DEFAULT '{}'
captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
latitude          DECIMAL(10,8)
longitude         DECIMAL(11,8)
accuracy          DECIMAL(8,2)
status            TEXT DEFAULT 'pending'
processed_at      TIMESTAMPTZ
processed_by      TEXT
detection_results JSONB
processing_method TEXT
processing_time_ms INTEGER
expires_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
created_at        TIMESTAMPTZ DEFAULT NOW()
```

### Tabela `detections`

```
id              UUID PRIMARY KEY
event_id        UUID REFERENCES events(id)
number          INTEGER NOT NULL
timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
latitude        DECIMAL(10,8)
longitude       DECIMAL(11,8)
accuracy        DECIMAL(8,2)
device_type     TEXT DEFAULT 'mobile'
session_id      TEXT NOT NULL
proof_image     TEXT
dorsal_region   JSONB
device_order    INTEGER
checkpoint_time TIMESTAMPTZ
split_time      INTERVAL
total_time      INTERVAL
is_penalty      BOOLEAN DEFAULT false
penalty_reason  TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Tabela `devices`

```
id          UUID PRIMARY KEY
device_name TEXT NOT NULL UNIQUE
device_type TEXT DEFAULT 'mobile'
user_agent  TEXT
last_seen   TIMESTAMPTZ DEFAULT NOW()
status      TEXT DEFAULT 'active'
created_at  TIMESTAMPTZ DEFAULT NOW()
```

### Tabela `event_devices` (AUTENTICAÇÃO)

```
id                UUID PRIMARY KEY
event_id          UUID NOT NULL REFERENCES events(id)
device_id         UUID NOT NULL REFERENCES devices(id)
device_pin        TEXT                           -- PIN de segurança 4-6 dígitos
checkpoint_name   TEXT                           -- Nome do ponto (ex: "Km 10")
checkpoint_order  INTEGER DEFAULT 1              -- Ordem sequencial (1, 2, 3...)
checkpoint_type   TEXT DEFAULT 'intermediate'    -- Tipo: start, finish, intermediate
role              TEXT DEFAULT 'detector'        -- Papel: detector, supervisor, admin
max_sessions      INTEGER DEFAULT 1              -- Máximo de sessões simultâneas
active_sessions   INTEGER DEFAULT 0              -- Sessões actualmente activas
assigned_at       TIMESTAMPTZ DEFAULT NOW()
assigned_by       TEXT
UNIQUE(event_id, device_id)
```

**Esta tabela é usada para:**
- Autenticar app nativa com evento + PIN
- Identificar qual checkpoint/ponto de leitura
- Controlar quantos dispositivos podem operar simultaneamente

---

**Documento**: Native App Integration Guide  
**Versão**: 2.0 (Com Autenticação PIN + Checkpoint)  
**Data**: 28 de Outubro de 2025  
**Para**: Equipa de Desenvolvimento da App Nativa  

## Histórico de Versões

- **v2.0** (28 Out 2025): Adicionado sistema de autenticação Evento + PIN, identificação de checkpoint, fluxo visual
- **v1.0** (28 Out 2025): Versão inicial com endpoints básicos

**Contacto de Suporte**: [Adicionar contacto técnico quando disponível]

