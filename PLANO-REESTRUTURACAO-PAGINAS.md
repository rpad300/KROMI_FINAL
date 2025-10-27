# 📋 PLANO: Reestruturação de Páginas

## 🎯 OBJETIVO

Separar funcionalidades em páginas individuais em vez de ter tudo no `index-kromi.html`.

---

## 📊 ESTRUTURA ATUAL vs. NOVA

### **ATUAL (Tudo em index-kromi.html):**
```
index-kromi.html
├── Dashboard
├── Gestão de Utilizadores (dentro da página)
├── Perfil do Utilizador (dentro da página)
└── Navegação para events, classifications, etc.
```

### **NOVA (Páginas Separadas):**
```
index-kromi.html (Dashboard)
├── Estatísticas gerais
├── Acesso rápido
└── Menu de navegação

Páginas Administrativas:
├── usuarios.html - CRUD de utilizadores
├── perfis-permissoes.html - Gestão de roles
├── configuracoes.html - Configurações do sistema
├── logs-auditoria.html - Histórico de ações
└── meu-perfil.html - Editar dados pessoais

Gestão de Eventos:
└── events.html - Lista e CRUD de eventos

Páginas de Evento (requerem ?event=ID):
├── classifications.html?event=ID
├── participants.html?event=ID  
├── devices.html?event=ID
├── calibration.html?event=ID
└── config.html?event=ID
```

---

## 🔧 IMPLEMENTAÇÃO

### **Fase 1: Criar Páginas Novas**
1. `usuarios.html` - Extrair do index-kromi.html
2. `perfis-permissoes.html` - Nova funcionalidade
3. `configuracoes.html` - Nova funcionalidade
4. `logs-auditoria.html` - Nova funcionalidade
5. `meu-perfil.html` - Extrair do index-kromi.html

### **Fase 2: Simplificar index-kromi.html**
- Remover código de gestão de utilizadores
- Remover modais
- Manter apenas dashboard
- Atualizar links de navegação

### **Fase 3: Atualizar Navegação**
- Sidebar com links para páginas separadas
- Breadcrumbs para navegação
- Active state nos links

---

## ⏱️ TEMPO ESTIMADO

- **Fase 1**: 2-3 horas (criar 5 páginas novas)
- **Fase 2**: 30 minutos (simplificar index)
- **Fase 3**: 30 minutos (atualizar navegação)
- **Total**: 3-4 horas

---

## 🤔 DECISÃO

Isto é uma reestruturação significativa. O que queres fazer?

### **Opção A: Fazer tudo agora** (3-4h)
- Criar todas as páginas novas
- Reestruturar completamente
- Sistema final profissional

### **Opção B: Fazer gradualmente**
- Criar 1 página de cada vez
- Testar cada uma
- Migrar gradualmente

### **Opção C: Deixar para depois**
- Sistema atual funciona
- Focar noutras funcionalidades
- Reestruturar mais tarde

---

**Qual preferes? A, B ou C?** 

Se escolheres A ou B, começo agora pela página `usuarios.html` (a mais importante). 🤔

