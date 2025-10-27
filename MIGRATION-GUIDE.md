# Guia de Migração - Sistema de Navegação Unificado

## 🎯 Objetivo

Migrar páginas existentes para usar o novo sistema de navegação unificado, eliminando código duplicado e centralizando regras de visibilidade.

## 📋 Checklist de Migração

### Etapa 1: Backup
- [ ] Fazer backup dos ficheiros atuais
- [ ] Anotar customizações específicas de cada página

### Etapa 2: Atualizar Scripts
- [ ] Adicionar navegação scripts no `<head>`
- [ ] Adicionar CSS de navegação
- [ ] Verificar ordem de carregamento

### Etapa 3: Atualizar HTML
- [ ] Remover sidebar HTML existente
- [ ] Manter apenas container `<div id="sidebar"></div>`
- [ ] Remover event listeners duplicados

### Etapa 4: Atualizar JavaScript
- [ ] Remover funções de navegação inline
- [ ] Usar `NavigationUtils` para operações
- [ ] Remover inicialização manual da sidebar

### Etapa 5: Testar
- [ ] Verificar renderização da navegação
- [ ] Testar permissões por role
- [ ] Testar contexto de evento
- [ ] Verificar responsividade

## 🔧 Mudanças Necessárias

### ANTES (index-kromi.html antigo)

```html
<head>
    <!-- Scripts antigos -->
    <script src="auth-client.js" defer></script>
    <script src="user-management.js" defer></script>
    <script>
        // Código de inicialização inline...
    </script>
</head>
<body>
    <!-- Sidebar HTML hardcoded -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h2>VisionKrono</h2>
            <button id="sidebarToggle">...</button>
        </div>
        <nav>
            <ul class="nav-list">
                <li><a href="index-kromi.html">Dashboard</a></li>
                <li><a href="events-kromi.html">Eventos</a></li>
                <!-- etc... -->
            </ul>
        </nav>
        <div class="sidebar-footer">
            <button id="logoutBtn">Sair</button>
        </div>
    </div>
    
    <script>
        // Código de setup de navegação inline
        function setupNavigation() { ... }
        function initializeSidebar() { ... }
    </script>
</body>
```

### DEPOIS (com novo sistema)

```html
<head>
    <!-- Scripts atualizados (ordem crítica!) -->
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="supabase.js" defer></script>
    <script src="terminal-debug.js" defer></script>
    <script src="auth-client.js" defer></script>
    <script src="auth-helper.js" defer></script>
    
    <!-- Sistema de navegação (NOVO) -->
    <script src="navigation-config.js" defer></script>
    <script src="navigation-service.js" defer></script>
    <script src="navigation-component.js" defer></script>
    <script src="navigation-init.js" defer></script>
    
    <script src="universal-route-protection.js" defer></script>
    
    <!-- CSS de navegação (NOVO) -->
    <link rel="stylesheet" href="navigation-component.css">
</head>
<body>
    <!-- Sidebar simplificada - será preenchida automaticamente -->
    <div class="sidebar" id="sidebar"></div>
    
    <script defer>
        // Apenas lógica específica da página
        document.addEventListener('DOMContentLoaded', async function() {
            // Aguardar navegação estar pronta
            await new Promise(resolve => {
                if (window.NavigationUtils) {
                    resolve();
                } else {
                    window.addEventListener('navigationReady', resolve);
                }
            });
            
            // Lógica da página aqui...
        });
    </script>
</body>
```

## 📝 Mudanças Detalhadas por Ficheiro

### index-kromi.html

**Remover:**
```html
<!-- Remover toda a sidebar hardcoded (linhas 421-484) -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-header">...</div>
    <nav class="sidebar-nav">...</nav>
    <div class="sidebar-footer">...</div>
</div>

<!-- Remover funções de navegação (linhas 850-907) -->
<script>
function setupNavigation() { ... }
function initializeDashboard() { ... }
</script>
```

**Adicionar:**
```html
<!-- No <head>, após auth-helper.js -->
<script src="navigation-config.js?v=2025102601" defer></script>
<script src="navigation-service.js?v=2025102601" defer></script>
<script src="navigation-component.js?v=2025102601" defer></script>
<script src="navigation-init.js?v=2025102601" defer></script>

<link rel="stylesheet" href="navigation-component.css?v=2025102601">

<!-- Simplificar sidebar -->
<div class="sidebar" id="sidebar"></div>
```

**Atualizar:**
```javascript
// ANTES
function initializeDashboard() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    // ... código manual ...
}

// DEPOIS
// Não é necessário! O sistema cuida automaticamente.
// Se precisar de callbacks:
window.addEventListener('navigationReady', function() {
    console.log('Navegação pronta, posso continuar...');
});
```

### events-kromi.html

**Mudanças específicas:**
```javascript
// ANTES - código para listar eventos
async function loadEvents() {
    const { data } = await supabase.from('events').select('*');
    // Mostrava TODOS os eventos para todos
}

// DEPOIS - usar escopo do serviço
async function loadEvents() {
    const scope = window.navigationService.getEventDataScope();
    
    let query = supabase.from('events').select('*');
    
    if (scope === 'own') {
        // Moderator/Event Manager - só seus eventos
        query = query.eq('organizer_id', window.authSystem.currentUser.id);
    } else if (scope === 'participant') {
        // User - só eventos onde participa
        // Implementar join com participants
    }
    
    const { data } = await query;
}
```

