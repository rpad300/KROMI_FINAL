# 🔧 Troubleshooting - Sistema de Navegação Unificado

## 🐛 Problemas Comuns e Soluções

### Problema 1: CSS da Navegação Incorreto

**Sintomas:**
- Sidebar não aparece ou está desformatada
- Elementos sobrepostos
- Larguras/posições incorretas

**Diagnóstico:**
```javascript
// No console do browser
console.log('Sidebar:', document.getElementById('sidebar'));
console.log('Classes:', document.getElementById('sidebar')?.className);
console.log('Estilos computados:', getComputedStyle(document.getElementById('sidebar')));
```

**Soluções:**

#### A) Verificar ordem de CSS
Os CSS devem carregar nesta ordem:
```html
<link rel="stylesheet" href="kromi-design-system.css">
<link rel="stylesheet" href="kromi-layout-fixes.css">
<link rel="stylesheet" href="navigation-component.css?v=2025102601">
```

#### B) Remover estilos conflitantes
Procurar e remover no `<style>` da página:
```css
/* ❌ REMOVER - Conflita com navigation-component */
.layout-with-sidebar .sidebar {
    position: fixed;
    left: 0;
    width: 280px;
    /* ... */
}

/* ✅ MANTER - Apenas comentário */
.layout-with-sidebar .sidebar {
    /* Estilos gerenciados por navigation-component.css */
}
```

#### C) Verificar classes aplicadas
A sidebar deve ter:
```html
<div class="sidebar" id="sidebar">
    <!-- Conteúdo renderizado automaticamente -->
</div>
```

Não deve ter classes extras como `sidebar-hidden`, `collapsed`, etc. (a menos que intencionais).

#### D) Forçar recarregamento de CSS
```
Ctrl + F5 (Windows/Linux)
Cmd + Shift + R (Mac)
```

Ou adicionar/incrementar versão:
```html
<link rel="stylesheet" href="navigation-component.css?v=2025102602">
```

### Problema 2: Navegação Não Renderiza

**Sintomas:**
- Sidebar vazia
- Sem menus visíveis
- Erros no console

**Diagnóstico:**
```javascript
// Verificar se sistema está inicializado
console.log('NavigationConfig:', window.NavigationConfig);
console.log('NavigationService:', window.navigationService);
console.log('NavigationComponent:', window.navigationComponent);
console.log('NavigationUtils:', window.NavigationUtils);

// Verificar menus
console.log('Menu Global:', window.navigationService?.getGlobalMenu());
console.log('Menu Evento:', window.navigationService?.getEventMenu());

// Verificar role atual
console.log('Role:', window.navigationService?.currentRole);
console.log('User:', window.navigationService?.currentUser);
```

**Soluções:**

#### A) Verificar ordem de scripts
```html
<!-- ORDEM CORRETA -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="supabase.js" defer></script>
<script src="auth-client.js" defer></script>
<script src="auth-helper.js" defer></script>

<!-- Sistema de Navegação -->
<script src="navigation-config.js?v=2025102601" defer></script>
<script src="navigation-service.js?v=2025102601" defer></script>
<script src="navigation-component.js?v=2025102601" defer></script>
<script src="navigation-init.js?v=2025102601" defer></script>
```

#### B) Aguardar inicialização correta
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar navegação
    await new Promise(resolve => {
        if (window.NavigationUtils) {
            resolve();
        } else {
            window.addEventListener('navigationReady', resolve);
        }
    });
    
    console.log('✅ Navegação pronta!');
    // Continuar com lógica da página...
});
```

#### C) Verificar erros de autenticação
```javascript
// A navegação depende do AuthClient
if (!window.authSystem?.currentUser) {
    console.error('❌ AuthSystem não inicializado');
}

if (!window.navigationService?.currentRole) {
    console.error('❌ Role não detectado');
}
```

### Problema 3: API Retorna 0 Eventos

**Sintomas:**
- Mensagem "Nenhum evento encontrado"
- API retorna `{ success: true, events: [] }`
- Logs mostram "0 evento(s) carregado(s)"

**Diagnóstico:**
```javascript
// Verificar response completo
const response = await fetch('/api/events/list', { credentials: 'include' });
const data = await response.json();
console.log('Response completo:', data);

