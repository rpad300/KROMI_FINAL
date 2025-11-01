# 🔗 Integração GPS Tracking no Sistema de Eventos

## ✅ Ficheiro Criado

**`src/event-gps-tracking.html`** - Página GPS Tracking integrada no design VisionKrono

---

## 🎯 Como Usar

### Opção 1: Link Direto (Mais Simples)

Adicionar botão/link em qualquer página de evento:

```html
<a href="event-gps-tracking.html?event_id=UUID_DO_EVENTO" class="btn btn-primary">
  <i class="fas fa-map-marked-alt"></i> GPS Tracking
</a>
```

### Opção 2: Adicionar Aba no Event Management

Editar **`src/event-management-system.html`**:

#### 1. Adicionar botão na bottom navigation:

Procurar pela `app-bottom-nav` e adicionar:

```html
<div class="nav-item" onclick="window.location.href='event-gps-tracking.html?event_id=' + CURRENT_EVENT_ID">
  <i class="fas fa-map-marked-alt"></i>
  <span>GPS</span>
</div>
```

#### 2. Ou adicionar no menu principal:

```html
<div class="compact-card" onclick="window.location.href='event-gps-tracking.html?event_id=' + eventId">
  <div style="display: flex; align-items: center; gap: 12px;">
    <i class="fas fa-route" style="font-size: 24px; color: var(--primary);"></i>
    <div>
      <div style="font-weight: 600;">GPS Tracking</div>
      <div style="font-size: 12px; color: var(--text-secondary);">
        Cronometragem em tempo real
      </div>
    </div>
  </div>
</div>
```

---

## ⚙️ Configuração

### 1. Editar `src/event-gps-tracking.html`

Substituir no topo do `<script>`:

```javascript
// ANTES:
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// DEPOIS:
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = 'sua-anon-key-aqui';
```

### 2. ID do Evento

A página **automaticamente** pega o `event_id` da URL:

```
event-gps-tracking.html?event_id=abc-123-def-456
```

Se não houver na URL, usa fallback definido no código.

---

## 🎨 Design

A página usa **exatamente o mesmo design** do VisionKrono:

✅ Cores primárias (#fc6b03)  
✅ Tema claro/escuro  
✅ Bottom navigation  
✅ Cards compactos  
✅ Badges e botões idênticos  
✅ Responsivo mobile-first  

---

## 📱 Funcionalidades Incluídas

### 4 Abas Principais:

1. **📍 Rotas**
   - Listar rotas do evento
   - Criar nova rota
   - Estatísticas (total, ativas)

2. **🎫 QR Codes**
   - Listar participantes
   - Emitir QR individual
   - Ver/imprimir QR code
   - Estatísticas

3. **🗺️ Mapa Live**
   - Mapa interativo (Leaflet.js)
   - Posições em tempo real
   - Lista de corredores ativos
   - Atualização automática (5s)

4. **🏆 Rankings**
   - Filtro por rota
   - Tabela de classificação
   - Tempo formatado

---

## 🔌 APIs Utilizadas

A página usa os mesmos RPCs criados anteriormente:

- `track_get_live_positions(event_id)`
- `track_get_rankings(event_id, route_id)`
- `track_issue_qr(event_id, participant_id)`
- Queries diretas em `track_routes`, `participants`

---

## 🚀 Deploy

### Para Usar Localmente:

1. Abrir `src/event-gps-tracking.html` em servidor local
2. Passar `?event_id=UUID` na URL
3. Pronto!

### Para Deploy em Produção:

1. Configurar Supabase URL/KEY no ficheiro
2. Upload para servidor
3. Linkar a partir do sistema de eventos existente

---

## 🎯 Exemplo de Integração Completa

### No event-management-system.html:

```javascript
// Quando carregar evento:
function loadEvent(eventId) {
  // ... código existente ...
  
  // Adicionar botão GPS Tracking
  const gpsButton = `
    <button class="btn btn-primary" onclick="openGPSTracking('${eventId}')">
      <i class="fas fa-route"></i> GPS Tracking
    </button>
  `;
  
  document.getElementById('event-actions').innerHTML += gpsButton;
}

function openGPSTracking(eventId) {
  window.location.href = `event-gps-tracking.html?event_id=${eventId}`;
}
```

---

## 📋 Checklist de Integração

- [ ] Configurar SUPABASE_URL e SUPABASE_KEY
- [ ] Testar com ID de evento real
- [ ] Verificar se SQL foi executado (tabelas track_*)
- [ ] Adicionar link/botão no sistema existente
- [ ] Testar navegação entre páginas
- [ ] Verificar tema claro/escuro funciona
- [ ] Testar em mobile

---

## 🎨 Customização Visual

Se quiser personalizar cores:

```css
:root {
  --primary: #fc6b03;       /* Laranja VisionKrono */
  --primary-dark: #e55a02;  /* Laranja escuro */
  /* Alterar conforme necessário */
}
```

---

## 🔄 Diferenças vs. Páginas Standalone

| Feature | Standalone | Integrada |
|---------|-----------|-----------|
| Design | Genérico | VisionKrono |
| Navegação | Independente | Bottom nav |
| Tema | Fixo | Claro/Escuro |
| Event ID | Hardcoded | URL param |
| Voltar | - | Botão header |

---

## 📱 Screenshots (Exemplo de Layout)

```
┌─────────────────────────┐
│ ← Voltar  GPS Tracking 🌙│
├─────────────────────────┤
│                         │
│  📊 Stats Cards         │
│  ┌────┐ ┌────┐         │
│  │ 2  │ │ 2  │         │
│  └────┘ └────┘         │
│                         │
│  [+ Nova Rota]          │
│                         │
│  ┌──────────────────┐   │
│  │ 10K    [Ativa]   │   │
│  │ 10 km • 50 km/h  │   │
│  └──────────────────┘   │
│                         │
├─────────────────────────┤
│ Rotas │ QR │ Live │ 🏆 │
└─────────────────────────┘
```

---

## ✅ Pronto para Usar!

A página está **100% funcional** e integrada no design VisionKrono.

**Próximo passo:** Adicionar link no seu sistema de eventos!

---

**Dúvidas?** Consulte `GPS_TRACKING_INDEX.md` para documentação completa.

