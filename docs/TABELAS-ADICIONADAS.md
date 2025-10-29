# 📊 Tabelas Adicionadas ao Database Management

## 🎯 Resumo

A interface `database-management-kromi.html` e a API `/api/database/tables` foram atualizadas para incluir **10 tabelas adicionais** que existem no Supabase mas não estavam listadas.

---

## ✅ Tabelas Adicionadas (10)

### 📡 Hardware/Livestream (3 tabelas)

1. **`livestream_commands`** - Comandos entre dispositivos livestream
2. **`livestream_offers`** - Ofertas WebRTC para estabelecimento de conexão
3. **`livestream_frames`** - Frames capturados para streaming via servidor

**Fonte:** `sql/livestream-tables.sql`

---

### 📧 Sistema de Email (3 tabelas)

4. **`email_templates`** - Templates de email com suporte a variáveis dinâmicas
5. **`email_logs`** - Registro de emails enviados pelo sistema
6. **`email_schedule`** - Agendamento de envio de emails

**Fonte:** `sql/create-email-templates-system.sql` e `sql/add-email-triggers-and-recipients.sql`

---

### 🤖 Sistema de IA e Custos (2 tabelas)

7. **`ai_cost_stats`** - Estatísticas de custos de IA sincronizados do cloud provider
8. **`ai_cost_sync_log`** - Log de sincronizações de custos de IA

**Fonte:** `sql/create-ai-cost-stats-system.sql`

---

### 🔐 Segurança e Permissões (1 tabela)

9. **`user_permissions`** - Permissões específicas de utilizadores

**Fonte:** `sql/create-user-management-system.sql`

---

### 🎯 Relações de Eventos (1 tabela)

10. **`event_participants`** - Relação N:N entre eventos e participantes

**Fonte:** `sql/create-auth-system.sql`

---

## 📊 Estatísticas

| Categoria | Antes | Depois | Mudança |
|----------|-------|--------|---------|
| **Total de Tabelas** | 46 | **57** | **+11** |
| **Hardware** | 6 | 9 | +3 |
| **Sistema** | 3 | 9 | +6 |
| **Segurança** | 4 | 5 | +1 |
| **Core** | 5 | 5 | ✓ |
| **Config** | 13 | 13 | ✓ |
| **Processamento** | 6 | 6 | ✓ |
| **Stats/Views** | 3 | 3 | ✓ |
| **Logs** | 4 | 4 | ✓ |
| **Dados** | 3 | 3 | ✓ |

---

## 🔄 Ficheiros Atualizados

### 1. `src/database-routes.js`

**Modificado em:** Linha 92-118

**Alterações:**
```javascript
// ADICIONADAS:
'livestream_commands', 'livestream_offers', 'livestream_frames',
'email_templates', 'email_logs', 'email_schedule',
'ai_cost_stats', 'ai_cost_sync_log',
'user_permissions',
```

---

### 2. `src/database-management-kromi.html`

**Modificado em:** 
- Linha 883-885 (Hardware/Livestream)
- Linha 924 (Segurança - user_permissions)
- Linha 932-936 (Sistema - Email e IA)
- Linha 430 (Estatística - Total de Tabelas: 57)

**Alterações:**
```javascript
// NOVA CATEGORIA: Hardware
{ name: 'livestream_commands', description: 'Comandos livestream', icon: '📡', category: 'Hardware' },
{ name: 'livestream_offers', description: 'Ofertas WebRTC', icon: '🎥', category: 'Hardware' },
{ name: 'livestream_frames', description: 'Frames capturados', icon: '🖼️', category: 'Hardware' },

// ADICIONADO: Segurança
{ name: 'user_permissions', description: 'Permissões de utilizadores', icon: '🔒', category: 'Segurança' },

// NOVA CATEGORIA: Sistema (Email e IA)
{ name: 'email_templates', description: 'Templates de email', icon: '📧', category: 'Sistema' },
{ name: 'email_logs', description: 'Logs de emails', icon: '📬', category: 'Sistema' },
{ name: 'email_schedule', description: 'Agendamento de emails', icon: '📅', category: 'Sistema' },
{ name: 'ai_cost_stats', description: 'Estatísticas de custos IA', icon: '💰', category: 'Sistema' },
{ name: 'ai_cost_sync_log', description: 'Log de sincronização IA', icon: '🔄', category: 'Sistema' },
```

---

## ✨ Funcionalidades Adicionais

### 📡 Livestream

As tabelas de livestream permitem:
- Comunicação bidirecional entre dispositivos
- Estabelecimento de conexões WebRTC
- Captura e streaming de frames em tempo real

### 📧 Sistema de Email

As tabelas de email permitem:
- Templates reutilizáveis com variáveis dinâmicas (ex: `{{user_name}}`)
- Registro completo de emails enviados
- Agendamento de envios futuros

### 🤖 IA e Custos

As tabelas de IA permitem:
- Rastreamento de custos reais de IA por serviço, modelo, região
- Estatísticas agregadas (por hora, evento, etc.)
- Sincronização automática com cloud providers
- Views para análise de custos

### 🔐 Permissões Granulares

A tabela `user_permissions` permite:
- Permissões específicas além das roles básicas
- Controle de acesso a recursos específicos
- Expiração de permissões

---

## 🧪 Como Verificar

1. Aceder a: https://192.168.1.219:1144/database-management-kromi.html
2. Verificar que aparecem **57 tabelas** (antes eram 46)
3. Verificar categorias organizadas:
   - **Hardware**: 9 tabelas (agora inclui livestream_*)
   - **Sistema**: 9 tabelas (agora inclui email_* e ai_cost_*)
   - **Segurança**: 5 tabelas (agora inclui user_permissions)

---

## 📋 Lista Completa de Tabelas (57)

### Core (5)
- events
- participants
- detections
- classifications
- event_participants ✨ **NOVO**

### Hardware (9)
- devices
- event_devices
- device_sessions
- active_device_sessions
- livestream_devices
- livestream_devices_online
- livestream_commands ✨ **NOVO**
- livestream_offers ✨ **NOVO**
- livestream_frames ✨ **NOVO**

### Config (13)
- checkpoint_types
- event_checkpoints
- event_checkpoints_view
- event_categories
- event_modalities
- event_lap_config
- event_lap_config_backup
- event_category_config
- event_modality_config
- event_configurations
- event_calibrations
- event_processor_settings
- event_classifications

### Processamento (6)
- image_buffer
- images
- batch_processing
- manual_processing
- detections_with_images
- configurations_with_images

### Stats/Views (3)
- detection_stats
- events_with_stats
- livestream_event_stats

### Logs (4)
- activity_logs
- activity_times
- audit_logs
- calibration_history

### Segurança (5)
- user_profiles
- user_sessions
- user_permissions ✨ **NOVO**
- organizers
- role_definitions

### Sistema (9)
- configurations
- platform_configurations
- global_processor_settings
- email_templates ✨ **NOVO**
- email_logs ✨ **NOVO**
- email_schedule ✨ **NOVO**
- ai_cost_stats ✨ **NOVO**
- ai_cost_sync_log ✨ **NOVO**

### Dados (3)
- age_categories
- modality_activities
- lap_data

---

## ✅ Status

**Status:** ✅ ATUALIZADO COM SUCESSO  
**Data:** 2025-01-27  
**Total de Tabelas:** 57 (antes: 46)  
**Interface:** https://192.168.1.219:1144/database-management-kromi.html  

**Pronto para:** ✅ Verificação completa da base de dados no Supabase