// Verificar role e escopo
console.log('Role:', window.navigationService?.currentRole);
console.log('Escopo:', window.navigationService?.getEventDataScope());

// Verificar sessão
console.log('User:', window.authSystem?.currentUser);
```

**Soluções:**

#### A) Verificar se há eventos na base de dados
```sql
-- No Supabase SQL Editor
SELECT COUNT(*) FROM events;
SELECT * FROM events LIMIT 5;
```

#### B) Verificar RLS (Row Level Security)
```sql
-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'events';

-- Testar query manual
SELECT * FROM events WHERE is_active = true;
```

#### C) Verificar organizer_id (para Moderators)
Se o role é `moderator` ou `event_manager`, a API filtra por `organizer_id`:
```sql
-- Verificar se eventos têm organizer_id correto
SELECT id, name, organizer_id 
FROM events 
WHERE organizer_id = 'SEU-USER-ID';
```

#### D) Desativar temporariamente RLS para teste
```sql
-- ⚠️ APENAS PARA DEBUG! Reativar depois!
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Query de teste
SELECT * FROM events;

-- REATIVAR
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

#### E) Criar evento de teste
```sql
INSERT INTO events (name, event_date, location, is_active, organizer_id)
VALUES (
    'Evento de Teste',
    CURRENT_DATE,
    'Teste',
    true,
    (SELECT id FROM auth.users WHERE email = 'SEU-EMAIL')
);
```

### Problema 4: Contexto de Evento Não Funciona

**Sintomas:**
- Menu de evento não aparece
- URL tem `?event=123` mas menu continua global
- Botão "Voltar" não aparece

**Diagnóstico:**
```javascript
// Verificar contexto
console.log('Contexto:', NavigationUtils.getCurrentEvent());

// Verificar URL
const params = new URLSearchParams(window.location.search);
console.log('EventId da URL:', params.get('event'));

// Verificar se menu de evento foi gerado
console.log('Menu Evento:', window.navigationService?.getEventMenu());
```

**Soluções:**

#### A) Atualizar contexto manualmente
```javascript
// Em páginas de evento, após autenticação:
const eventId = new URLSearchParams(location.search).get('event');
if (eventId && window.navigationService) {
    window.navigationService.setEventContext(eventId, 'Nome do Evento');
}
```

#### B) Navegar para evento usando utility
```javascript
// Forma correta de navegar para evento
NavigationUtils.goToEvent('event-123', 'Nome do Evento');

// NÃO fazer:
window.location.href = 'config-kromi.html?event=123'; // ❌ Perde contexto
```

#### C) Verificar página requer evento
```javascript
// Adicionar verificação em páginas de evento
const eventId = new URLSearchParams(location.search).get('event');
if (!eventId) {
    alert('Selecione um evento primeiro');
    location.href = 'events-kromi.html';
}
```

### Problema 5: Permissões Incorretas

**Sintomas:**
- Admin vê itens que não deveria
- Moderator vê itens de admin
- User não vê itens permitidos

**Diagnóstico:**
```javascript
// Verificar role detectado
console.log('Role atual:', window.navigationService?.currentRole);

// Verificar menu gerado
const menu = window.navigationService?.getGlobalMenu();
console.log('Itens visíveis:', menu.map(i => i.id));

// Verificar permissões de item específico
const item = window.NavigationConfig.getMenuItem('users');
console.log('Item:', item);
console.log('Tem acesso:', window.NavigationConfig.hasAccess(item, 'moderator'));
```

**Soluções:**

#### A) Verificar role no perfil
```sql
-- Verificar perfil do utilizador
SELECT up.*, au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
WHERE au.email = 'SEU-EMAIL';
```

#### B) Corrigir role no código
Se role está incorreto, corrigir em `navigation-config.js`:
```javascript
// Verificar roleAliases
roleAliases: {
    'event_manager': 'moderator',  // event_manager = moderator
    'participant': 'user'           // participant = user
}
```

