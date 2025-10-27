# 🤖 Processador IA - Dual Context (Global + Evento)

## 📋 Contexto

O **Processador IA** aparece em **2 lugares** no sidebar, com comportamentos diferentes:

---

## 🌍 PROCESSADOR IA GLOBAL

### **Localização:**
Menu Global (sempre visível)

### **Quem Vê:**
- ✅ **Admin** apenas

### **Comportamento:**
- Mostra processamentos de **TODOS os eventos**
- Permite filtrar por evento
- Estatísticas globais do sistema
- Gestão de fila de processamento global

### **URL:**
```
image-processor-kromi.html
```

### **Configuração:**
```javascript
{
    id: 'processor-global',
    label: 'Processador IA',
    icon: '🤖',
    route: 'image-processor-kromi.html',
    type: 'global',
    roles: ['admin'],  // ← SÓ ADMIN
    description: 'Processamento IA de todos os eventos',
    scope: 'all'
}
```

---

## 🏃 PROCESSADOR IA DO EVENTO

### **Localização:**
Menu de Evento (aparece quando há `?event=<uuid>`)

### **Quem Vê:**
- ✅ **Admin**
- ✅ **Event Manager**

### **Comportamento:**
- Mostra processamentos **apenas deste evento**
- Upload de imagens para este evento
- Estatísticas do evento
- Configurações específicas do evento

### **URL:**
```
image-processor-kromi.html?event=<uuid>&eventName=<nome>
```

### **Configuração:**
```javascript
{
    id: 'image-processor',
    label: 'Processador IA',
    icon: '🤖',
    route: 'image-processor-kromi.html',
    type: 'event',
    roles: ['admin', 'moderator', 'event_manager'],  // ← Admin + Manager
    description: 'Processamento IA deste evento',
    scope: 'event'
}
```

---

## 🎯 DIFERENÇAS DE COMPORTAMENTO

### **image-processor-kromi.html SEM eventId (Global)**

```javascript
// Detectar contexto
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('event');

if (!eventId) {
    // MODO GLOBAL (Admin)
    // - Carregar processamentos de TODOS os eventos
    // - Mostrar filtro por evento
    // - Dashboard global
    loadAllProcessings();
} else {
    // MODO EVENTO (Admin/Manager)
    // - Carregar processamentos deste evento
    // - Sem filtro de evento
    // - Dashboard do evento
    loadEventProcessings(eventId);
}
```

### **Queries Diferentes:**

**Global (Admin):**
```javascript
// Ver TUDO
const { data } = await supabase
    .from('image_processings')
    .select('*, events(name)')
    .order('created_at', { ascending: false });
```

**Evento (Admin/Manager):**
```javascript
// Ver apenas deste evento
const { data } = await supabase
    .from('image_processings')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
```

---

## 👥 QUEM VÊ O QUÊ

### **ADMIN:**

**Sidebar Global:**
- 📊 Dashboard
- 🏃 Eventos
- 👥 Utilizadores
- 🔐 Perfis & Permissões
- ⚙️ Configurações
- 📋 Auditoria
- 🗄️ Gestão BD
- **🤖 Processador IA** ← VÊ TODOS OS EVENTOS
- 👤 Meu Perfil

**Sidebar Evento (ao abrir evento):**
- 📊 Dashboard Evento
- 📱 Deteção
- 🏆 Classificações
- 👥 Participantes
- 📲 Dispositivos
- 🎚️ Calibração
- 🚩 Ordem Checkpoints
- 🎯 Por Escalão
- **🤖 Processador IA** ← VÊ SÓ ESTE EVENTO
- ⚙️ Configurações

**Total: 19 menus (9 global + 10 evento)**

---

### **EVENT MANAGER:**

**Sidebar Global:**
- 📊 Dashboard
- 🏃 Eventos (apenas do seu organizador)
- 👤 Meu Perfil
- ❌ **Processador IA** (NÃO vê global)

**Sidebar Evento:**
- 📊 Dashboard Evento
- 📱 Deteção
- 🏆 Classificações
- 👥 Participantes
- 📲 Dispositivos
- 🎚️ Calibração
- 🚩 Ordem Checkpoints
- 🎯 Por Escalão
- **🤖 Processador IA** ← VÊ SÓ ESTE EVENTO
- ⚙️ Configurações

**Total: 13 menus (3 global + 10 evento)**

---

