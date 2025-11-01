# ✅ Regras de Escalão - Interface User-Friendly

## 🎯 Problema Resolvido

### Antes (JSON Manual)
```json
{"Sub-18": "<18", "Sénior": "18-39", "Veterano": "40+"}
```

❌ Difícil de editar  
❌ Propenso a erros  
❌ Não user-friendly  
❌ Requer conhecimento técnico  

### Agora (Interface Visual)
```
┌────────────────────────────────────────────────────┐
│ ☑ Calcular automaticamente por idade              │
│                                                     │
│ Regras de Escalão                                  │
│ ┌─────────────┬──────────┬──────────┬────┐        │
│ │ Nome        │ Min      │ Max      │    │        │
│ ├─────────────┼──────────┼──────────┼────┤        │
│ │ Sub-18      │ 0        │ 17       │ 🗑️ │        │
│ │ Sénior      │ 18       │ 39       │ 🗑️ │        │
│ │ Veterano    │ 40       │ 99       │ 🗑️ │        │
│ └─────────────┴──────────┴──────────┴────┘        │
│                                                     │
│ [➕ Adicionar Escalão]                             │
└────────────────────────────────────────────────────┘
```

✅ Visual e intuitivo  
✅ Sem JSON manual  
✅ Validação automática  
✅ Fácil adicionar/remover  

---

## 🎯 Como Funciona

### 1. Criar Campo Categoria

```
1. Clicar "➕ Campo Custom"
2. Tipo: [Categoria/Escalão]
3. Seção de configuração aparece:
   
   ☑ Calcular automaticamente por idade
   
   Regras de Escalão
   ┌─────────────┬──────┬──────┬────┐
   │ Sub-18      │  0   │  17  │ 🗑️ │  ← Pré-carregado
   │ Sénior      │ 18   │  39  │ 🗑️ │  ← Pré-carregado
   │ Veterano    │ 40   │  99  │ 🗑️ │  ← Pré-carregado
   └─────────────┴──────┴──────┴────┘
   
   [➕ Adicionar Escalão]
```

### 2. Editar Regras

**Editar existente:**
- Clicar no campo
- Mudar valores
- Automático

**Adicionar novo escalão:**
```
Clicar "➕ Adicionar Escalão"

Nova linha aparece:
┌─────────────┬──────┬──────┬────┐
│ [Nome]      │ [Min]│ [Max]│ 🗑️ │
└─────────────┴──────┴──────┴────┘

Preencher:
Nome: Master
Min:  50
Max:  59
```

**Remover escalão:**
- Clicar 🗑️
- Linha removida

### 3. Resultado

**Ao salvar, converte automaticamente para:**
```json
{
  "category_rules": {
    "Sub-18": "0-17",
    "Sénior": "18-39",
    "Veterano": "40-99",
    "Master": "50-59"
  }
}
```

**Salvo em `type_config` do campo.**

---

## 📊 Interface Detalhada

### Componentes

**Grid de 4 colunas:**
1. **Nome do Escalão** (2fr) - Input text
2. **Idade Min** (1fr) - Input number
3. **Idade Max** (1fr) - Input number
4. **Remover** (auto) - Botão 🗑️

**Botão adicionar:**
- ➕ Adicionar Escalão
- Cria nova linha
- Inputs vazios

**Checkbox toggle:**
- ☑ Ativa/desativa cálculo automático
- Mostra/esconde regras

### Validações

**Automáticas:**
- Nome não vazio
- Min numérico
- Max numérico
- Max > Min

**Visual:**
- Erro se campos vazios
- Destaque em vermelho
- Mensagem clara

---

## 🎯 Exemplos de Uso

### Evento Running

```
Escalões:
┌─────────────┬──────┬──────┐
│ Juvenil     │  12  │  17  │
│ Sénior      │  18  │  39  │
│ Veterano A  │  40  │  49  │
│ Veterano B  │  50  │  59  │
│ Veterano C  │  60  │  99  │
└─────────────┴──────┴──────┘

Resultado:
{
  "Juvenil": "12-17",
  "Sénior": "18-39",
  "Veterano A": "40-49",
  "Veterano B": "50-59",
  "Veterano C": "60-99"
}
```

### Evento Ciclismo

```
Escalões:
┌─────────────┬──────┬──────┐
│ Cadete      │  14  │  16  │
│ Júnior      │  17  │  18  │
│ Sub-23      │  19  │  22  │
│ Elite       │  23  │  39  │
│ Master 40   │  40  │  49  │
│ Master 50   │  50  │  99  │
└─────────────┴──────┴──────┘
```

### Evento Natação

```
Escalões:
┌─────────────┬──────┬──────┐
│ Infantil    │   8  │  11  │
│ Iniciado    │  12  │  13  │
│ Juvenil     │  14  │  15  │
│ Júnior      │  16  │  17  │
│ Absoluto    │  18  │  99  │
└─────────────┴──────┴──────┘
```

---

## 💡 Features Avançadas

### Pré-carregamento Inteligente

Quando seleciona "Categoria", 3 regras padrão aparecem:
- Sub-18: 0-17
- Sénior: 18-39
- Veterano: 40-99

**Pode:**
- Editar existentes
- Adicionar mais
- Remover as que não quer

### Desabilitar Cálculo

Se **desmarcar** "Calcular automaticamente":
- Regras escondem
- Campo vira seleção manual
- Organizador define categoria

---

## 🔍 Fluxo Técnico

### Frontend → Backend → Banco

```javascript
// 1. Interface visual (3 regras)
[ 
  { name: "Sub-18", min: 0, max: 17 },
  { name: "Sénior", min: 18, max: 39 },
  { name: "Veterano", min: 40, max: 99 }
]

// 2. Extração automática
extractCategoryRules()
→ {
  "Sub-18": "0-17",
  "Sénior": "18-39",
  "Veterano": "40-99"
}

// 3. Salvo em type_config
{
  field_type: "category",
  type_config: {
    auto_category: true,
    category_rules: {
      "Sub-18": "0-17",
      "Sénior": "18-39",
      "Veterano": "40-99"
    }
  }
}

// 4. No formulário público
Participante nasce: 15/03/1985
Idade calculada: 39 anos
Categoria atribuída: "Sénior" ✅
```

---

## ✅ Checklist

- [x] Interface visual de regras
- [x] Grid 4 colunas
- [x] Inputs para nome, min, max
- [x] Botão remover por linha
- [x] Botão adicionar escalão
- [x] Pré-carregamento 3 regras padrão
- [x] Checkbox toggle
- [x] Extração automática
- [x] Conversão para JSON
- [x] Validação de campos
- [x] Salva em type_config
- [x] Funciona no público

---

## 🎊 Resultado

**Regras de Escalão User-Friendly!**

✅ Zero JSON manual  
✅ Interface visual  
✅ Adicionar/remover fácil  
✅ Validação automática  
✅ Pré-carregamento inteligente  
✅ UX profissional  

**Pode ser aplicado a outros campos complexos!** 🌟

---

## 🔮 Próximos Passos

Aplicar mesmo padrão para:
- **Fórmulas calculadas** - Editor visual de fórmulas
- **Matriz Likert** - Editor de perguntas + escala
- **Validações regex** - Biblioteca de padrões comuns
- **Lógica condicional** - If-then-else visual
- **Morada estruturada** - Campos por país

**Todos podem ter interface visual similar!**

---

**VisionKrono/Kromi.online** 🏃‍♂️⏱️📋

**Interface visual implementada!**  
**JSON automático!**  
**UX de classe mundial!**