#### C) Atualizar permissões de item
Editar `navigation-config.js`:
```javascript
{
    id: 'item-id',
    roles: ['admin', 'moderator'],  // Adicionar/remover roles aqui
}
```

### Problema 6: Scripts Não Carregam

**Sintomas:**
- Erros 404 no console
- `navigation-config.js` não encontrado
- Variáveis `window.NavigationConfig` undefined

**Soluções:**

#### A) Verificar caminhos relativos
```html
<!-- Se página está em raiz -->
<script src="navigation-config.js"></script>

<!-- Se página está em subpasta -->
<script src="../navigation-config.js"></script>

<!-- Caminho absoluto (sempre funciona) -->
<script src="/navigation-config.js"></script>
```

#### B) Verificar ficheiros existem
```bash
# No terminal/PowerShell
ls navigation-*.js
ls navigation-*.css
```

#### C) Verificar servidor serve ficheiros
Abrir diretamente no browser:
```
https://192.168.1.219:1144/navigation-config.js
```

Se retornar 404, ficheiro não está no local correto.

## 🔍 Comandos de Debug Úteis

### Console do Browser

```javascript
// Estado completo do sistema
console.log({
    config: window.NavigationConfig,
    service: window.navigationService,
    component: window.navigationComponent,
    utils: window.NavigationUtils,
    auth: window.authSystem,
    supabase: window.supabaseClient
});

// Menu atual
console.table(window.navigationService?.getGlobalMenu());

// Contexto de evento
console.log('Evento:', NavigationUtils.getCurrentEvent());

// Role e user
console.log('Role:', window.navigationService?.currentRole);
console.log('User:', window.navigationService?.currentUser?.email);
```

### SQL Úteis

```sql
-- Ver todos os eventos
SELECT * FROM events;

-- Ver eventos de um organizador
SELECT * FROM events WHERE organizer_id = 'USER-ID';

-- Ver perfis de utilizadores
SELECT * FROM user_profiles;

-- Ver políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'events';

-- Contar eventos
SELECT COUNT(*) as total FROM events;
SELECT COUNT(*) as ativos FROM events WHERE is_active = true;
```

## 📋 Checklist de Verificação

Ao migrar nova página, verificar:

- [ ] CSS incluído na ordem correta
- [ ] Scripts de navegação incluídos com `defer`
- [ ] Sidebar vazia: `<div class="sidebar" id="sidebar"></div>`
- [ ] Aguarda `navigationReady` antes de inicializar
- [ ] Não duplica estilos de sidebar no `<style>` inline
- [ ] Verifica autenticação antes de carregar dados
- [ ] Atualiza contexto de evento se aplicável
- [ ] Remove event listeners de sidebar/menu antigos
- [ ] Testa com diferentes roles (admin, moderator, user)
- [ ] Testa com e sem contexto de evento
- [ ] Força recarregamento de cache (Ctrl+F5)

## 🆘 Se Nada Funcionar

1. **Hard Reset de Cache**
   - Ctrl + Shift + Delete (limpar cache)
   - Fechar e reabrir browser
   
2. **Verificar ordem de carregamento**
   - Abrir DevTools → Network
   - Recarregar página
   - Verificar se todos os scripts carregam (200 OK)
   
3. **Restaurar versão anterior**
   ```bash
   git checkout HEAD~1 events-kromi.html
   ```
   
4. **Comparar com página funcional**
   - Abrir `index-kromi.html` (funcional)
   - Comparar estrutura com página problemática
   
5. **Usar página de exemplo**
   - Copiar estrutura de `NAVIGATION-INTEGRATION-EXAMPLE.html`
   - Adaptar com conteúdo da página

## 📞 Suporte

Consultar documentação completa:
- `NAVIGATION-README.md`
- `MIGRATION-GUIDE.md`
- `IMPLEMENTATION-COMPLETE.md`

---

**Versão:** 2025.10.26  
**Status:** Documento de Troubleshooting

