# 📊 ESTRUTURA COMPLETA DO SUPABASE

## 🗄️ **Tabelas Principais**

### **1. `events`**
```sql
- id (UUID, PK)
- name (TEXT)
- description (TEXT)
- event_date (DATE)
- location (TEXT)
- status (TEXT) -- active, paused, completed, cancelled
- event_type (VARCHAR) -- running, cycling, etc.
- distance_km (DECIMAL) -- distância do evento
- has_categories (BOOLEAN)
- event_started_at (TIMESTAMPTZ)
- event_ended_at (TIMESTAMPTZ)
- is_active (BOOLEAN)
- device_sequence (JSONB)
- scheduled_start_time (TIMESTAMPTZ)
- auto_start_enabled (BOOLEAN)
- created_by (TEXT)
- settings (JSONB)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### **2. `participants`**
```sql
- id (UUID, PK)
- event_id (UUID, FK → events.id)
- dorsal_number (INTEGER) -- ⚠️ NÃO É 'dorsal', É 'dorsal_number'
- full_name (VARCHAR)
- birth_date (DATE)
- gender (VARCHAR) -- M, F
- team_name (VARCHAR)
- category (VARCHAR) -- calculado automaticamente
- registration_date (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- UNIQUE(event_id, dorsal_number)
```

### **3. `detections`**
```sql
- id (UUID, PK)
- number (INTEGER) -- número do dorsal detectado
- timestamp (TIMESTAMPTZ)
- latitude (DECIMAL)
- longitude (DECIMAL)
- accuracy (DECIMAL)
- device_type (TEXT) -- mobile, desktop
- session_id (TEXT)
- event_id (UUID, FK → events.id)
- device_order (INTEGER)
- checkpoint_time (TIMESTAMPTZ)
- split_time (INTERVAL)
- total_time (INTERVAL)
- is_penalty (BOOLEAN)
- penalty_reason (TEXT)
- proof_image (TEXT) -- Base64
- dorsal_region (JSONB)
- created_at (TIMESTAMPTZ)
```

### **4. `classifications`**
```sql
- id (UUID, PK)
- event_id (UUID, FK → events.id)
- dorsal_number (INTEGER) -- ⚠️ NÃO É 'dorsal', É 'dorsal_number'
- device_order (INTEGER)
- checkpoint_time (TIMESTAMPTZ)
- split_time (INTERVAL)
- total_time (INTERVAL)
- is_penalty (BOOLEAN)
- penalty_reason (TEXT)
- detection_id (UUID, FK → detections.id)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### **5. `devices`**
```sql
- id (UUID, PK)
- device_name (TEXT)
- device_type (TEXT) -- mobile, desktop, tablet
- user_agent (TEXT)
- last_seen (TIMESTAMPTZ)
- status (TEXT) -- active, inactive, banned
- created_at (TIMESTAMPTZ)
```

### **6. `event_devices`**
```sql
- id (UUID, PK)
- event_id (UUID, FK → events.id)
- device_id (UUID, FK → devices.id)
- role (TEXT) -- detector, supervisor, admin
- assigned_at (TIMESTAMPTZ)
- assigned_by (TEXT)
- UNIQUE(event_id, device_id)
```

### **7. `event_configurations`**
```sql
- id (UUID, PK)
- event_id (UUID, FK → events.id)
- config_type (TEXT) -- number_area, calibration, detection_params
- config_data (JSONB)
- config_image_id (UUID, FK → images.id)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- UNIQUE(event_id, config_type)
```

### **8. `images`**
```sql
- id (UUID, PK)
- image_type (TEXT)
- image_data (TEXT) -- Base64
- metadata (JSONB)
- event_id (UUID, FK → events.id)
- created_at (TIMESTAMPTZ)
```

---

## 🔍 **Views Importantes**

### **1. `event_classifications`**
- Classificações completas com participantes
- Inclui posição, categoria, tempos, etc.

### **2. `events_with_stats`**
- Eventos com estatísticas (dispositivos, detecções, etc.)

### **3. `detections_complete`**
- Detecções com dados do evento e dispositivo

---

## ⚠️ **CORREÇÕES NECESSÁRIAS**

### **Problema Identificado**:
- ❌ Código usa `participants.dorsal`
- ✅ Supabase tem `participants.dorsal_number`

### **Solução**:
```javascript
// ANTES (❌ Erro):
.order('dorsal', { ascending: true });

// DEPOIS (✅ Correto):
.order('dorsal_number', { ascending: true });
```

---

## 🎯 **Próximos Passos**

1. ✅ Corrigir todas as referências de `dorsal` para `dorsal_number`
2. ✅ Atualizar queries para usar estrutura correta
3. ✅ Testar com dados reais do Supabase

---

## 📋 **Resumo das Correções**

- ✅ `classifications-kromi.html` - Queries corrigidas
- ✅ `participants-kromi.html` - Queries corrigidas
- ✅ Dropdown escondido quando dentro do evento
- ✅ Inicialização do Supabase corrigida

**Agora o sistema está alinhado com a estrutura real do Supabase!** ✨
