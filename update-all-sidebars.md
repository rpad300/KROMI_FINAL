# 🔄 Atualizar Todas as Páginas para Sidebar Unificado

## 📋 Lista de Páginas a Atualizar

### **Páginas KROMI (Prioridade Alta)**
- [x] `index-kromi.html` ✅ (Referência)
- [x] `calibration-kromi.html` ✅ (Atualizado)
- [ ] `config-kromi.html`
- [ ] `events-kromi.html`
- [ ] `participants-kromi.html`
- [ ] `classifications-kromi.html`
- [ ] `detection-kromi.html`
- [ ] `checkpoint-order-kromi.html`
- [ ] `category-rankings-kromi.html`
- [ ] `image-processor-kromi.html`
- [ ] `database-management-kromi.html`
- [ ] `platform-config-kromi.html`

### **Páginas Legadas (Prioridade Baixa)**
- [ ] `index.html`
- [ ] `events.html`
- [ ] `participants.html`
- [ ] `classifications.html`
- [ ] Outras...

---

## 🔧 Passos para Cada Página

### **PASSO 1: Atualizar CSS no `<head>`**

Adicionar ANTES de `</head>`:

```html
<!-- Sistema de Navegação Unificado -->
<link rel="stylesheet" href="navigation-component.css?v=2025102601">
<link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
```

### **PASSO 2: Atualizar HTML do Sidebar**

**Encontrar:**
```html
<nav class="sidebar" id="sidebar">
    <!-- ... conteúdo manual ... -->
</nav>
```

**Substituir por:**
```html
<!-- Sidebar (renderizada automaticamente pelo NavigationComponent) -->
<div class="sidebar" id="sidebar"></div>
```

### **PASSO 3: Atualizar `<body>`**

Garantir que tem:
```html
<body data-theme="dark" class="layout-with-sidebar">
```

### **PASSO 4: Atualizar Scripts ANTES de `</body>`**

**Adicionar Sistema de Navegação:**

```html
<!-- Sistema de Navegação Unificado -->
<script src="navigation-config.js?v=2025102601" defer></script>
<script src="navigation-service.js?v=2025102601" defer></script>
<script src="navigation-component.js?v=2025102601" defer></script>
<script src="navigation-init.js?v=2025102601" defer></script>
```

**Remover:**
```html
<!-- REMOVER se existir -->
<script src="navigation.js"></script>
<script src="kromi-sidebar-toggle.js"></script>
```

### **PASSO 5: Atualizar JavaScript de Inicialização**

**Adicionar no topo do `DOMContentLoaded`:**

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1) Aguardar navegação estar pronta
        await waitForNavigation();
        
        // 2) Resto do código...
        
    } catch (error) {
        console.error('[PAGINA] Erro na inicialização:', error);
    }
});

// Aguardar navegação estar pronta
async function waitForNavigation() {
    return new Promise((resolve) => {
        if (window.NavigationUtils) {
            resolve();
        } else {
            window.addEventListener('navigationReady', resolve);
        }
    });
}
```

**Remover:**
```javascript
// REMOVER código de toggle manual do sidebar
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-open');
});

// REMOVER chamadas a window.Navigation.init()
if (window.Navigation) {
    window.Navigation.init('pagina', eventId);
}
```

### **PASSO 6: Remover Estilos Inline Duplicados**

**Procurar e remover blocos `<style>` que contenham:**

```css
/* REMOVER se existir (já está em unified-sidebar-styles.css) */
.sidebar-header { ... }
.sidebar-title { ... }
.nav-list { ... }
.nav-link { ... }
.sidebar-footer { ... }
.btn-logout { ... }

