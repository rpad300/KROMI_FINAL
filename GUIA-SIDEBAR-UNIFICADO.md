# 🎨 Guia do Sidebar Unificado - VisionKrono

## 📋 Objetivo

Garantir que **todas as páginas** tenham o **mesmo sidebar** com aparência consistente baseada no `index-kromi.html`.

---

## 🏗️ Arquitetura do Sistema de Navegação

### **Ficheiros Necessários (em TODAS as páginas)**

#### **1. CSS**
```html
<head>
    <!-- KROMI Design System -->
    <link rel="stylesheet" href="kromi-design-system.css">
    <link rel="stylesheet" href="kromi-layout-fixes.css">
    
    <!-- Sistema de Navegação Unificado -->
    <link rel="stylesheet" href="navigation-component.css?v=2025102601">
    <link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
</head>
```

#### **2. JavaScript**
```html
<!-- Antes do </body> -->
<body>
    <!-- Autenticação (ORDEM IMPORTANTE) -->
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="supabase.js?v=2025102605" defer></script>
    <script src="auth-client.js?v=2025102616" defer></script>
    <script src="auth-helper.js?v=2025102620" defer></script>
    
    <!-- Sistema de Navegação Unificado -->
    <script src="navigation-config.js?v=2025102601" defer></script>
    <script src="navigation-service.js?v=2025102601" defer></script>
    <script src="navigation-component.js?v=2025102601" defer></script>
    <script src="navigation-init.js?v=2025102601" defer></script>
    
    <!-- Proteção de Rotas -->
    <script src="universal-route-protection.js?v=2025102618" defer></script>
</body>
```

---

## 🎯 Estrutura HTML Padrão

### **Todas as páginas devem seguir esta estrutura:**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#fc6b03">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    
    <title>VisionKrono - Título da Página</title>
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- KROMI Design System -->
    <link rel="stylesheet" href="kromi-design-system.css">
    <link rel="stylesheet" href="kromi-layout-fixes.css">
    
    <!-- Sistema de Navegação Unificado -->
    <link rel="stylesheet" href="navigation-component.css?v=2025102601">
    <link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
    
    <!-- Estilos específicos da página (se necessário) -->
    <style>
        /* Estilos específicos desta página */
    </style>
</head>

