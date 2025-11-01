# ⚙️ Como Funciona o Processamento Automático

## ✅ Resposta Direta

**SIM!** Sempre que algo é inserido em `device_detections`:
1. ✅ Registro é criado com `status = 'pending'`
2. ✅ O sistema detecta automaticamente (a cada 5 segundos)
3. ✅ Processa automaticamente
4. ✅ Decide onde colocar:
   - **Se tem dorsal** → Vai para `detections` (cria classificação)
   - **Se não tem dorsal** → Vai para `image_buffer` (aguarda IA)

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────┐
│  App Nativa                     │
│  Chama save_device_detection()  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  device_detections              │
│  status = 'pending'             │
│  (aguardando processamento)     │
└──────────────┬──────────────────┘
               │
               │ ⏰ A cada 5 segundos
               │
               ▼
┌─────────────────────────────────┐
│  DeviceDetectionProcessor       │
│  (roda no servidor)             │
│  - Busca registros 'pending'     │
│  - Processa em lotes de 10      │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  process_device_detection()     │
│  (função RPC no banco)          │
│  - Busca info do dispositivo    │
│  - Associa event_id, device_id   │
│  - Decide destino                │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌───────────┐  ┌──────────────┐
│  Com      │  │  Sem         │
│  Dorsal   │  │  Dorsal     │
└─────┬─────┘  └──────┬───────┘
      │               │
      ▼               ▼
┌───────────┐  ┌──────────────┐
│detections │  │image_buffer  │
│           │  │              │
│ ✅ Status │  │ ⏳ Aguarda IA │
│ processed │  │ processar    │
└───────────┘  └──────────────┘
```

---

## 📊 Detalhes Técnicos

### 1. Inserção na Tabela

Quando a app chama `save_device_detection()`:

```sql
INSERT INTO device_detections (
    access_code, session_id, dorsal_number, image_data,
    latitude, longitude, captured_at, status
) VALUES (
    'ABC123', 'session-123', 42, 'base64...',
    38.123, -9.456, '2024-01-15 10:30:00', 'pending'  -- ✅ Sempre 'pending'
)
```

### 2. Processamento Automático

O `DeviceDetectionProcessor` roda no servidor:

```javascript
// A cada 5 segundos
setInterval(() => {
    processBatch();  // Processa até 10 registros por vez
}, 5000);
```

### 3. Função RPC Processa

A função `process_device_detection()` faz:

1. **Busca informações:**
   ```sql
   SELECT event_id, device_id, checkpoint_order
   FROM event_devices
   WHERE access_code = 'ABC123'
   ```

2. **Associa automaticamente:**
   - ✅ `event_id`
   - ✅ `device_id`
   - ✅ `device_order` (checkpoint)
   - ✅ `checkpoint_name`
   - ✅ `checkpoint_type`

3. **Decide destino:**
   - Se `dorsal_number IS NOT NULL` → `detections`
   - Se `dorsal_number IS NULL` → `image_buffer`

4. **Atualiza status:**
   ```sql
   UPDATE device_detections
   SET status = 'processed',
       detection_id = '...' OU buffer_id = '...'
   WHERE id = '...'
   ```

---

## ⏱️ Timing

- **Intervalo de verificação:** 5 segundos
- **Tamanho do lote:** 10 registros por vez
- **Processamento:** Imediato quando detecta

**Exemplo:**
```
10:30:00 - App envia dados
10:30:00 - device_detections criado (pending)
10:30:05 - Processador verifica e processa
10:30:05 - Registro processado (processed)
```

**Máximo de espera:** 5 segundos ⏱️

---

## ✅ Vantagens

1. **Automático:** Não precisa fazer nada manual
2. **Associação automática:** Event, device, checkpoint
3. **Resiliente:** Se falhar, tenta novamente
4. **Eficiente:** Processa em lotes
5. **Rastreável:** Status em cada etapa

---

## 📋 Status Possíveis

- `pending` - Aguardando processamento
- `processing` - Sendo processado agora
- `processed` - Processado com sucesso
- `failed` - Falhou (com erro registrado)

---

## 🔍 Verificar Processamento

### Ver pendentes:
```sql
SELECT * FROM device_detections 
WHERE status = 'pending'
ORDER BY created_at;
```

### Ver processados:
```sql
SELECT * FROM device_detections 
WHERE status = 'processed'
ORDER BY processed_at DESC;
```

### Ver falhas:
```sql
SELECT * FROM device_detections 
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 🎯 Resumo

**SIM, é automático!**

1. App envia → `device_detections` (pending)
2. Servidor processa → A cada 5 segundos
3. Sistema decide → `detections` ou `image_buffer`
4. Tudo associado → Automaticamente

**Você não precisa fazer NADA!** 🎉

