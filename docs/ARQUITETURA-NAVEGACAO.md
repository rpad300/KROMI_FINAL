# 🏗️ Arquitetura de Navegação Hierárquica - VisionKrono PWA

## 📊 Conceito: Navegação em 2 Níveis

A aplicação agora usa uma **arquitetura hierárquica contextual** onde as funcionalidades aparecem apenas quando relevantes.

## 📁 NÍVEL 1: Gestão Geral

**Sempre visível na sidebar/bottom nav:**

```
┌─────────────────────┐
│ GESTÃO GERAL        │
├─────────────────────┤
│ 🏠 Home             │  → Página inicial
│ 🏃 Eventos          │  → Lista de eventos
│ 🤖 Processador      │  → Processar imagens (global)
│ 🗄️ Gestão BD        │  → Gerir base de dados (global)
└─────────────────────┘
```

**Características**:
- ✅ Sempre disponível
- ✅ Não dependem de evento específico
- ✅ Funcionalidades globais do sistema

## 📁 NÍVEL 2: Opções do Evento

**Aparece APENAS quando um evento é selecionado:**

```
Quando clica num evento:

┌─────────────────────┐
│ GESTÃO GERAL        │
├─────────────────────┤
│ 🏠 Home             │
│ 🏃 Eventos   ✓      │  ← Ativo
│ 🤖 Processador      │
│ 🗄️ Gestão BD        │
├─────────────────────┤
│ TESTE1              │  ← Nome do evento selecionado
├─────────────────────┤
│ 📱 Detecção         │  → /detection?event=UUID&device=...
│ 🏆 Classificações   │  → /classifications?event=UUID
│ 🔧 Calibração       │  → /calibration?event=UUID
│ 🎥 Live Stream      │  → Abre painel lateral
│ 👥 Participantes    │  → /participants?event=UUID
└─────────────────────┘
```

**Características**:
- ✅ Contextual (só aparece quando relevante)
- ✅ Todas com eventId correto
- ✅ Funcionam específicas para aquele evento
- ✅ Desaparecem quando volta para lista

## 🎯 Fluxo de Uso

### Caso 1: Gestor Quer Ver Classificações

```
1. Acessa /events
   └─ Ver lista de todos os eventos

2. Clica no evento "Maratona Porto 2025"
   └─ Sidebar mostra nova seção com opções do evento
   └─ Cards grandes aparecem no conteúdo

3. Clica "🏆 Classificações" (sidebar ou card)
   └─ Navega para /classifications?event=UUID
   └─ Vê classificações daquele evento específico
```

### Caso 2: Operador Quer Iniciar Detecção

```
1. Acessa /events

2. Clica no evento "Trail Running 2025"

3. Clica "📱 Detecção" (sidebar ou card)
   └─ Sistema busca device do evento automaticamente
   └─ Navega para /detection?event=UUID&device=UUID
   └─ Página de detecção já configurada para aquele evento
```

### Caso 3: Técnico Quer Calibrar IA

```
1. Acessa /events

2. Clica no evento

3. Clica "🔧 Calibração"
   └─ Navega para /calibration?event=UUID
   └─ Calibração específica daquele evento
   └─ Configurações não afetam outros eventos
```

### Caso 4: Monitor Quer Ver Live Stream

```
1. Acessa /events

2. Clica no evento

3. Clica "🎥 Live Stream" (sidebar ou card grande)
   └─ Painel lateral desliza da direita
   └─ Mostra dispositivos DAQUELE evento
   └─ Streams apenas daquele evento
```

## 🎨 Visual da Interface

### Desktop (Antes de Selecionar Evento):

```
┌─────────┬────────────────────────┐
│ GESTÃO  │  📊 Estatísticas       │
│ GERAL   │  ┌────┐ ┌────┐ ┌────┐ │
│         │  │ 3  │ │ 5  │ │120 │ │
│ 🏠 Home │  └────┘ └────┘ └────┘ │
│ 🏃 Even │                        │
│ 🤖 Proc │  📅 Eventos            │
│ 🗄️ BD   │  ┌──────┐ ┌──────┐   │
│         │  │Event1│ │Event2│   │
└─────────┴────────────────────────┘
```

