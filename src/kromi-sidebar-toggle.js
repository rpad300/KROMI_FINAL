/**
 * ==========================================
 * KROMI SIDEBAR TOGGLE - Funcionalidade Global
 * ==========================================
 * 
 * Funções para controlar o toggle do sidebar
 * em todas as páginas KROMI
 * 
 * Versão: 1.0
 * Data: 2025-01-24
 * ==========================================
 */

// Função para alternar sidebar
function toggleSidebar() {
    console.log('🔄 toggleSidebar() chamada');
    
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    const header = document.querySelector('.header');
    const body = document.querySelector('body');
    
    console.log('📋 Elementos encontrados:', {
        sidebar: !!sidebar,
        main: !!main,
        header: !!header,
        body: !!body
    });
    
    if (sidebar && main && header) {
        console.log('✅ Todos os elementos encontrados, alternando classes...');
        
        // Alternar classes no sidebar
        sidebar.classList.toggle('sidebar-hidden');
        
        // Alternar classes no main e header
        main.classList.toggle('main-expanded');
        header.classList.toggle('header-expanded');
        
        // Adicionar/remover classe no body para controle global
        if (body) {
            body.classList.toggle('sidebar-hidden');
        }
        
        // Forçar aplicação de estilos inline para garantir funcionamento
        const isHidden = sidebar.classList.contains('sidebar-hidden');
        if (isHidden) {
            main.style.marginLeft = '0px';
            main.style.width = '100%';
            main.style.maxWidth = '100vw';
            header.style.left = '0px';
            header.style.width = '100%';
            header.style.maxWidth = '100vw';
            header.style.right = '0px';
        } else {
            main.style.marginLeft = '280px';
            main.style.width = 'calc(100% - 280px)';
            main.style.maxWidth = 'none';
            header.style.left = '280px';
            header.style.width = 'calc(100% - 280px)';
            header.style.maxWidth = 'none';
            header.style.right = 'auto';
        }
        
        // Salvar estado no localStorage
        localStorage.setItem('kromi-sidebar-hidden', isHidden);
        
        console.log('🔄 Sidebar alternado:', isHidden ? 'Oculto' : 'Visível');
        console.log('📏 Main styles:', {
            marginLeft: main.style.marginLeft,
            width: main.style.width,
            maxWidth: main.style.maxWidth
        });
        console.log('📏 Header styles:', {
            left: header.style.left,
            width: header.style.width,
            maxWidth: header.style.maxWidth
        });
    } else {
        console.error('❌ Elementos não encontrados:', {
            sidebar: !!sidebar,
            main: !!main,
            header: !!header
        });
    }
}

// Verificar se é mobile e mostrar botão de menu
function checkMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        // Botão sempre visível agora
        menuToggle.style.display = 'flex';
    }
}

// Restaurar estado do sidebar do localStorage
function restoreSidebarState() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    const header = document.querySelector('.header');
    const body = document.querySelector('body');
    
    if (sidebar && main && header) {
        const isHidden = localStorage.getItem('kromi-sidebar-hidden') === 'true';
        
        if (isHidden) {
            sidebar.classList.add('sidebar-hidden');
            main.classList.add('main-expanded');
            header.classList.add('header-expanded');
            if (body) {
                body.classList.add('sidebar-hidden');
            }
            
            // Aplicar estilos inline para garantir funcionamento
            main.style.marginLeft = '0px';
            main.style.width = '100%';
            main.style.maxWidth = '100vw';
            header.style.left = '0px';
            header.style.width = '100%';
            header.style.maxWidth = '100vw';
            header.style.right = '0px';
            
            console.log('🔄 Estado restaurado: Sidebar oculto');
        } else {
            // Garantir que os estilos estão corretos quando sidebar está visível
            main.style.marginLeft = '280px';
            main.style.width = 'calc(100% - 280px)';
            main.style.maxWidth = 'none';
            header.style.left = '280px';
            header.style.width = 'calc(100% - 280px)';
            header.style.maxWidth = 'none';
            header.style.right = 'auto';
            
            console.log('🔄 Estado restaurado: Sidebar visível');
        }
    }
}

// Inicializar funcionalidades do sidebar
function initSidebarToggle() {
    // Verificar visibilidade do botão de menu
    checkMobileMenu();
    
    // Restaurar estado do sidebar
    restoreSidebarState();
    
    // Event listener para redimensionamento
    window.addEventListener('resize', checkMobileMenu);
    
    console.log('✅ Funcionalidades do sidebar inicializadas');
}

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarToggle);
} else {
    initSidebarToggle();
}
