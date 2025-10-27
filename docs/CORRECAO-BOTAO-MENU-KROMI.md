# Script para corrigir botão de menu em todas as páginas KROMI

## Correções necessárias:

### 1. HTML - Botão de menu:
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

### 2. CSS - Funcionalidade de toggle:
```css
/* Sidebar toggle functionality */
.sidebar-hidden {
    transform: translateX(-100%) !important;
}

.main-expanded {
    margin-left: 0 !important;
    width: 100% !important;
}

.header-expanded {
    left: 0 !important;
}

/* Mobile menu button */
#menuToggle {
    display: none;
}

@media (max-width: 768px) {
    #menuToggle {
        display: flex !important;
    }
}
```

### 3. JavaScript - Funções de toggle:
```javascript
// Função para alternar sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    const header = document.querySelector('.header');
    
    if (sidebar && main && header) {
        sidebar.classList.toggle('sidebar-hidden');
        main.classList.toggle('main-expanded');
        header.classList.toggle('header-expanded');
        
        console.log('🔄 Sidebar alternado:', sidebar.classList.contains('sidebar-hidden') ? 'Oculto' : 'Visível');
    }
}

// Verificar se é mobile e mostrar botão de menu
function checkMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && window.innerWidth <= 768) {
        menuToggle.style.display = 'flex';
    } else if (menuToggle) {
        menuToggle.style.display = 'none';
    }
}

// Event listener para redimensionamento
window.addEventListener('resize', checkMobileMenu);
```

### 4. JavaScript - Inicialização:
```javascript
// No DOMContentLoaded, adicionar:
// Check mobile menu visibility
checkMobileMenu();
```

## Páginas que precisam ser corrigidas:
- calibration-kromi.html
- category-rankings-kromi.html
- checkpoint-order-kromi.html
- classifications-kromi.html
- database-management-kromi.html
- detection-kromi.html
- devices-kromi.html
- image-processor-kromi.html
- index-kromi.html
- participants-kromi.html

## Status:
✅ events-kromi.html - CORRIGIDO
✅ config-kromi.html - CORRIGIDO
⏳ Outras páginas - PENDENTE


