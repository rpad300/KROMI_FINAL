# Sistema de Autenticação VisionKrono

## Visão Geral

O VisionKrono agora inclui um sistema completo de autenticação e gestão de utilizadores integrado com Supabase. O sistema suporta três tipos de perfis de utilizador com diferentes níveis de acesso.

## Perfis de Utilizador

### 1. Administrador
- **Acesso**: Total à plataforma
- **Funcionalidades**:
  - Gestão de utilizadores e atribuição de perfis
  - Configuração da aplicação
  - Acesso a todos os eventos
  - Gestão da base de dados
  - Configurações da plataforma

### 2. Gestor de Eventos
- **Acesso**: Criação e gestão dos seus eventos
- **Funcionalidades**:
  - Criar e gerir eventos
  - Gerir participantes dos seus eventos
  - Aceder a classificações dos seus eventos
  - Utilizar sistema de detecção
  - Live streaming dos seus eventos

### 3. Participante
- **Acesso**: Visualização de classificações e inscrições
- **Funcionalidades**:
  - Ver classificações dos eventos onde está inscrito
  - Ver rankings por categoria
  - Aceder ao live stream dos eventos

## Métodos de Login

### 1. Email e Palavra-passe
- Login tradicional com email e palavra-passe
- Suporte a recuperação de palavra-passe

### 2. Telefone
- Login usando número de telefone (deve estar associado ao email)

### 3. SMS
- Login via SMS (funcionalidade futura)

### 4. Google OAuth
- Login social com Google
- Integração automática com perfil existente

## Estrutura da Base de Dados

### Tabelas Principais

#### `user_profiles`
- Armazena perfis de utilizadores
- Campos: `user_id`, `email`, `phone`, `full_name`, `profile_type`, `is_active`

#### `events`
- Eventos criados pelos gestores
- Campos: `id`, `name`, `description`, `manager_id`, `start_date`, `end_date`

#### `event_participants`
- Participantes registados em eventos
- Campos: `event_id`, `participant_id`, `email`, `full_name`, `phone`

#### `user_sessions`
- Sessões ativas dos utilizadores
- Campos: `user_id`, `session_token`, `expires_at`, `last_activity`

#### `activity_logs`
- Log de atividades dos utilizadores
- Campos: `user_id`, `action`, `resource_type`, `resource_id`, `details`

## Arquivos do Sistema

### Core
- `auth-system.js` - Sistema principal de autenticação
- `route-protection.js` - Proteção de rotas baseada em perfis
- "`../sql/create-auth-system.sql" - Script SQL para criar estrutura da base de dados

### Páginas de Autenticação
- `login.html` - Página de login principal
- `register.html` - Página de registo de utilizadores
- `forgot-password.html` - Recuperação de palavra-passe
- `reset-password.html` - Redefinição de palavra-passe
- `auth/callback.html` - Callback para OAuth

### Dashboard
- `admin-dashboard.html` - Dashboard para administradores

## Configuração Inicial

### 1. Executar Script SQL
```sql
-- Executar o script create-auth-system.sql no Supabase
-- Este script cria todas as tabelas e configurações necessárias
```

### 2. Configurar Supabase
- URL: `https://mdrvgbztadnluhrrnlob.supabase.co`
- Chave API: Configurada no `auth-system.js`

### 3. Primeiro Administrador
- Email: `Rdias300@gmail.com`
- Palavra-passe: `1234876509`
- Perfil: Administrador

## Como Usar

### 1. Login
1. Aceder a `login.html`
2. Introduzir email/telefone e palavra-passe
3. Ou usar login com Google
4. Sistema redireciona automaticamente baseado no perfil

### 2. Registo
1. Aceder a `register.html`
2. Preencher formulário de registo
3. Confirmar email (se necessário)
4. Perfil criado como "Participante" por padrão

