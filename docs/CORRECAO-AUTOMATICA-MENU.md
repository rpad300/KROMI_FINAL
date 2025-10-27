# Correção automática do botão de menu para todas as páginas KROMI

## Instruções para aplicar as correções:

### 1. Para cada página KROMI, fazer estas substituições:

#### A. HTML - Botão de menu:
```bash
# Substituir:
style="display: none;"
# Por:
onclick="toggleSidebar()"
```

#### B. CSS - Adicionar antes do primeiro @media:
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

#### C. JavaScript - Adicionar antes do DOMContentLoaded:
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

#### D. JavaScript - Adicionar no DOMContentLoaded:
```javascript
// Check mobile menu visibility
checkMobileMenu();
```

## Status das correções:
✅ events-kromi.html - CORRIGIDO
✅ config-kromi.html - CORRIGIDO  
✅ detection-kromi.html - HTML CORRIGIDO
⏳ detection-kromi.html - CSS/JS PENDENTE
⏳ Outras páginas - PENDENTE