### **USER:**

**Sidebar Global:**
- 📊 Dashboard
- 🏃 Eventos (onde participa)
- 👤 Meu Perfil
- ❌ **Processador IA** (NÃO vê)

**Sidebar Evento:**
- 📊 Dashboard Evento
- 🏆 Classificações (readonly)
- 🎯 Por Escalão
- ❌ **Processador IA** (NÃO vê)

**Total: 6 menus (3 global + 3 evento)**

---

## 🔧 IMPLEMENTAÇÃO NO image-processor-kromi.html

Adicionar lógica para detectar contexto:

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await waitForNavigation();
        
        const autenticado = await verificarAutenticacao(['admin', 'event_manager']);
        if (!autenticado) return;
        
        // Detectar contexto
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        const isGlobalMode = !eventId;
        
        // Atualizar título
        if (isGlobalMode) {
            document.querySelector('.header-title').textContent = 
                '🤖 Processador IA - Todos os Eventos';
        } else {
            document.querySelector('.header-title').textContent = 
                '🤖 Processador IA - Evento';
        }
        
        // Carregar dados conforme contexto
        if (isGlobalMode) {
            // ADMIN: Ver tudo
            await loadAllEventProcessings();
            showEventFilter(); // Mostrar filtro de eventos
        } else {
            // ADMIN/MANAGER: Ver apenas este evento
            await loadEventProcessings(eventId);
            hideEventFilter(); // Esconder filtro
        }
        
    } catch (error) {
        console.error('[PROCESSOR] Erro:', error);
    }
});

async function loadAllEventProcessings() {
    // Carregar de todos os eventos (só admin pode)
    const { data } = await window.supabaseClient.supabase
        .from('image_processings')
        .select(`
            *,
            events (
                id,
                name
            )
        `)
        .order('created_at', { ascending: false });
    
    // Renderizar com coluna de evento
    renderProcessingsWithEventColumn(data);
}

async function loadEventProcessings(eventId) {
    // Carregar apenas deste evento
    const { data } = await window.supabaseClient.supabase
        .from('image_processings')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
    
    // Renderizar sem coluna de evento
    renderProcessings(data);
}
```

---

## 📊 MATRIZ FINAL DE MENUS

| Menu | Tipo | Admin | Event Manager | User |
|------|------|-------|---------------|------|
| **GLOBAL (9)** |
| Dashboard | Global | ✅ | ✅ | ✅ |
| Eventos | Global | ✅ (todos) | ✅ (seus) | ✅ (participa) |
| Utilizadores | Global | ✅ | ❌ | ❌ |
| Perfis & Permissões | Global | ✅ | ❌ | ❌ |
| Configurações | Global | ✅ | ❌ | ❌ |
| Auditoria | Global | ✅ | ❌ | ❌ |
| Gestão BD | Global | ✅ | ❌ | ❌ |
| **Processador IA** ⭐ | **Global** | **✅ (todos)** | **❌** | **❌** |
| Meu Perfil | Global | ✅ | ✅ | ✅ |
| **EVENTO (10)** |
| Dashboard Evento | Evento | ✅ | ✅ | ✅ |
| Deteção | Evento | ✅ | ✅ | ❌ |
| Classificações | Evento | ✅ | ✅ | 🔍 |
| Participantes | Evento | ✅ | ✅ | ❌ |
| Dispositivos | Evento | ✅ | ✅ | ❌ |
| Calibração | Evento | ✅ | ✅ | ❌ |
| Ordem Checkpoints | Evento | ✅ | ✅ | ❌ |
| Por Escalão | Evento | ✅ | ✅ | ✅ |
| **Processador IA** ⭐ | **Evento** | **✅ (evento)** | **✅ (evento)** | **❌** |
| Configurações | Evento | ✅ | ✅ | ❌ |

**Admin vê:** 20 menus (9 global + 1 extra global + 10 evento)  
**Event Manager vê:** 13 menus (3 global + 10 evento)  
**User vê:** 6 menus (3 global + 3 evento)

---

## ✅ **CORRIGIDO!**

Agora:
- ✅ Admin vê "Processador IA" no menu global (todos os eventos)
- ✅ Admin + Event Manager veem "Processador IA" no menu do evento
- ✅ Mesmo ficheiro (`image-processor-kromi.html`) com comportamento diferente baseado em `?event=`

Testa agora e confirma! 🚀
