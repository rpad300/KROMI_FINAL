# Guia de Integração de Logos Dinâmicos

## 📋 Visão Geral

O sistema de logos dinâmicos permite carregar automaticamente os logos corretos conforme:
- **Orientação do dispositivo** (horizontal/vertical)
- **Tipo de logo** (primary/secondary)
- **Contexto** (header, sidebar, footer, mobile)

## 🚀 Integração Rápida

### 1. Adicionar Scripts e CSS

```html
<!-- Logo Integration Styles -->
<link rel="stylesheet" href="/logo-integration.css?v=2025012701">

<!-- Logo Loader (carregar antes da navegação) -->
<script src="/logo-loader.js?v=2025012701" defer></script>
```

### 2. Usar no HTML

#### Opção A: Container com ID (recomendado)

```html
<!-- Sidebar Logo -->
<div class="sidebar-logo-container" id="sidebarLogo"></div>

<!-- Header Logo -->
<div class="header-logo-container" id="headerLogo"></div>

<!-- Footer Logo -->
<div class="footer-logo-container" id="footerLogo"></div>
```

#### Opção B: JavaScript Manual

```javascript
// Aguardar logoLoader estar disponível
if (typeof window.logoLoader !== 'undefined') {
    await logoLoader.renderLogo('#headerLogo', {
        type: 'primary',
        orientation: 'horizontal',
        alt: 'Kromi.online',
        className: 'header-logo'
    });
}
```

## 🎯 Exemplos de Uso

### Logo no Header (Sempre Horizontal)

```javascript
await logoLoader.renderLogo('#headerLogo', {
    type: 'primary',
    orientation: 'horizontal',
    alt: 'Kromi.online',
    className: 'header-logo',
    width: null,
    height: null,
    style: {
        maxHeight: '50px'
    },
    fallback: '<h1>Kromi.online</h1>',
    onError: (error) => {
        console.error('Erro ao carregar logo:', error);
    }
});
```

### Logo no Mobile (Adaptativo)

```javascript
await logoLoader.renderLogo('#mobileLogo', {
    type: 'primary',
    orientation: null, // Auto-detecta orientação
    alt: 'Kromi.online',
    className: 'mobile-logo',
    style: {
        maxHeight: '44px'
    }
});
```

### Logo no Footer (Sempre Horizontal)

```javascript
await logoLoader.renderLogo('#footerLogo', {
    type: 'primary',
    orientation: 'horizontal',
    alt: 'Kromi.online',
    className: 'footer-logo',
    style: {
        maxHeight: '60px'
    }
});
```

### Obter URL do Logo (sem renderizar)

```javascript
const logoUrl = logoLoader.getLogoUrl('primary', 'horizontal');
if (logoUrl) {
    console.log('URL do logo:', logoUrl);
}
```

### Pré-carregar Todos os Logos

```javascript
// Já é feito automaticamente, mas pode ser chamado manualmente
await logoLoader.preloadLogos();
```

## 📱 Detecção Automática de Orientação

O sistema detecta automaticamente:
- **Desktop**: Sempre usa logo horizontal
- **Mobile Horizontal**: Usa logo horizontal
- **Mobile Vertical**: Usa logo vertical (se disponível)

## 💾 Cache

O sistema usa cache local com duração de **5 minutos**:
- Reduz chamadas ao servidor
- Melhora performance
- Automático e transparente

Para forçar atualização:

```javascript
await logoLoader.getLogo('primary', 'horizontal', true); // forceRefresh = true
```

## 🎨 Classes CSS Disponíveis

- `.sidebar-logo` - Logo na sidebar
- `.header-logo` - Logo no header
- `.header-logo-small` - Logo pequeno no header
- `.header-logo-large` - Logo grande no header
- `.footer-logo` - Logo no footer
- `.mobile-logo` - Logo mobile

## 🔧 API Endpoints

### GET `/api/branding/logo/:type/:orientation?`

**Parâmetros:**
- `type`: `primary`, `secondary`, ou `favicon`
- `orientation`: `horizontal` ou `vertical` (opcional, padrão: `horizontal`)

**Exemplos:**
- `/api/branding/logo/primary/horizontal`
- `/api/branding/logo/primary/vertical`
- `/api/branding/logo/secondary/horizontal`
- `/api/branding/logo/favicon`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "type": "logo_primary_horizontal",
    "file_path": "...",
    "format": "png",
    "width": 1024,
    "height": 512,
    "url": "https://..."
  }
}
```

## 🔄 Favicon Automático

O favicon é atualizado automaticamente quando a página carrega:

```javascript
// Já é feito automaticamente
await logoLoader.updateFavicon();
```

## 📝 Integração na Sidebar (Já Implementado)

O `navigation-component.js` já está configurado para carregar o logo automaticamente na sidebar.

## ⚡ Performance

- Cache local de 5 minutos
- Pré-carregamento automático
- Lazy loading quando necessário
- Fallback para texto se logo não encontrado

## 🐛 Troubleshooting

### Logo não aparece
1. Verificar se o logo está publicado na interface de Branding
2. Verificar console do navegador para erros
3. Verificar se o endpoint retorna dados: `/api/branding/logo/primary/horizontal`

### Logo errado (horizontal vs vertical)
- Forçar orientação específica: `orientation: 'horizontal'`
- Limpar cache: `logoLoader.clearCache()`

### Favicon não atualiza
- Limpar cache do navegador
- Verificar se favicon está publicado
- Verificar console para erros

## 📚 Referência Completa

### LogoLoader Methods

#### `getLogo(type, orientation, forceRefresh)`
Obtém objeto do logo (com cache)

#### `renderLogo(selector, options)`
Renderiza logo em elemento HTML

#### `getLogoUrl(type, orientation)`
Obtém URL do logo (síncrono, usa cache)

#### `preloadLogos()`
Pré-carrega todos os logos

#### `updateFavicon()`
Atualiza favicon da página

#### `clearCache()`
Limpa cache local

#### `getOptimalOrientation()`
Retorna orientação ótima baseada no contexto