/* Layout adaptations - PODE REMOVER SE DUPLICADO */
.layout-with-sidebar { ... }
.sidebar { ... }
.main { ... }
```

**MANTER apenas:**
- Estilos específicos da página
- Componentes únicos dessa página

---

## ✅ Checklist de Verificação (Após Atualizar)

Para cada página atualizada, verificar:

- [ ] CSS do NavigationComponent incluído
- [ ] Sidebar é `<div class="sidebar" id="sidebar"></div>`
- [ ] Scripts do NavigationComponent incluídos
- [ ] `waitForNavigation()` implementado
- [ ] Código de toggle manual removido
- [ ] Estilos duplicados removidos
- [ ] Página carrega sem erros
- [ ] Sidebar aparece corretamente
- [ ] Menu ativo destaca página atual
- [ ] Mobile: hamburger funciona
- [ ] Logout funciona

---

## 🧪 Como Testar Cada Página

### **1. Abrir a página no browser**
```
http://localhost/pagina-kromi.html
```

### **2. Abrir DevTools (F12)**
```javascript
// Console deve mostrar:
✅ NavigationComponent inicializado
✅ Sidebar renderizado
✅ Menu 'pagina' marcado como ativo
```

### **3. Verificar Visualmente**

- ✅ Sidebar aparece à esquerda
- ✅ Menu atual destacado em laranja
- ✅ Hover nos menus funciona (fundo laranja claro)
- ✅ Botão logout vermelho no fundo

### **4. Testar Mobile**

- Redimensionar janela < 1024px
- ✅ Sidebar esconde automaticamente
- ✅ Hamburger menu aparece
- ✅ Clicar hamburger abre sidebar
- ✅ Bottom nav aparece

---

## 🚀 Automatização (Opcional)

Se quiseres automatizar a atualização de várias páginas:

```bash
# Lista de páginas a atualizar
config-kromi.html
events-kromi.html
participants-kromi.html
classifications-kromi.html
detection-kromi.html
checkpoint-order-kromi.html
category-rankings-kromi.html
```

Para cada uma, seguir os 6 passos acima.

---

## 📝 Template de Referência

Usa `index-kromi.html` ou `calibration-kromi.html` como referência:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#fc6b03">
    <title>VisionKrono - Título</title>
    
    <!-- KROMI Design System -->
    <link rel="stylesheet" href="kromi-design-system.css">
    <link rel="stylesheet" href="kromi-layout-fixes.css">
    
    <!-- Sistema de Navegação Unificado -->
    <link rel="stylesheet" href="navigation-component.css?v=2025102601">
    <link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
</head>

<body data-theme="dark" class="layout-with-sidebar">
    <!-- Sidebar -->
    <div class="sidebar" id="sidebar"></div>
    
    <!-- Header -->
    <header class="header">
        <div class="header-left">
            <h1 class="header-title">Título</h1>
        </div>
        <div class="header-right">
            <!-- Botões do header -->
        </div>
    </header>
    
    <!-- Main -->
    <main class="main">
        <div id="mainContent">
            <!-- Conteúdo -->
        </div>
    </main>
    
    <!-- Scripts -->
    <script src="https://unpkg.com/@supabase/supabase-js@2" defer></script>
    <script src="supabase.js?v=2025102605" defer></script>
    <script src="auth-client.js?v=2025102616" defer></script>
    <script src="auth-helper.js?v=2025102620" defer></script>
    
    <script src="navigation-config.js?v=2025102601" defer></script>
    <script src="navigation-service.js?v=2025102601" defer></script>
    <script src="navigation-component.js?v=2025102601" defer></script>
    <script src="navigation-init.js?v=2025102601" defer></script>
    
    <script src="universal-route-protection.js?v=2025102618" defer></script>
    
    <script defer>
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                await waitForNavigation();
                // ... código da página
            } catch (error) {
                console.error('[PAGINA] Erro:', error);
            }
        });
        
        async function waitForNavigation() {
            return new Promise((resolve) => {
                if (window.NavigationUtils) {
                    resolve();
                } else {
                    window.addEventListener('navigationReady', resolve);
                }
            });
        }
    </script>
</body>
</html>
```

---

**Próxima página a atualizar:** `config-kromi.html`

