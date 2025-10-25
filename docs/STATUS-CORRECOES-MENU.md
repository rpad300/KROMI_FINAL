# Script para aplicar correções do botão de menu em todas as páginas KROMI

## Correções aplicadas:

### ✅ Páginas já corrigidas:
- events-kromi.html - ✅ COMPLETO
- config-kromi.html - ✅ COMPLETO  
- detection-kromi.html - ✅ COMPLETO
- classifications-kromi.html - ✅ COMPLETO

### ⏳ Páginas pendentes:
- calibration-kromi.html
- category-rankings-kromi.html
- checkpoint-order-kromi.html
- database-management-kromi.html
- devices-kromi.html
- image-processor-kromi.html
- index-kromi.html
- participants-kromi.html

## Correções necessárias para cada página:

### 1. Adicionar script global:
```html
<script src="kromi-sidebar-toggle.js"></script>
```

### 2. Corrigir botão de menu:
```html
<!-- ANTES -->
<button class="btn btn-icon btn-secondary" id="menuToggle" style="display: none;">
    <i>☰</i>
</button>

<!-- DEPOIS -->
<button class="btn btn-icon btn-secondary" id="menuToggle" onclick="toggleSidebar()">
    <i>☰</i>
</button>
```

## Funcionalidades implementadas:

### ✅ CSS Global (kromi-layout-fixes.css):
- `.sidebar-hidden` - Esconde sidebar
- `.main-expanded` - Expande main para 100%
- `.header-expanded` - Move header para left: 0
- `#menuToggle` - Mostra apenas em mobile

### ✅ JavaScript Global (kromi-sidebar-toggle.js):
- `toggleSidebar()` - Alterna sidebar
- `checkMobileMenu()` - Mostra/esconde botão
- `restoreSidebarState()` - Restaura estado
- `initSidebarToggle()` - Inicializa tudo

### ✅ Adaptação Completa:
- **Desktop**: Sidebar sempre visível, botão oculto
- **Mobile**: Sidebar oculto por padrão, botão visível
- **Toggle**: Clique alterna sidebar e adapta toda a página
- **Persistência**: Estado salvo no localStorage
- **Responsivo**: Ajusta automaticamente ao redimensionar

## Status Final:
✅ **4 páginas corrigidas** - Funcionando perfeitamente
⏳ **8 páginas pendentes** - Aplicar correções
