# 📋 Plano de Atualização KROMI - Todo o Projeto

## 🎯 Objetivo

Atualizar TODAS as páginas do VisionKrono para usar o KROMI Design System com navegação consistente e hierárquica.

## 📁 Arquivos a Atualizar

### Páginas Principais (9 arquivos):

1. ✅ **events-pwa.html** - JÁ ATUALIZADO
2. ⏳ **index.html** - Home/Seleção de modo
3. ⏳ **detection.html** - Detecção de dorsais
4. ⏳ **classifications.html** - Rankings
5. ⏳ **participants.html** - Gestão de participantes
6. ⏳ **category-rankings.html** - Rankings por categoria
7. ⏳ **calibration.html** - Calibração IA
8. ⏳ **image-processor.html** - Processador de imagens
9. ⏳ **database-management.html** - Gestão BD

### Arquivos Secundários/Legados:

- events.html → Renomear para events-legacy.html
- live-stream.html → Remover (substituído por painel integrado)
- test-live-stream.html → Remover
- detection-debug.html → Manter para debug
- debug-mobile.html → Manter para debug

### CSS (Consolidar):

- ❌ styles.css → Incorporar em KROMI
- ❌ events.css → Remover
- ❌ detection.css → Remover
- ❌ calibration.css → Remover
- ❌ classifications.css → Remover
- ❌ participants.css → Remover
- ❌ category-rankings.css → Remover
- ✅ kromi-design-system.css → MANTER (único CSS)

## 🏗️ Estrutura Padrão (Todas as Páginas)

```html
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#fc6b03">
    <title>VisionKrono - [Título]</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="kromi-design-system.css">
</head>
<body data-theme="dark">
    <div class="layout-with-sidebar">
        <nav class="sidebar" id="sidebar">...</nav>
        <header class="header">...</header>
        <main class="main">...</main>
        <nav class="app-bottom-nav">...</nav>
    </div>
    <script src="supabase.js"></script>
    <script src="navigation.js"></script>
    <script>/* Código específico */</script>
</body>
</html>
```

## 📊 Navegação Hierárquica

### NÍVEL 1 - Gestão Geral (Sempre visível):

- 🏠 Home → `/`
- 🏃 Eventos → `/events`
- 🤖 Processador → `/image-processor`
- 🗄️ Gestão BD → `/database-management`

### NÍVEL 2 - Opções do Evento (Quando evento selecionado):

- 📱 Detecção → `/detection?event=UUID&device=UUID`
- 🏆 Classificações → `/classifications?event=UUID`
- 🔧 Calibração → `/calibration?event=UUID`
- 🎥 Live Stream → Painel lateral (integrado em events)
- 👥 Participantes → `/participants?event=UUID`

## 🎨 Componentes KROMI a Usar

### Layout:
- `.layout-with-sidebar` - Container principal
- `.sidebar` - Navegação lateral
- `.header` - Cabeçalho
- `.main` - Conteúdo principal
- `.app-bottom-nav` - Navegação inferior mobile

### Navegação:
- `.nav-menu` - Container de navegação
- `.nav-category` - Título de seção
- `.nav-item` - Item de navegação
- `.nav-item.active` - Item ativo
- `.nav-separator` - Separador

### Conteúdo:
- `.card` - Card padrão
- `.card-header`, `.card-body`, `.card-footer` - Partes do card
- `.stat-card` - Card de estatística
- `.event-card` - Card de evento
- `.grid-2`, `.grid-3`, `.grid-4` - Grids responsivos

### Botões:
- `.btn .btn-primary` - Botão principal (laranja)
- `.btn .btn-secondary` - Botão secundário
- `.btn .btn-success` - Botão sucesso (verde)
- `.btn .btn-danger` - Botão perigo (vermelho)
- `.btn .btn-sm`, `.btn-lg` - Tamanhos

### Forms:
- `.form-group` - Grupo de formulário
- `.form-input` - Input de texto
- `.form-select` - Select dropdown
- `.form-textarea` - Textarea
- `.form-switch` - Toggle switch

### Status:
- `.badge .badge-active` - Badge ativo (verde)
- `.badge .badge-finished` - Badge finalizado (cinza)
- `.status-dot .online` - Ponto status online
- `.toast .toast-success` - Notificação sucesso

## ⚡ Plano de Execução

### Fase 1: Páginas Principais (Prioridade Alta)

1. **index.html** - Landing page simples e moderna
2. **detection.html** - Fullscreen camera com sidebar
3. **classifications.html** - Tabela de rankings
4. **participants.html** - Gestão de participantes

### Fase 2: Páginas Administrativas

5. **calibration.html** - Interface de calibração
6. **image-processor.html** - Monitor de processamento
7. **database-management.html** - Gestão de BD
8. **category-rankings.html** - Rankings por categoria

### Fase 3: Limpeza

9. Remover CSS antigos
10. Renomear arquivos legados
11. Atualizar server.js rotas
12. Documentar mudanças

## 🎯 Benefícios Esperados

### Consistência:
- ✅ Mesmo design em todas as páginas
- ✅ Navegação idêntica
- ✅ Componentes reutilizáveis
- ✅ Cores consistentes (laranja KROMI)

### Performance:
- ✅ 1 arquivo CSS (vs 7 arquivos)
- ✅ Cache browser otimizado
- ✅ Menos requests HTTP

### Manutenibilidade:
- ✅ Código DRY (Don't Repeat Yourself)
- ✅ Fácil adicionar novas páginas
- ✅ Mudanças globais simples
- ✅ Sistema de design documentado

### UX:
- ✅ Navegação intuitiva em todas as páginas
- ✅ Hierarquia clara (Geral → Evento)
- ✅ Mobile-first responsive
- ✅ Touch optimized

## 📊 Impacto Estimado

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| **Arquivos CSS** | 7 | 1 | -86% |
| **Código CSS** | ~5000 linhas | ~1620 linhas | -68% |
| **Consistência** | Baixa | Alta | +100% |
| **Tempo para novo recurso** | Horas | Minutos | -90% |

---

**Iniciando atualização sistemática de todas as páginas...** 🚀