### 3. Recuperação de Palavra-passe
1. Aceder a `forgot-password.html`
2. Introduzir email
3. Verificar email para link de recuperação
4. Usar `reset-password.html` para definir nova palavra-passe

### 4. Gestão de Utilizadores (Admin)
1. Aceder ao dashboard de administrador
2. Clicar em "Gerir Utilizadores"
3. Ver lista de todos os utilizadores
4. Ativar/desativar utilizadores
5. Editar perfis (funcionalidade futura)

## Proteção de Rotas

### Rotas Protegidas
- `admin-dashboard.html` - Apenas administradores
- `events.html` - Administradores e gestores de eventos
- `participants.html` - Administradores e gestores de eventos
- `classifications.html` - Todos os perfis
- `detection.html` - Administradores e gestores de eventos
- `image-processor.html` - Administradores e gestores de eventos
- `database-management.html` - Apenas administradores
- `platform-config.html` - Apenas administradores

### Rotas Públicas
- `login.html`
- `register.html`
- `forgot-password.html`
- `reset-password.html`
- `auth/callback.html`

## Sessões e Segurança

### Timeout de Sessão
- **Duração**: 48 horas
- **Renovação**: Automática durante atividade
- **Limpeza**: Sessões expiradas são removidas automaticamente

### Logs de Atividade
- Todas as ações são registadas
- Inclui: login, logout, acesso a páginas, alterações de perfil
- Armazenado em `activity_logs`

### Row Level Security (RLS)
- Políticas configuradas no Supabase
- Utilizadores só veem dados que têm permissão
- Proteção automática a nível de base de dados

## Integração com Páginas Existentes

### Para Adicionar Autenticação a uma Página:

1. **Adicionar CSS de autenticação**:
```html
<style>
    .auth-header { /* estilos do header */ }
    .loading-auth { /* estilos de loading */ }
</style>
```

2. **Adicionar estrutura HTML**:
```html
<div class="loading-auth" id="authLoading">
    <div class="spinner"></div>
    <p>A verificar autenticação...</p>
</div>

<div id="mainContent" style="display: none;">
    <!-- conteúdo da página -->
</div>
```

3. **Adicionar scripts**:
```html
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="auth-system.js"></script>
<script src="route-protection.js"></script>
```

4. **Adicionar inicialização**:
```javascript
document.addEventListener('DOMContentLoaded', async function() {
    await initializeAuth();
});

async function initializeAuth() {
    // Verificar permissões
    // Carregar informações do utilizador
    // Mostrar conteúdo
}
```

## Troubleshooting

### Problemas Comuns

1. **"Sistema de autenticação não inicializado"**
   - Verificar se Supabase está configurado corretamente
   - Verificar conexão à internet

2. **"Acesso negado"**
   - Verificar se utilizador tem perfil correto
   - Verificar se perfil está ativo

3. **"Sessão inválida"**
   - Fazer logout e login novamente
   - Verificar se cookies estão habilitados

4. **Erro de OAuth**
   - Verificar configuração do Google OAuth no Supabase
   - Verificar URLs de callback

### Logs de Debug
- Abrir console do browser (F12)
- Verificar mensagens de erro
- Logs de atividade estão em `activity_logs` na base de dados

## Próximos Passos

### Funcionalidades Futuras
- [ ] Edição de perfis de utilizador
- [ ] Notificações por email
- [ ] Login com SMS
- [ ] Autenticação de dois fatores
- [ ] Gestão de grupos de utilizadores
- [ ] Relatórios de atividade detalhados

### Melhorias de Segurança
- [ ] Rate limiting para tentativas de login
- [ ] Detecção de atividades suspeitas
- [ ] Criptografia adicional para dados sensíveis
- [ ] Auditoria completa de ações

## Suporte

Para questões ou problemas:
1. Verificar logs no console do browser
2. Verificar logs na base de dados (`activity_logs`)
3. Verificar configuração do Supabase
4. Contactar administrador do sistema


