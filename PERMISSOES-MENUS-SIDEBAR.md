# 🔐 Permissões dos Menus do Sidebar - VisionKrono

## 📋 Sistema de Permissões Implementado

O sistema de navegação **já filtra automaticamente** os menus por role do utilizador.

### **Como Funciona:**

1. **navigation-config.js** - Define quem pode ver cada menu
2. **navigation-service.js** - Filtra menus usando `hasAccess(item, userRole)`
3. **navigation-component.js** - Renderiza apenas menus permitidos

---

## 👥 ROLES DISPONÍVEIS

| Role | Descrição | Nível de Acesso |
|------|-----------|-----------------|
| `admin` | Administrador | ⭐⭐⭐⭐⭐ Total |
| `event_manager` | Gestor de Eventos | ⭐⭐⭐⭐ Alto |
| `moderator` | Moderador (alias de event_manager) | ⭐⭐⭐⭐ Alto |
| `user` | Utilizador Normal | ⭐⭐ Básico |
| `participant` | Participante | ⭐ Leitura |

**Nota:** `moderator` e `event_manager` são tratados como equivalentes via `roleAliases`.

---

## 🗂️ MENUS GLOBAIS (Sempre Visíveis)

### **1. Dashboard** 📊
```javascript
roles: ['admin', 'moderator', 'event_manager', 'user', 'participant']
```
✅ **Todos** podem ver

### **2. Eventos** 🏃
```javascript
roles: ['admin', 'moderator', 'event_manager', 'user', 'participant']
scope: {
    admin: 'all',           // Vê todos os eventos
    moderator: 'own',       // Vê apenas os seus
    event_manager: 'own',   // Vê apenas os seus
    user: 'participant',    // Vê eventos onde é participante
    participant: 'participant'
}
```
✅ **Todos** podem ver  
⚠️ **Escopo** varia por role (filtrado pela RLS)

### **3. Utilizadores** 👥
```javascript
roles: ['admin']
```
❌ Apenas **Admin**

### **4. Perfis & Permissões** 🔐
```javascript
roles: ['admin']
```
❌ Apenas **Admin**

### **5. Configurações** ⚙️
```javascript
roles: ['admin']
```
❌ Apenas **Admin**

### **6. Auditoria** 📋
```javascript
roles: ['admin']
```
❌ Apenas **Admin**

### **7. Gestão BD** 🗄️
```javascript
roles: ['admin']
```
❌ Apenas **Admin**

### **8. Processador** ⚡
```javascript
roles: ['admin']
```
❌ Apenas **Admin**

### **9. Meu Perfil** 👤
```javascript
roles: ['admin', 'moderator', 'event_manager', 'user', 'participant']
```
✅ **Todos** podem ver

---

## 🏃 MENUS DE EVENTO (Só Aparecem com Evento Ativo)

Estes menus **só aparecem** quando há `?event=<uuid>` na URL.

### **1. Dashboard do Evento** 📊
```javascript
roles: ['admin', 'moderator', 'event_manager', 'user', 'participant']
```
✅ **Todos** os membros do evento

### **2. Deteção** 📱
```javascript
roles: ['admin', 'moderator', 'event_manager']
```
❌ Apenas **Admin** e **Event Manager**

### **3. Classificações** 🏆
```javascript
roles: ['admin', 'moderator', 'event_manager', 'user', 'participant']
readonly: {
    user: true,
    participant: true
}
```
✅ **Todos** podem ver  
⚠️ **User/Participant**: apenas leitura

### **4. Participantes** 👥
```javascript
roles: ['admin', 'moderator', 'event_manager']
```
❌ Apenas **Admin** e **Event Manager**

### **5. Por Escalão** 🎯
```javascript
roles: ['admin', 'moderator', 'event_manager', 'user', 'participant']
```
✅ **Todos** os membros do evento

### **6. Dispositivos** 📲
```javascript
roles: ['admin', 'moderator', 'event_manager']
```
❌ Apenas **Admin** e **Event Manager**

### **7. Ordem Checkpoints** 🚩
```javascript
roles: ['admin', 'moderator', 'event_manager']
```
❌ Apenas **Admin** e **Event Manager**

### **8. Calibração** 🎚️
```javascript
roles: ['admin', 'moderator', 'event_manager']
```
❌ Apenas **Admin** e **Event Manager**

### **9. Configurações do Evento** ⚙️
```javascript
roles: ['admin', 'moderator', 'event_manager']
```
❌ Apenas **Admin** e **Event Manager**

---

## 📊 MATRIZ DE PERMISSÕES

| Menu | Admin | Event Manager | User | Participant |
|------|-------|---------------|------|-------------|
| **GLOBAL** |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Eventos | ✅ (todos) | ✅ (seus) | ✅ (participa) | ✅ (participa) |
| Utilizadores | ✅ | ❌ | ❌ | ❌ |
| Perfis & Permissões | ✅ | ❌ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ |
| Auditoria | ✅ | ❌ | ❌ | ❌ |
| Gestão BD | ✅ | ❌ | ❌ | ❌ |
| Processador | ✅ | ❌ | ❌ | ❌ |
| Meu Perfil | ✅ | ✅ | ✅ | ✅ |
| **EVENTO** (com ?event=uuid) |
| Dashboard Evento | ✅ | ✅ | ✅ | ✅ |
| Deteção | ✅ | ✅ | ❌ | ❌ |
| Classificações | ✅ | ✅ | 🔍 (leitura) | 🔍 (leitura) |
| Participantes | ✅ | ✅ | ❌ | ❌ |
| Por Escalão | ✅ | ✅ | ✅ | ✅ |
| Dispositivos | ✅ | ✅ | ❌ | ❌ |
| Ordem Checkpoints | ✅ | ✅ | ❌ | ❌ |
| Calibração | ✅ | ✅ | ❌ | ❌ |
| Configurações | ✅ | ✅ | ❌ | ❌ |

---

## 🔧 AJUSTES NECESSÁRIOS

Vejo alguns problemas a corrigir no `navigation-config.js`:

### **Problema 1: Routes Incorretas**
```javascript
// Atual (ERRADO)
route: 'calibracao.html'        // ❌ Não existe
route: 'config-evento.html'     // ❌ Não existe

// Deve ser
route: 'calibration-kromi.html'  // ✅ Existe
route: 'config-kromi.html'       // ✅ Existe
```

### **Problema 2: Faltam Alguns Menus**
```javascript
// Faltam no eventMenu:
- image-processor-kromi.html (Admin/Event Manager)
- database-management-kromi.html (Admin)
- checkpoint-order-kromi.html (Admin/Event Manager)
- category-rankings-kromi.html (Todos)
```

---

## ✅ O QUE ESTÁ A FUNCIONAR

1. ✅ **Filtragem automática** por role
2. ✅ **Scope** configurado para eventos
3. ✅ **Readonly** configurado para classificações
4. ✅ **Multi-tenancy** preparado (organizer_id)
5. ✅ **Aliases** de roles (moderator = event_manager)

---

## 🚀 VAMOS CORRIGIR E ATUALIZAR

Vou:
1. ✅ Corrigir routes no navigation-config.js
2. ✅ Adicionar menus em falta
3. ✅ Atualizar todas as páginas -kromi.html
4. ✅ Testar permissões

---

**Preparado para começar?** Vou corrigir tudo agora! 🎯