### config-kromi.html (Dashboard do Evento)

**Adicionar contexto de evento:**
```javascript
// ANTES
// Nenhuma gestão de contexto

// DEPOIS
document.addEventListener('DOMContentLoaded', function() {
    // Obter eventId da URL
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    
    if (!eventId) {
        // Redirecionar se não há evento
        alert('Selecione um evento primeiro');
        window.location.href = 'events-kromi.html';
        return;
    }
    
    // Carregar dados do evento
    loadEventData(eventId);
});

// Botão voltar já está no menu automaticamente!
```

### Outras páginas de evento

Todas as páginas que pertencem ao contexto de evento devem:

1. **Verificar eventId na URL:**
```javascript
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event');

if (!eventId) {
    alert('Contexto de evento necessário');
    window.location.href = 'events-kromi.html';
}
```

2. **Usar NavigationUtils:**
```javascript
// Obter contexto atual
const context = NavigationUtils.getCurrentEvent();

// Verificar se requer evento
if (NavigationUtils.requiresEventContext() && !context?.hasEvent) {
    // Redirecionar
}
```

## 🚀 Exemplo de Migração Completa

### Página: participants-kromi.html

**ANTES:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Participantes</title>
    <script src="auth-client.js" defer></script>
</head>
<body>
    <!-- Sidebar duplicada aqui -->
    <div class="sidebar">...</div>
    
    <main>
        <h1>Participantes</h1>
        <!-- Conteúdo -->
    </main>
    
    <script>
        // Sidebar setup duplicado
        function initSidebar() { ... }
        initSidebar();
    </script>
</body>
</html>
```

**DEPOIS:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Participantes</title>
    
    <!-- Design System -->
    <link rel="stylesheet" href="kromi-design-system.css">
    <link rel="stylesheet" href="navigation-component.css">
    
    <!-- Core -->
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="supabase.js" defer></script>
    <script src="auth-client.js" defer></script>
    <script src="auth-helper.js" defer></script>
    
    <!-- Navegação -->
    <script src="navigation-config.js" defer></script>
    <script src="navigation-service.js" defer></script>
    <script src="navigation-component.js" defer></script>
    <script src="navigation-init.js" defer></script>
    
    <script src="universal-route-protection.js" defer></script>
</head>
<body class="layout-with-sidebar">
    <!-- Sidebar automática -->
    <div class="sidebar" id="sidebar"></div>
    
    <header class="header">
        <h1>Participantes</h1>
    </header>
    
    <main class="main">
        <!-- Conteúdo -->
    </main>
    
    <script defer>
        document.addEventListener('DOMContentLoaded', async function() {
            // Verificar autenticação
            const ok = await verificarAutenticacao(['admin', 'moderator']);
            if (!ok) return;
            
            // Verificar contexto de evento
            const eventId = new URLSearchParams(location.search).get('event');
            if (!eventId) {
                alert('Selecione um evento');
                location.href = 'events-kromi.html';
                return;
            }
            
            // Verificar acesso ao evento
            const canAccess = await window.navigationService.canAccessEvent(eventId);
            if (!canAccess) {
                alert('Sem permissão para este evento');
                location.href = 'events-kromi.html';
                return;
            }
            
            // Carregar participantes
            loadParticipants(eventId);
        });
        
        async function loadParticipants(eventId) {
            const { data } = await window.supabaseClient.supabase
                .from('participants')
                .select('*')
                .eq('event_id', eventId);
            
            // Renderizar...
        }
    </script>
</body>
</html>
```

## ✅ Validação Pós-Migração

Após migrar cada página, verificar:

1. **Navegação renderiza?**
   - Abrir console: `console.log(window.navigationComponent)`
   - Ver sidebar preenchida

2. **Permissões corretas?**
   - Testar com diferentes roles
   - Verificar itens visíveis/ocultos

3. **Contexto de evento?**
   - Navegar para evento
   - Verificar menu de evento aparece
   - Botão "Voltar" funciona?

4. **Links funcionam?**
   - Clicar em cada item
   - Verificar navegação
   - Verificar eventId preservado

5. **Responsividade?**
   - Testar em mobile
   - Sidebar toggle funciona?

## 🐛 Problemas Comuns

### "NavigationConfig is not defined"
- **Causa:** Scripts não carregados na ordem
- **Solução:** Verificar ordem no `<head>`, usar `defer`

### Sidebar vazia
- **Causa:** AuthClient não pronto ou container errado
- **Solução:** Verificar `id="sidebar"` e aguardar `navigationReady`

### Menu de evento não aparece
- **Causa:** URL sem `?event=...`
- **Solução:** Usar `NavigationUtils.goToEvent(id, name)`

### Permissões erradas
- **Causa:** Role não sincronizado
- **Solução:** Verificar `auth-client.js` carrega perfil corretamente

## 📚 Recursos

- **Exemplo completo:** `NAVIGATION-INTEGRATION-EXAMPLE.html`
- **Documentação:** `NAVIGATION-README.md`
- **Configuração:** `navigation-config.js`

---

**Próximos Passos:**

1. Migrar `index-kromi.html` primeiro (referência)
2. Migrar `events-kromi.html` (lista de eventos)
3. Migrar `config-kromi.html` (dashboard de evento)
4. Migrar restantes páginas de evento
5. Migrar páginas administrativas
6. Testar fluxo completo

**Tempo estimado:** 1-2h por página complexa, 15-30min por página simples.