<body data-theme="dark" class="layout-with-sidebar">
    <!-- Sidebar (renderizada automaticamente pelo NavigationComponent) -->
    <div class="sidebar" id="sidebar"></div>
    
    <!-- Header -->
    <header class="header">
        <div class="header-left">
            <h1 class="header-title" id="pageTitle">Título da Página</h1>
        </div>
        <div class="header-right">
            <!-- Conteúdo do header -->
        </div>
    </header>
    
    <!-- Main Content -->
    <main class="main">
        <div id="mainContent">
            <!-- Conteúdo da página -->
        </div>
    </main>
    
    <!-- Bottom Navigation (Mobile) -->
    <nav class="app-bottom-nav">
        <!-- Renderizado automaticamente -->
    </nav>
    
    <!-- Scripts -->
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="supabase.js?v=2025102605" defer></script>
    <script src="auth-client.js?v=2025102616" defer></script>
    <script src="auth-helper.js?v=2025102620" defer></script>
    
    <!-- Sistema de Navegação Unificado -->
    <script src="navigation-config.js?v=2025102601" defer></script>
    <script src="navigation-service.js?v=2025102601" defer></script>
    <script src="navigation-component.js?v=2025102601" defer></script>
    <script src="navigation-init.js?v=2025102601" defer></script>
    
    <script src="universal-route-protection.js?v=2025102618" defer></script>
    
    <!-- Scripts específicos da página -->
    <script defer>
        document.addEventListener('DOMContentLoaded', async function() {
            // Aguardar sistema de navegação estar pronto
            await waitForNavigation();
            
            // Código específico da página aqui
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

## ✅ Checklist de Verificação

Para cada página da aplicação, verificar:

### **1. HTML**
- [ ] `<div class="sidebar" id="sidebar"></div>` presente
- [ ] `<body class="layout-with-sidebar">`
- [ ] Header com estrutura correta
- [ ] Main com `id="mainContent"`

### **2. CSS**
- [ ] `kromi-design-system.css` incluído
- [ ] `kromi-layout-fixes.css` incluído
- [ ] `navigation-component.css` incluído
- [ ] `unified-sidebar-styles.css` incluído (NOVO)

### **3. JavaScript**
- [ ] Scripts de autenticação na ordem correta
- [ ] Scripts de navegação na ordem correta
- [ ] Todos os scripts com `defer`
- [ ] `waitForNavigation()` implementado

### **4. Funcionalidade**
- [ ] Sidebar renderiza automaticamente
- [ ] Menu ativo destaca a página atual
- [ ] Mobile: hamburger menu funciona
- [ ] Bottom nav aparece no mobile
- [ ] Logout funciona

---

## 🔧 Como Atualizar Uma Página Existente

### **Passo 1: Atualizar o `<head>`**

```html
<!-- Adicionar ANTES dos estilos da página -->
<link rel="stylesheet" href="navigation-component.css?v=2025102601">
<link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
```

### **Passo 2: Atualizar o `<body>`**

```html
<!-- REMOVER sidebar antigo e substituir por: -->
<div class="sidebar" id="sidebar"></div>
```

### **Passo 3: Atualizar os Scripts**

```html
<!-- ADICIONAR antes do </body>, na ordem: -->
<script src="navigation-config.js?v=2025102601" defer></script>
<script src="navigation-service.js?v=2025102601" defer></script>
<script src="navigation-component.js?v=2025102601" defer></script>
<script src="navigation-init.js?v=2025102601" defer></script>
```

### **Passo 4: Remover Estilos Inline do Sidebar**

```html
<!-- REMOVER blocos <style> que contenham: -->
- .sidebar-header
- .sidebar-title
- .nav-list
- .nav-link
- .sidebar-footer
- .btn-logout

<!-- Estes estilos agora estão em unified-sidebar-styles.css -->
```

### **Passo 5: Atualizar Inicialização JavaScript**

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    // Aguardar navegação (OBRIGATÓRIO)
    await waitForNavigation();
    
    // Resto do código da página...
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
```

---

## 📝 Páginas a Atualizar

### **Lista de Páginas (todas devem seguir o padrão)**

- [x] `index-kromi.html` ✅ (Referência)
- [ ] `calibration-kromi.html` ⚠️ Precisa atualizar
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
- [ ] Outras páginas...

---

## 🎨 Aparência do Sidebar (Referência)

### **Estrutura Visual**

```
┌─────────────────────────────┐
│  🔵 VisionKrono             │ ← Header
├─────────────────────────────┤
│  🏠 Dashboard               │ ← Nav Item
│  🏃 Eventos                 │
│  👥 Participantes           │
│  🏆 Classificações          │
│  📱 Detecção                │
│  🔧 Calibração              │ ← Active (laranja)
│  ⚙️  Configurações          │
│  ...                        │
├─────────────────────────────┤
│  🚪 Terminar Sessão         │ ← Footer (vermelho)
└─────────────────────────────┘
```

### **Cores**

- **Background:** `var(--bg-secondary)`
- **Link Normal:** `var(--text-secondary)`
- **Link Hover:** `rgba(252, 107, 3, 0.1)` background + `var(--primary)` text
- **Link Ativo:** `var(--primary)` background + `var(--text-dark)` text
- **Logout:** `var(--danger)` background

---

## 🐛 Troubleshooting

### **Sidebar não aparece**
```javascript
// Verificar se NavigationComponent está carregado
console.log('NavigationComponent:', window.NavigationComponent);
console.log('NavigationUtils:', window.NavigationUtils);

// Verificar elemento
console.log('Sidebar element:', document.getElementById('sidebar'));
```

### **Sidebar aparece mas sem estilos**
```html
<!-- Verificar se todos os CSS estão carregados -->
<link rel="stylesheet" href="kromi-design-system.css">
<link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
```

### **Menu ativo não destaca**
```javascript
// O NavigationComponent detecta automaticamente pela URL
// Verificar se a página está registrada em navigation-config.js
```

### **Mobile: sidebar não abre**
```javascript
// Verificar se kromi-sidebar-toggle.js está carregado
// OU se NavigationComponent está a gerir o toggle
```

---

## 📦 Ficheiros do Sistema

### **Hierarquia de Estilos**

1. `kromi-design-system.css` - Variáveis e base
2. `kromi-layout-fixes.css` - Ajustes de layout
3. `navigation-component.css` - Layout da navegação
4. `unified-sidebar-styles.css` - **Estilos do sidebar (NOVO)**

### **Hierarquia de Scripts**

1. `supabase.js` - Cliente Supabase
2. `auth-client.js` - Autenticação
3. `auth-helper.js` - Helpers de auth
4. `navigation-config.js` - Configuração dos menus
5. `navigation-service.js` - Serviços de navegação
6. `navigation-component.js` - Componente principal
7. `navigation-init.js` - Inicialização
8. `universal-route-protection.js` - Proteção de rotas

---

## 🚀 Próximos Passos

1. ✅ Criar `unified-sidebar-styles.css`
2. ⬜ Atualizar `calibration-kromi.html`
3. ⬜ Atualizar restantes páginas
4. ⬜ Testar em todas as páginas
5. ⬜ Verificar responsive (mobile)
6. ⬜ Documentar mudanças

---

**Última atualização:** 2025-10-27  
**Versão:** 1.0  
**Baseado em:** index-kromi.html

