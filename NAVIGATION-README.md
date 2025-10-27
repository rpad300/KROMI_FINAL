# Sistema de Navegação Unificado - VisionKrono

Sistema centralizado de navegação com suporte a menus globais e de evento, com controle granular de permissões por role e contexto.

## 📋 Visão Geral

### Componentes

1. **navigation-config.js** - Configuração central (fonte de verdade)
2. **navigation-service.js** - Lógica de negócio e permissões
3. **navigation-component.js** - Renderização da UI
4. **navigation-component.css** - Estilos do componente
5. **navigation-init.js** - Inicialização automática

### Arquitetura

```
┌─────────────────────────────────────┐
│     navigation-config.js            │
│  (Fonte de verdade - menus/regras)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     navigation-service.js           │
│  (Lógica de permissões e filtros)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    navigation-component.js          │
│      (Renderização da UI)           │
└─────────────────────────────────────┘
```

## 🚀 Integração Rápida

### 1. Incluir Scripts na Página

Adicionar no `<head>` ou antes do `</body>`:

```html
<!-- Configuração e serviços -->
<script src="navigation-config.js?v=2025102601" defer></script>
<script src="navigation-service.js?v=2025102601" defer></script>
<script src="navigation-component.js?v=2025102601" defer></script>

<!-- Estilos -->
<link rel="stylesheet" href="navigation-component.css?v=2025102601">

<!-- Inicialização automática (deve vir por último) -->
<script src="navigation-init.js?v=2025102601" defer></script>
```

### 2. Ordem de Scripts Completa (Recomendada)

```html
<!-- CDN e bibliotecas externas -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

<!-- Infraestrutura core -->
<script src="supabase.js?v=..." defer></script>
<script src="terminal-debug.js?v=..." defer></script>
<script src="auth-client.js?v=..." defer></script>
<script src="auth-helper.js?v=..." defer></script>

<!-- Sistema de navegação -->
<script src="navigation-config.js?v=..." defer></script>
<script src="navigation-service.js?v=..." defer></script>
<script src="navigation-component.js?v=..." defer></script>
<script src="navigation-init.js?v=..." defer></script>

<!-- Proteção de rotas e outros -->
<script src="universal-route-protection.js?v=..." defer></script>
```

### 3. HTML Mínimo Necessário

```html
<div class="sidebar" id="sidebar">
    <!-- Navegação será renderizada aqui automaticamente -->
</div>
```

## 📖 Uso

### Inicialização Automática

O sistema inicializa automaticamente quando:
- DOM está pronto
- AuthClient está disponível
- Elemento `#sidebar` existe

### Utilidades Globais

```javascript
// Navegar para um evento
NavigationUtils.goToEvent('event-123', 'Maratona de Lisboa');

// Voltar ao dashboard global
NavigationUtils.goToGlobalDashboard();

// Recarregar navegação (após mudança de permissões)
NavigationUtils.reloadNavigation();

// Obter contexto de evento atual
const eventContext = NavigationUtils.getCurrentEvent();
// Retorna: { eventId, eventName, hasEvent }

// Verificar se página requer contexto de evento
const requires = NavigationUtils.requiresEventContext();
```

### Eventos Personalizados

```javascript
// Quando navegação está pronta
window.addEventListener('navigationReady', () => {
    console.log('Navegação pronta!');
});

// Quando contexto de evento muda
window.addEventListener('eventContextChanged', (e) => {
    console.log('Novo evento:', e.detail.eventId);
});

// Quando contexto de evento é limpo
window.addEventListener('eventContextCleared', () => {
    console.log('Contexto limpo');
});
```

## 🔐 Regras de Permissões

### Roles Disponíveis

- `admin` - Acesso total
- `moderator` / `event_manager` - Gestão de eventos próprios
- `user` / `participant` - Acesso básico

### Menus Globais

| Item | Admin | Moderator | User |
|------|-------|-----------|------|
| Dashboard | ✅ | ✅ | ✅ |
| Eventos | ✅ (todos) | ✅ (próprios) | ✅ (participante) |
| Utilizadores | ✅ | ❌ | ❌ |
| Perfis & Permissões | ✅ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ |
| Auditoria | ✅ | ❌ | ❌ |
| Gestão BD | ✅ | ❌ | ❌ |
| Processador | ✅ | ❌ | ❌ |
| Meu Perfil | ✅ | ✅ | ✅ |

### Menus de Evento

