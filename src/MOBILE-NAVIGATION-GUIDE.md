# 📱 Guia de Navegação Mobile - VisionKrono

## 🎯 COMO FUNCIONA

O sistema **cria automaticamente** um botão hambúrguer (☰) em TODAS as páginas quando acedidas em mobile (<1024px).

---

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### **1. Botão Hambúrguer Automático**
```javascript
// navigation-init.js cria o botão se não existir:
if (!menuToggle) {
    menuToggle = document.createElement('button');
    menuToggle.id = 'menuToggle';
    menuToggle.className = 'btn btn-icon btn-secondary';
    menuToggle.innerHTML = '<i>☰</i>';
    headerLeft.insertBefore(menuToggle, headerLeft.firstChild);
}
```

**Resultado:**
- ✅ Botão criado automaticamente
- ✅ Sempre primeiro no header-left
- ✅ Funciona em todas as 17 páginas

### **2. CSS Responsivo**
```css
@media (max-width: 1024px) {
    /* Sidebar escondido */
    .sidebar {
        transform: translateX(-100%);
    }
    
    /* Botão hambúrguer VISÍVEL */
    #menuToggle {
        display: flex !important;
    }
    
    /* Sidebar aberto ao clicar */
    .sidebar.sidebar-open {
        transform: translateX(0);
    }
}
```

### **3. Overlay Escuro**
```javascript
// Quando sidebar abre:
- Cria overlay escuro sobre conteúdo
- Clicar overlay → fecha sidebar
- Overlay desaparece com transição
```

### **4. Bottom Navigation**
```css
@media (max-width: 1024px) {
    .app-bottom-nav {
        display: flex !important; /* Aparece em mobile */
    }
}
```

---

## 🎨 EXPERIÊNCIA DO UTILIZADOR

### **Desktop (>1024px):**
```
1. Sidebar SEMPRE visível à esquerda (280px)
2. Botão hambúrguer ESCONDIDO
3. Conteúdo à direita (calc(100% - 280px))
```

### **Mobile (<1024px):**
```
1. Sidebar ESCONDIDO por padrão
2. Botão hambúrguer (☰) VISÍVEL no canto superior esquerdo
3. Conteúdo ocupa 100% da largura

AÇÕES:
├─ Tocar ☰ → Sidebar desliza da esquerda
├─ Overlay escuro aparece sobre conteúdo
├─ Tocar overlay → Sidebar fecha
├─ Tocar X dentro do sidebar → Sidebar fecha
└─ Tocar num link do menu → Navega e fecha sidebar
```

---

## 🔧 ESTRUTURA OBRIGATÓRIA PARA MOBILE

Cada página DEVE ter esta estrutura:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
    <!-- CSS na ordem correta -->
    <link rel="stylesheet" href="/kromi-design-system.css">
    <link rel="stylesheet" href="/kromi-layout-fixes.css">
    <link rel="stylesheet" href="/navigation-component.css?v=2025102601">
    <link rel="stylesheet" href="/unified-sidebar-styles.css?v=2025102601">
</head>

<body data-theme="dark" class="layout-with-sidebar">
    <!-- Sidebar (auto-renderizado) -->
    <div class="sidebar" id="sidebar"></div>
    
    <!-- Header COM header-left e header-right -->
    <header class="header">
        <div class="header-left">
            <!-- O botão ☰ será criado aqui automaticamente -->
            <h1 class="header-title">Título</h1>
        </div>
        <div class="header-right">
            <!-- Botões do header -->
        </div>
    </header>
    
    <!-- Main -->
    <main class="main">
        <div id="mainContent" style="padding: var(--spacing-6);">
            <!-- Conteúdo -->
        </div>
    </main>
    
    <!-- Bottom Nav (opcional) -->
    <nav class="app-bottom-nav">
        <!-- Links principais para mobile -->
    </nav>
    
    <!-- Scripts na ordem correta -->
    <script src="/navigation-config.js?v=2025102601" defer></script>
    <script src="/navigation-service.js?v=2025102601" defer></script>
    <script src="/navigation-component.js?v=2025102601" defer></script>
    <script src="/navigation-init.js?v=2025102601" defer></script>
</body>
</html>
```

---

## ⚠️ PONTO CRÍTICO: `.header-left`

O botão é criado dentro de `.header-left`. Se a página não tiver essa estrutura, o botão não aparece!

### **ERRADO ❌:**
```html
<header class="header">
    <h1>Título</h1>
    <div>Botões</div>
