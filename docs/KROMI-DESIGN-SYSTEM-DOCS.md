# 🎨 KROMI DESIGN SYSTEM - Documentação Completa

## 📋 Índice

1. [Introdução](#introdução)
2. [Instalação](#instalação)
3. [Variáveis CSS](#variáveis-css)
4. [Componentes](#componentes)
5. [Layout System](#layout-system)
6. [Temas](#temas)
7. [Responsividade](#responsividade)
8. [Exemplos de Uso](#exemplos-de-uso)

---

## 🎯 Introdução

O KROMI Design System é um sistema completo de design baseado em CSS que fornece todos os componentes, estilos e padrões necessários para construir interfaces consistentes e profissionais na plataforma KROMI.

### Características Principais:
- ✅ **100+ Componentes** prontos para uso
- ✅ **Dark/Light Mode** nativo
- ✅ **Mobile-First** approach
- ✅ **Acessibilidade** (WCAG 2.1)
- ✅ **Performance** otimizada
- ✅ **Zero dependências** externas

---

## 🚀 Instalação

### Método 1: Link Direto
```html
<link rel="stylesheet" href="kromi-design-system.css">
```

### Método 2: Import CSS
```css
@import url('kromi-design-system.css');
```

### Setup Básico HTML
```html
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KROMI App</title>
    <link rel="stylesheet" href="kromi-design-system.css">
    <!-- FontAwesome para ícones -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
</head>
<body data-theme="dark">
    <!-- Seu conteúdo aqui -->
</body>
</html>
```

---

## 🎨 Variáveis CSS

### Cores da Marca
```css
--primary: #fc6b03;          /* Laranja KROMI */
--primary-dark: #e55a02;     /* Laranja escuro */
--primary-light: #ff8534;    /* Laranja claro */
```

### Cores Semânticas
```css
--success: #10b981;    /* Verde - Sucesso */
--danger: #ef4444;     /* Vermelho - Erro */
--warning: #f59e0b;    /* Amarelo - Aviso */
--info: #3b82f6;       /* Azul - Informação */
--muted: #6b7280;      /* Cinza - Texto secundário */
--accent: #22d3ee;     /* Ciano - Destaque */
```

### Tipografia
```css
--font-size-xs: 10px;
--font-size-sm: 12px;
--font-size-base: 14px;
--font-size-lg: 16px;
--font-size-xl: 18px;
--font-size-2xl: 20px;
--font-size-3xl: 24px;
--font-size-4xl: 32px;

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Espaçamento
```css
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-base: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;    /* Círculo perfeito */
```

---

## 🧩 Componentes

### 1. Botões

#### Variantes
```html
<!-- Primary -->
<button class="btn btn-primary">
    <i class="fas fa-save"></i> Guardar
</button>

<!-- Secondary -->
<button class="btn btn-secondary">Cancelar</button>

<!-- Danger -->
<button class="btn btn-danger">Eliminar</button>

<!-- Success -->
<button class="btn btn-success">Confirmar</button>

<!-- Ghost -->
<button class="btn btn-ghost">Link</button>
```

#### Tamanhos
```html
<button class="btn btn-primary btn-sm">Pequeno</button>
<button class="btn btn-primary">Normal</button>
<button class="btn btn-primary btn-lg">Grande</button>
```

#### Icon Button
```html
<button class="icon-btn">
    <i class="fas fa-cog"></i>
</button>
```

#### Action Button
```html
<a href="#" class="action-btn">
    <i class="fas fa-camera"></i>
    <span>Câmara</span>
</a>
```

---

### 2. Formulários

#### Input Text
```html
<div class="form-group">
    <label>Nome do Evento</label>
    <input type="text" class="form-input" placeholder="Ex: Maratona Lisboa 2025">
</div>
```

#### Select
```html
<div class="form-group">
    <label>Tipo de Evento</label>
    <select class="form-select">
        <option>Corrida</option>
        <option>Ciclismo</option>
        <option>Trail</option>
    </select>
</div>
```

#### Textarea
```html
<div class="form-group">
    <label>Descrição</label>
    <textarea class="form-textarea" rows="4"></textarea>
</div>
```

#### Switch Toggle
```html
<label class="form-switch">
    <input type="checkbox">
    <span class="form-switch-slider"></span>
</label>
```

---

### 3. Cards

#### Card Básico
```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">Título do Card</h3>
        <button class="btn btn-sm btn-primary">Ação</button>
    </div>
    <div class="card-body">
        <p>Conteúdo do card aqui.</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-secondary">Cancelar</button>
        <button class="btn btn-primary">Confirmar</button>
    </div>
</div>
```

#### Compact Card
```html
<div class="compact-card">
    <h4>Métrica</h4>
    <div class="text-2xl font-bold text-primary">1,234</div>
</div>
```

#### Event Card
```html
<div class="event-card">
    <h3>Maratona Lisboa 2025</h3>
    <p>Evento de corrida na cidade de Lisboa</p>
    <div class="badge badge-active">Ativo</div>
</div>
```

---

### 4. Navegação

#### Sidebar Navigation
```html
<nav class="sidebar">
    <div class="nav-category">Menu Principal</div>
    
    <div class="nav-item active">
        <i class="fas fa-home"></i>
        <span>Dashboard</span>
    </div>
    
    <div class="nav-item">
        <i class="fas fa-calendar"></i>
        <span>Eventos</span>
    </div>
    
    <div class="nav-separator"></div>
    
    <div class="nav-category">Admin</div>
    
    <div class="nav-item">
        <i class="fas fa-users"></i>
        <span>Utilizadores</span>
    </div>
</nav>
```

#### Filter Tabs
```html
<div class="filter-tabs">
    <div class="filter-tab active">Todos</div>
    <div class="filter-tab">Ativos</div>
    <div class="filter-tab">Programados</div>
    <div class="filter-tab">Terminados</div>
</div>
```

#### Bottom Navigation (Mobile)
```html
<nav class="app-bottom-nav">
    <button class="nav-btn active">
        <i class="fas fa-home"></i>
        <span>Início</span>
    </button>
    <button class="nav-btn">
        <i class="fas fa-calendar"></i>
        <span>Eventos</span>
    </button>
    <button class="nav-btn">
        <i class="fas fa-cog"></i>
        <span>Config</span>
    </button>
</nav>
```

---

### 5. Tabelas

```html
<div class="table-container">
    <table class="data-table">
        <thead>
            <tr>
                <th>Dorsal</th>
                <th>Nome</th>
                <th>Equipa</th>
                <th>Tempo</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>101</td>
                <td>João Silva</td>
                <td>Clube A</td>
                <td>1:23:45</td>
                <td>
                    <button class="btn btn-sm btn-secondary">Ver</button>
                </td>
            </tr>
        </tbody>
    </table>
</div>
```

---

### 6. Badges & Status

```html
<!-- Status Badges -->
<span class="badge badge-active">Ativo</span>
<span class="badge badge-scheduled">Programado</span>
<span class="badge badge-finished">Terminado</span>

<!-- Semantic Badges -->
<span class="badge badge-success">Sucesso</span>
<span class="badge badge-danger">Erro</span>
<span class="badge badge-warning">Aviso</span>
<span class="badge badge-info">Info</span>

<!-- Role Badges -->
<span class="badge badge-admin">Admin</span>
<span class="badge badge-superadmin">Super Admin</span>
<span class="badge badge-user">Utilizador</span>

<!-- Status Dots -->
<span class="status-dot online"></span> Online
<span class="status-dot"></span> Offline
```

---

### 7. Statistics

#### Stats Grid
```html
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-value">1,234</div>
        <div class="stat-label">Total Eventos</div>
    </div>
    <div class="stat-card">
        <div class="stat-value">89</div>
        <div class="stat-label">Ativos</div>
    </div>
</div>
```

#### Stats Row (Compact)
```html
<div class="stats-row">
    <div class="stat-mini">
        <div class="text-lg font-bold text-primary">42</div>
        <div class="text-xs opacity-75">Câmaras</div>
    </div>
    <div class="stat-mini">
        <div class="text-lg font-bold text-success">1,247</div>
        <div class="text-xs opacity-75">Detecções</div>
    </div>
</div>
```

---

### 8. Modals

```html
<!-- Modal -->
<div class="modal" id="myModal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">Título do Modal</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p>Conteúdo do modal aqui.</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary">Confirmar</button>
        </div>
    </div>
</div>

<script>
function openModal() {
    document.getElementById('myModal').classList.add('show');
}
function closeModal() {
    document.getElementById('myModal').classList.remove('show');
}
</script>
```

---

### 9. Notifications

```html
<!-- Toast Notification -->
<div class="toast toast-success show">
    Evento criado com sucesso!
</div>

<!-- Alert -->
<div class="alert alert-warning">
    <i class="fas fa-exclamation-triangle"></i>
    <div>Atenção: Esta ação não pode ser desfeita.</div>
</div>
```

---

### 10. Loading States

```html
<!-- Spinner -->
<div class="loading-spinner"></div>

<!-- Skeleton -->
<div class="skeleton" style="height: 20px; margin-bottom: 10px;"></div>
<div class="skeleton" style="height: 20px; width: 80%;"></div>
```

---

## 🏗️ Layout System

### App Container
```html
<div class="app-container">
    <!-- Header -->
    <header class="app-header">
        <!-- Header content -->
    </header>
    
    <!-- Main Content -->
    <div class="app-content">
        <!-- Your content -->
    </div>
    
    <!-- Bottom Nav (Mobile) -->
    <nav class="app-bottom-nav">
        <!-- Nav buttons -->
    </nav>
</div>
```

### Grid Layouts
```html
<!-- 2 Columns -->
<div class="grid-2">
    <div>Item 1</div>
    <div>Item 2</div>
</div>

<!-- 3 Columns -->
<div class="grid-3">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
</div>

<!-- 4 Columns -->
<div class="grid-4">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
    <div>Item 4</div>
</div>
```

---

## 🌓 Temas

### Alternar Tema
```html
<!-- Toggle Button -->
<button class="theme-toggle" id="themeToggle"></button>

<script>
// Função para alternar tema
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Inicializar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
}

// Event listener
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.addEventListener('DOMContentLoaded', initTheme);
</script>
```

---

## 📱 Responsividade

### Breakpoints
```css
/* Mobile: até 640px */
/* Tablet: 641px a 1023px */
/* Desktop: 1024px+ */
/* Large: 1440px+ */
```

### Classes Utilitárias
```html
<!-- Esconder em Mobile -->
<div class="hide-mobile">Visível apenas em tablet/desktop</div>

<!-- Esconder em Tablet -->
<div class="hide-tablet">Visível apenas em mobile/desktop</div>

<!-- Esconder em Desktop -->
<div class="hide-desktop">Visível apenas em mobile/tablet</div>

<!-- Mobile Only -->
<div class="mobile-only">Apenas mobile</div>
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Página de Dashboard
```html
<div class="app-container" data-theme="dark">
    <header class="app-header">
        <h1>KROMI Dashboard</h1>
    </header>
    
    <div class="app-content">
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">42</div>
                <div class="stat-label">Eventos Ativos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">1,247</div>
                <div class="stat-label">Participantes</div>
            </div>
        </div>
        
        <!-- Cards -->
        <div class="grid-2">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Próximos Eventos</h3>
                </div>
                <div class="card-body">
                    <!-- Event cards -->
                </div>
            </div>
        </div>
    </div>
</div>
```

### Exemplo 2: Formulário de Evento
```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">Criar Novo Evento</h3>
    </div>
    <div class="card-body">
        <form>
            <div class="grid-2">
                <div class="form-group">
                    <label>Nome do Evento</label>
                    <input type="text" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" class="form-input" required>
                </div>
            </div>
            
            <div class="form-group">
                <label>Descrição</label>
                <textarea class="form-textarea" rows="4"></textarea>
            </div>
            
            <div class="form-group">
                <label>Tipo de Evento</label>
                <select class="form-select">
                    <option>Corrida</option>
                    <option>Ciclismo</option>
                    <option>Trail</option>
                </select>
            </div>
        </form>
    </div>
    <div class="card-footer">
        <button class="btn btn-secondary">Cancelar</button>
        <button class="btn btn-primary">
            <i class="fas fa-save"></i> Criar Evento
        </button>
    </div>
</div>
```

---

## 🎯 Best Practices

### 1. **Use Variáveis CSS**
```css
/* ✅ BOM */
.custom-button {
    background: var(--primary);
    padding: var(--spacing-3);
    border-radius: var(--radius-base);
}

/* ❌ EVITAR */
.custom-button {
    background: #fc6b03;
    padding: 12px;
    border-radius: 8px;
}
```

### 2. **Componha Classes**
```html
<!-- ✅ BOM -->
<button class="btn btn-primary btn-lg">
    <i class="fas fa-save"></i> Guardar
</button>

<!-- ❌ EVITAR -->
<button style="background: #fc6b03; padding: 16px 24px;">
    Guardar
</button>
```

### 3. **Use Grid Layouts**
```html
<!-- ✅ BOM -->
<div class="grid-2">
    <div class="form-group">...</div>
    <div class="form-group">...</div>
</div>

<!-- ❌ EVITAR -->
<div style="display: flex;">
    <div style="flex: 1; margin-right: 20px;">...</div>
    <div style="flex: 1;">...</div>
</div>
```

---

## 📚 Recursos Adicionais

### Ícones (FontAwesome)
- [FontAwesome Icons](https://fontawesome.com/icons)
- Já incluído no setup básico

### Cores Adicionais
Consulte a seção de variáveis CSS para todas as cores disponíveis.

### Suporte
Para questões ou problemas, consulte a documentação ou contacte a equipa de desenvolvimento.

---

## 🔄 Changelog

### v2.0 (Atual)
- ✨ Sistema completo de design
- ✨ 100+ componentes
- ✨ Dark/Light mode
- ✨ Mobile-first approach
- ✨ Documentação completa

---

**© 2025 KROMI Platform - Sistema de Design**