| Item | Admin | Moderator | User |
|------|-------|-----------|------|
| Dashboard (evento) | ✅ | ✅ | ✅ |
| Deteção | ✅ | ✅ | ❌ |
| Classificações | ✅ | ✅ | ✅ (readonly) |
| Participantes | ✅ | ✅ | ❌ |
| Por Escalão | ✅ | ✅ | ✅ |
| Dispositivos | ✅ | ✅ | ❌ |
| Ordem Checkpoints | ✅ | ✅ | ❌ |
| Calibração | ✅ | ✅ | ❌ |
| Configurações (evento) | ✅ | ✅ | ❌ |

## ⚙️ Configuração

### Adicionar Novo Item de Menu

Editar `navigation-config.js`:

```javascript
// Menu Global
globalMenu: [
    {
        id: 'novo-item',
        label: 'Novo Item',
        icon: '🆕',
        route: 'novo-item.html',
        type: 'global',
        roles: ['admin', 'moderator'],
        description: 'Descrição do item',
        scope: {
            admin: 'all',
            moderator: 'own'
        }
    }
]

// Menu de Evento
eventMenu: [
    {
        id: 'novo-item-evento',
        label: 'Novo Item',
        icon: '🆕',
        route: 'novo-item-evento.html',
        type: 'event',
        roles: ['admin', 'moderator'],
        description: 'Item do evento',
        readonly: {
            user: true
        }
    }
]
```

### Customizar Estilos

Editar `navigation-component.css` ou sobrescrever no CSS da página:

```css
/* Customizar cor de destaque */
.nav-section-label {
    color: #custom-color;
}

/* Customizar separador */
.nav-separator {
    background: linear-gradient(to right, transparent, var(--primary), transparent);
}
```

## 🧪 Testes e Validação

### Checklist de Integração

- [ ] Scripts carregam na ordem correta
- [ ] Navegação renderiza após login
- [ ] Links globais visíveis conforme role
- [ ] Menu de evento aparece com `?event=...`
- [ ] Botão "Voltar" funciona no dashboard do evento
- [ ] Items readonly mostram badge de olho
- [ ] Logout funciona corretamente
- [ ] Sidebar responsiva em mobile

### Testes por Role

#### Admin
- ✅ Vê todos os itens globais
- ✅ Vê todos os eventos em "Eventos"
- ✅ Vê todos os itens do menu de evento
- ✅ Pode acessar eventos de outros organizadores

#### Organizador/Moderator
- ✅ Vê "Eventos" mas apenas os seus
- ✅ Dentro do seu evento, vê todos os itens
- ❌ Bloqueado ao tentar acessar evento de outro
- ✅ Não vê itens administrativos (Utilizadores, etc.)

#### User/Participant
- ✅ Vê Dashboard, Eventos (se participante), Meu Perfil
- ✅ Dentro de evento, vê apenas itens permitidos
- ✅ Classificações mostram badge readonly
- ❌ Não vê itens de gestão

## 🔧 Troubleshooting

### Navegação não aparece

```javascript
// Verificar no console:
console.log('NavigationConfig:', window.NavigationConfig);
console.log('NavigationService:', window.navigationService);
console.log('NavigationComponent:', window.navigationComponent);
```

### Menu de evento não aparece

```javascript
// Verificar contexto:
const context = NavigationUtils.getCurrentEvent();
console.log('Event Context:', context);

// Verificar URL:
console.log('Event in URL:', new URLSearchParams(location.search).get('event'));
```

### Permissões incorretas

```javascript
// Verificar role atual:
console.log('Current Role:', window.navigationService.currentRole);

// Verificar acesso a item:
const item = window.NavigationConfig.getMenuItem('item-id');
const hasAccess = window.NavigationConfig.hasAccess(item, 'admin');
console.log('Has Access:', hasAccess);
```

## 📝 Notas Importantes

1. **AuthClient é obrigatório** - O sistema depende do AuthClient para obter role e utilizador
2. **universal-route-protection** continua ativo - A navegação só mostra/oculta; a proteção de rota valida acesso
3. **EventContext é opcional** - Se não existir, será criado automaticamente
4. **Versionamento** - Sempre usar query string `?v=...` para cache-busting

## 🎯 Roadmap

- [ ] Suporte a submenus (dropdown)
- [ ] Badges de notificações
- [ ] Pesquisa na navegação
- [ ] Favoritos/recentes
- [ ] Navegação breadcrumb
- [ ] Dark/light mode toggle
- [ ] Atalhos de teclado

## 📚 Referências

- AuthClient: `auth-client.js`
- Route Protection: `universal-route-protection.js`
- Design System: `kromi-design-system.css`

---

**Versão:** 2025.10.26  
**Autor:** VisionKrono Team  
**Licença:** Proprietária