### Desktop (Depois de Selecionar "teste1"):

```
┌─────────┬────────────────────────┐
│ GESTÃO  │  ← Voltar              │
│ GERAL   │  [🚀 Iniciar] [🔄]     │
│         │                        │
│ 🏠 Home │  📱 Detecção           │
│ 🏃 Even │  ┌───────────────────┐ │
│ 🤖 Proc │  │   [Grande Card]   │ │
│ 🗄️ BD   │  └───────────────────┘ │
├─────────┤                        │
│ TESTE1  │  🏆 Classificações     │
├─────────┤  🔧 Calibração         │
│ 📱 Detec│  🎥 Live Stream        │
│ 🏆 Class│  👥 Participantes      │
│ 🔧 Calib│                        │
│ 🎥 Live │                        │
│ 👥 Partic│                       │
└─────────┴────────────────────────┘
   ↑
   Nova seção aparece!
```

## 💡 Vantagens Desta Arquitetura

### 1. **Lógica Clara**
✅ Gestão geral separada de eventos específicos  
✅ Contexto sempre claro  
✅ Não navega para página errada  

### 2. **UX Intuitiva**
✅ Funcionalidades aparecem quando relevantes  
✅ Não vê opções inúteis  
✅ Menos confusão  

### 3. **EventId Sempre Correto**
✅ Todas URLs de nível 2 têm `?event=UUID`  
✅ Detecção já sabe qual evento  
✅ Classificações filtradas automaticamente  
✅ Calibração específica do evento  

### 4. **Escalável**
✅ Fácil adicionar novas opções de evento  
✅ Fácil adicionar ferramentas globais  
✅ Hierarquia clara e mantível  

## 🔧 Implementação Técnica

### Sidebar Dinâmica:

```javascript
// Quando NENHUM evento selecionado:
- Mostra apenas seção "Gestão Geral"
- Seção "Evento Selecionado" está display: none

// Quando evento É selecionado:
- Seção "Gestão Geral" permanece
- Seção "Evento Selecionado" aparece (display: block)
- Título da seção mostra nome do evento
- Todos os botões configurados com eventId correto
```

### Navegação Contextual:

```javascript
function setupEventNavigation(event) {
  const eventId = event.id;
  
  // Cada botão navega com eventId
  detectionBtn.onclick = () => 
    navigate(`/detection?event=${eventId}&device=...`);
  
  classificationsBtn.onclick = () => 
    navigate(`/classifications?event=${eventId}`);
  
  // etc...
}
```

## 📱 Bottom Nav (Mobile)

Mantém-se simples com gestão geral:

```
┌────────────────────────────────┐
│  🏠    🏃    🤖    🗄️          │
│ Home Eventos Proc  BD           │
└────────────────────────────────┘
```

Quando dentro de evento, cards grandes ocupam a tela para navegação.

## 🎯 Benefícios

### Para o Usuário:

- 🎯 **Navegação Lógica**: Sempre sabe onde está
- 🚀 **Rápido**: Menos cliques para chegar onde quer
- 📱 **Mobile Friendly**: Cards grandes e tocáveis
- 🧠 **Intuitivo**: Hierarquia natural

### Para o Sistema:

- 📝 **Código Limpo**: Lógica clara de when show/hide
- 🔗 **URLs Corretas**: EventId sempre presente quando necessário
- 🛡️ **Sem Erros**: Não tenta carregar dados sem eventId
- 📊 **Escalável**: Fácil adicionar novas funcionalidades

## 🆚 Comparação

### Antes (Modal-based, Flat):

```
❌ Tudo no mesmo nível
❌ Detecção, Calibração, Live Stream sempre visíveis
❌ Não sabe qual evento usar
❌ URLs sem eventId
❌ Modals para tudo
```

### Depois (PWA, Hierárquica):

```
✅ 2 níveis claros (Geral → Evento)
✅ Opções de evento só aparecem quando evento selecionado
✅ Sabe exatamente qual evento
✅ URLs sempre com eventId correto
✅ Sem modals, tudo fluido
```

---

**Arquitetura moderna, lógica e escalável!** 🎉

**O sistema agora reflete corretamente a hierarquia de dados:** Eventos contêm Detecções, Classificações, Participantes, etc.

