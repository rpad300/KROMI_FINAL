# Migração Completa de Triggers SQL → JavaScript

## ✅ Triggers Migrados para JavaScript

### 1. `trg_calculate_classification_times` (classifications)
**Arquivo:** `src/classification-logic.js`  
**Função:** `calculateClassificationTimes()`  
**Lógica:**
- Eventos simples → `total_time` na META
- Triatlo/Duatlo → `split_time` por atividade, `total_time` no último
- Eventos com voltas → `split_time` por volta, `total_time` no final

### 2. `trg_process_activity_detection` (detections)
**Arquivo:** `src/classification-logic.js`  
**Função:** `processActivityDetection()`  
**Lógica:**
- Detecta Triatlo/Duatlo
- Calcula tempo por atividade (Natação, Ciclismo, Corrida)
- Insere em `activity_times`

### 3. `trg_process_lap_detection` (detections)
**Arquivo:** `src/classification-logic.js`  
**Função:** `processLapDetection()`  
**Lógica:**
- Eventos com `has_lap_counter = true`
- Calcula número da volta
- Calcula tempo e velocidade da volta
- Insere em `lap_data`

### 4. VIEW `event_classifications`
**Arquivo:** `src/classification-logic.js`  
**Função:** `processCompleteClassifications()`  
**Lógica:**
- Calcula posição/ranking
- Calcula `gap_to_leader`
- Calcula `avg_speed_kmh`
- Retorna lista ordenada

## ✅ Triggers Mantidos no SQL

### Notificações de Email (assíncronas)
- `trigger_classification_notification_email`
- `trigger_detection_notification_email`
- `trigger_participant_registration_email`

### Timestamps Automáticos (triviais)
- Todos os `update_*_updated_at`

### Sistema Supabase (interno)
- Triggers de `storage.*`
- Triggers de `realtime.*`

## 🔧 Para ativar a migração

### 1. Desabilitar triggers migrados
Execute: `sql/disable-migrated-triggers.sql`

### 2. Reiniciar servidor
```bash
npm start
```

### 3. Testar
- Capture imagens
- Aguarde processamento automático
- Classificações aparecem COM tempos calculados
- **SEM dependência de triggers SQL**

## 📊 Vantagens

1. **Centralizado:** Toda lógica em `classification-logic.js`
2. **Manutenível:** Fácil modificar/debugar
3. **Testável:** Pode testar isoladamente
4. **Logs:** Logs detalhados no servidor
5. **Confiável:** Não depende de triggers que podem falhar
6. **Flexível:** Lógica complexa em JavaScript

## 🎯 Sistema 100% Servidor-Side!

Após desabilitar os triggers, **TODA** a lógica crítica roda no servidor Node.js.


