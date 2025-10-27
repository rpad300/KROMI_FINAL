# Script para Aplicar Proteção Universal a Todas as Páginas

## Instruções de Aplicação

### 1. Substituir o sistema de proteção atual

**Arquivo atual**: `route-protection.js`  
**Arquivo novo**: `universal-route-protection.js`

### 2. Aplicar template a páginas existentes

Para cada página HTML existente, seguir estes passos:

#### Passo 1: Adicionar CSS de autenticação
Adicionar no `<head>` da página:

```html
<style>
    .auth-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #f5f7fa;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
    }

    .auth-spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin-right: 15px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .auth-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 2rem;
        display: none;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
    }

    .auth-header h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .user-avatar {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.9rem;
    }

    .logout-btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
    }

    .logout-btn:hover {
        background: rgba(255,255,255,0.3);
    }

    /* Ocultar conteúdo até autenticação */
    body:not(.authenticated) .main-content {
        display: none !important;
    }

    body.authenticated .auth-loading {
        display: none !important;
    }

    body.authenticated .auth-header {
        display: flex !important;
    }

    @media (max-width: 768px) {
        .auth-header {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
        }
    }
</style>
```

#### Passo 2: Adicionar estrutura HTML
Adicionar logo após `<body>`:

```html
<!-- Loading de autenticação -->
<div class="auth-loading" id="authLoading">
    <div class="auth-spinner"></div>
    <p>A verificar autenticação...</p>
</div>

<!-- Header de autenticação -->
<div class="auth-header" id="authHeader">
    <h1>🏃‍♂️ VisionKrono - [TÍTULO DA PÁGINA]</h1>
    <div class="user-info">
        <div class="user-avatar" id="userAvatar">U</div>
        <div>
            <div id="userName">Utilizador</div>
            <div style="font-size: 0.8rem; opacity: 0.8;" id="userEmail">user@example.com</div>
        </div>
        <button class="logout-btn" onclick="logout()">Sair</button>
    </div>
</div>

<!-- Envolver conteúdo existente -->
<div class="main-content">
    <!-- CONTEÚDO EXISTENTE DA PÁGINA AQUI -->
</div>
```

#### Passo 3: Adicionar scripts
Adicionar antes do fechamento `</body>`:

```html
<!-- Scripts de Autenticação Universal -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="auth-system.js"></script>
<script src="universal-route-protection.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Aguardar autenticação antes de inicializar página
        if (window.universalProtection && window.authSystem && window.authSystem.currentUser) {
            // Página autenticada - inicializar funcionalidades
            initializePage();
        }
    });

    function initializePage() {
        // Adicionar classe authenticated ao body
        document.body.classList.add('authenticated');
        
        // Inicializar funcionalidades específicas da página
        console.log('Página inicializada com autenticação');
        
        // Chamar função de inicialização original da página se existir
        if (typeof initializeOriginalPage === 'function') {
            initializeOriginalPage();
        }
    }
</script>
```

### 3. Páginas que precisam ser atualizadas

#### Páginas Principais:
- [ ] `events.html` ✅ (já atualizada)
- [ ] `participants.html`
- [ ] `classifications.html`
- [ ] `detection.html`
- [ ] `image-processor.html`
- [ ] `database-management.html`
- [ ] `platform-config.html`
- [ ] `category-rankings.html`
- [ ] `live-stream.html`
- [ ] `livestream-viewer.html`
- [ ] `calibration.html`

#### Páginas KROMI:
- [ ] `events-kromi.html`
- [ ] `participants-kromi.html`
- [ ] `classifications-kromi.html`
- [ ] `detection-kromi.html`
- [ ] `image-processor-kromi.html`
- [ ] `database-management-kromi.html`
- [ ] `platform-config-kromi.html`
- [ ] `category-rankings-kromi.html`
- [ ] `checkpoint-order-kromi.html`
- [ ] `config-kromi.html`
- [ ] `calibration-kromi.html`

#### Outras Páginas:
- [ ] `events-pwa.html`

### 4. Páginas que NÃO precisam ser atualizadas

#### Páginas Públicas (sem autenticação):
- ✅ `login.html`
- ✅ `register.html`
- ✅ `forgot-password.html`
- ✅ `reset-password.html`
- ✅ `auth/callback.html`

#### Páginas Públicas com Parâmetros (sem autenticação):
- ✅ `detection.html` - Acessada por dispositivos com parâmetros `?event=ID&device=ID`
- ✅ `detection-kromi.html` - Versão KROMI da detecção

**Nota**: Estas páginas só são acessíveis se tiverem os parâmetros corretos na URL.

### 6. Páginas de Detecção Especiais

#### Template para Páginas de Detecção:
- **Arquivo**: `template-detection-public.html`
- **Uso**: Para páginas que são acessadas por dispositivos/câmaras
- **Características**: Sem header de autenticação, sem login obrigatório

#### Como Aplicar a Páginas de Detecção:

1. **Usar template específico**: `template-detection-public.html`
2. **Verificar parâmetros**: URL deve ter `?event=ID&device=ID`
3. **Sem autenticação**: Página funciona sem login
4. **Header específico**: Mostra informações do dispositivo e evento

#### Exemplo de URL Válida:
```
https://192.168.1.219:1144/detection?event=a6301479-56c8-4269-a42d-aa8a7650a575&device=7d76e379-d4cd-4f69-9cc4-a95c4c113f72&eventName=Evento
```

#### Parâmetros Necessários:
- `event` - ID do evento
- `device` - ID do dispositivo
- `eventName` - Nome do evento (opcional)

### 7. Verificação de Funcionamento

Após aplicar a proteção:

1. **Testar acesso sem login**: Deve redirecionar para `login.html`
2. **Testar login**: Deve funcionar normalmente
3. **Testar permissões**: Cada perfil deve ver apenas o que tem permissão
4. **Testar logout**: Deve redirecionar para login
5. **Testar sessão expirada**: Deve redirecionar para login

### 6. Comandos para Aplicação Rápida

```bash
# Substituir route-protection.js
mv universal-route-protection.js route-protection.js

# Aplicar template a uma página específica
# (usar editor para aplicar mudanças manualmente)
```

### 7. Checklist de Aplicação

Para cada página:
- [ ] CSS de autenticação adicionado
- [ ] Estrutura HTML adicionada
- [ ] Scripts de autenticação adicionados
- [ ] Conteúdo existente envolvido em `.main-content`
- [ ] Título da página atualizado no header
- [ ] Teste de funcionamento realizado

### 8. Troubleshooting

**Problema**: Página não carrega após login
**Solução**: Verificar se `.main-content` envolve todo o conteúdo

**Problema**: Header não aparece
**Solução**: Verificar se `body.authenticated` está sendo aplicado

**Problema**: Redirecionamento infinito
**Solução**: Verificar se página está na lista de páginas protegidas

**Problema**: Permissões incorretas
**Solução**: Verificar `checkPagePermission()` no `universal-route-protection.js`