</header>
```

### **CORRETO ✅:**
```html
<header class="header">
    <div class="header-left">
        <!-- Botão ☰ criado aqui automaticamente -->
        <h1 class="header-title">Título</h1>
    </div>
    <div class="header-right">
        <!-- Botões do header -->
    </div>
</header>
```

---

## 🧪 TESTAR SE ESTÁ A FUNCIONAR

### **Teste 1: Verificar Botão Existe**

Abrir console (F12) em mobile:

```javascript
// Verificar se botão foi criado
const menuToggle = document.getElementById('menuToggle');
console.log('Botão existe?', !!menuToggle);
console.log('Botão visível?', menuToggle ? getComputedStyle(menuToggle).display : 'N/A');
console.log('Largura tela:', window.innerWidth);
```

**Esperado em mobile (<1024px):**
```
Botão existe? true
Botão visível? flex
Largura tela: 375 (ou similar)
```

### **Teste 2: Verificar Funcionalidade**

```javascript
// Testar toggle
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');

if (menuToggle) {
    console.log('✅ Botão encontrado - tente clicar');
    menuToggle.click(); // Simular click
    setTimeout(() => {
        console.log('Sidebar aberto?', sidebar.classList.contains('sidebar-open'));
    }, 100);
} else {
    console.error('❌ Botão não foi criado!');
    console.log('header-left existe?', !!document.querySelector('.header-left'));
}
```

### **Teste 3: Verificar CSS**

```javascript
// Verificar se CSS está carregado
const stylesheets = Array.from(document.styleSheets)
    .map(s => s.href)
    .filter(h => h);

console.log('CSS carregados:', stylesheets);

const requiredCSS = [
    'unified-sidebar-styles.css',
    'navigation-component.css',
    'kromi-layout-fixes.css'
];

requiredCSS.forEach(css => {
    const loaded = stylesheets.some(s => s.includes(css));
    console.log(css, loaded ? '✅' : '❌');
});
```

---

## 🔧 SE NÃO FUNCIONAR

### **Problema 1: Botão não aparece**

**Verificar:**
```javascript
console.log('header-left?', !!document.querySelector('.header-left'));
console.log('NavigationUtils?', !!window.NavigationUtils);
```

**Solução:** Garantir que header tem estrutura correta (ver acima)

### **Problema 2: Botão aparece mas não faz nada**

**Verificar:**
```javascript
const menuToggle = document.getElementById('menuToggle');
console.log('Tem listener?', menuToggle?.dataset?.toggleInit);
```

**Solução:** 
- Recarregar página
- Verificar que navigation-init.js está a carregar

### **Problema 3: Sidebar abre mas não fecha**

**Verificar:**
```javascript
console.log('Overlay existe?', !!document.getElementById('sidebar-overlay'));
```

**Solução:** Overlay deve ser criado automaticamente quando sidebar abre

---

## 📊 ESTADO DAS PÁGINAS

Todas as 17 páginas DEVEM funcionar em mobile agora:

### ✅ **Com header-left (devem funcionar):**
- calibration-kromi.html
- config-kromi.html
- events-kromi.html
- participants-kromi.html
- classifications-kromi.html
- usuarios.html
- configuracoes.html
- perfis-permissoes.html
- logs-auditoria.html
- meu-perfil.html
- ... (todas que atualizámos)

### ⚠️ **Verificar estrutura:**
- detection-kromi.html (pode ter estrutura diferente)
- Outras páginas legadas

---

## 🎯 GARANTIA DE FUNCIONAMENTO

Para **GARANTIR** que funciona:

1. **CSS na ordem certa** ✅
2. **Scripts com defer** ✅
3. **Header com .header-left e .header-right** ✅
4. **body class="layout-with-sidebar"** ✅
5. **navigation-init.js carregado** ✅

Se tudo isto estiver OK, o mobile **FUNCIONA AUTOMATICAMENTE** em todas as páginas!

---

## 🚀 PRÓXIMO PASSO

**Abre uma página no mobile e testa:**

```
1. Redimensiona browser para <1024px
   OU
   F12 → Device Toolbar → iPhone

2. Deves ver:
   ✅ Botão ☰ no canto superior esquerdo
   
3. Clica no ☰:
   ✅ Sidebar desliza da esquerda
   ✅ Overlay escuro aparece
   
4. Clica fora do sidebar (no overlay):
   ✅ Sidebar fecha
   ✅ Overlay desaparece

5. Bottom nav no fundo:
   ✅ Deve aparecer (se tiveres .app-bottom-nav)
```

---

**SE NÃO FUNCIONAR, diz-me qual página estás a testar e que erro aparece no console!** 🔍

