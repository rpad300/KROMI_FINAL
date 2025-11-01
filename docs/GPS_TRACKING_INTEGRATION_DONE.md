# ✅ GPS TRACKING - INTEGRAÇÃO COMPLETA!

## 🎉 Menu GPS Tracking Adicionado ao Sistema de Eventos

**Ficheiro modificado:** `src/event-management-system.html`

---

## 📱 Onde Aparece o Botão GPS

### 1️⃣ **Bottom Navigation** (Mobile)
Aparece na barra inferior com ícone `📍 GPS`

```
┌─────────────────────────────┐
│                             │
│    Conteúdo do Evento       │
│                             │
├─────────────────────────────┤
│ Geral │ Atletas │ Live │ GPS│ Config │  ← AQUI!
└─────────────────────────────┘
```

### 2️⃣ **Sidebar** (Desktop)
Aparece no menu lateral entre "Ao Vivo" e "Resultados"

```
┌─────────────────┐
│ KROMI           │
│ Gestão Total    │
├─────────────────┤
│ 📊 Visão Geral  │
│ ➕ Criar Evento │
│ 🏃 Atividades   │
│ 👥 Participantes│
│ 📱 Dispositivos │
│ 📹 Ao Vivo      │
│ 📍 GPS Tracking │ ← AQUI!
│ 🏆 Resultados   │
│ 📈 Analytics    │
│ ⚙️ Configurações│
└─────────────────┘
```

---

## ⚙️ Como Funciona

Quando clicas em **"GPS Tracking"**:

1. JavaScript pega o `event_id` da URL atual
2. Redireciona para: `event-gps-tracking.html?event_id=UUID`
3. Abre a página GPS com 4 abas:
   - 📍 Rotas
   - 🎫 QR Codes
   - 🗺️ Mapa Live
   - 🏆 Rankings

---

## 🔧 Código Adicionado

### No Sidebar (linha ~197):
```html
<div class="nav-item" onclick="openGPSTracking()" style="cursor: pointer;">
  <i class="fas fa-route"></i>
  <span>GPS Tracking</span>
</div>
```

### Na Bottom Nav (linha ~926):
```html
<button class="nav-btn" onclick="openGPSTracking()">
  <i class="fas fa-route text-lg"></i>
  <div class="text-xs mt-1">GPS</div>
</button>
```

### Função JavaScript (linha ~1137):
```javascript
function openGPSTracking() {
  const eventId = new URLSearchParams(window.location.search).get('event_id');
  if (eventId) {
    window.location.href = `event-gps-tracking.html?event_id=${eventId}`;
  } else {
    showNotification('ID do evento não encontrado', 'error');
  }
}
```

---

## 🧪 Como Testar

1. **Abrir** um evento no sistema:
   ```
   event-management-system.html?event_id=ALGUM-UUID
   ```

2. **Clicar** no botão "GPS" na bottom nav (mobile) ou "GPS Tracking" no sidebar (desktop)

3. **Deve abrir** a página `event-gps-tracking.html` com as 4 abas!

---

## ⚠️ Se Não Aparecer

### Verificar:
- ✅ Estás numa página de evento? (URL tem `?event_id=...`)
- ✅ O ficheiro `event-gps-tracking.html` existe em `src/`
- ✅ Refresh da página (Ctrl+F5)

### Troubleshoot:
```javascript
// Abrir console do navegador (F12) e testar:
console.log(new URLSearchParams(window.location.search).get('event_id'));
// Deve retornar o UUID do evento
```

---

## 📋 Próximos Passos

### 1. Configurar Credenciais (1 minuto)

Editar **`src/event-gps-tracking.html`** linha ~132:

```javascript
// SUBSTITUIR:
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// POR (do teu .env):
const SUPABASE_URL = 'https://mdrvgbztadnluhrrnlob.supabase.co';
const SUPABASE_KEY = 'tua-anon-key-aqui';  // Ver no .env: NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Configurar Scheduler (1 comando SQL)

No Supabase Dashboard → SQL Editor:

```sql
SELECT cron.schedule(
    'process-gps-inbox',
    '*/10 * * * * *',
    $$SELECT track_process_inbox_messages(100);$$
);
```

### 3. Criar Dados de Teste

```sql
-- Pegar um evento existente
SELECT id, name FROM events LIMIT 5;

-- Criar rota GPS
INSERT INTO track_routes (event_id, name, distance_km, is_active)
VALUES ('event-uuid-aqui', '5K Teste GPS', 5.0, true);

-- Ver resultado
SELECT * FROM v_track_route_stats;
```

---

## ✨ Está PRONTO!

✅ **Botão GPS no menu** (sidebar + bottom nav)  
✅ **Função JavaScript** para abrir  
✅ **Página GPS** integrada no sistema  
✅ **Event ID** passa automaticamente via URL  

**Agora quando abrires um evento, o botão GPS vai aparecer! 🎊**

---

**Testa agora:**
1. Abre um evento: `event-management-system.html?event_id=qualquer-uuid`
2. Clica em "GPS" (mobile) ou "GPS Tracking" (sidebar)
3. Deve abrir a interface GPS! 🚀

---

**VisionKrono GPS Tracking**  
*100% Integrado no Sistema de Eventos! ✅*

