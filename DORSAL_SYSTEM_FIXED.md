# ✅ Sistema de Dorsais - CORRIGIDO!

## 🎯 Estrutura Correta Implementada

### ❌ ANTES (errado - 2 seções separadas):
```
🔢 Atribuição de Dorsais
  - Sequencial/Aleatório

🏷️ Nomenclatura
  - Numérico/Prefixo/Sufixo
```

### ✅ AGORA (correto - tudo junto):
```
🏷️ Nomenclatura dos Dorsais
  ├─ Tipo: Numérico
  │  ├─ 🎯 Modo: Sequencial/Aleatório  ← DENTRO!
  │  ├─ Range: 1-9999
  │  └─ Padding: Sim/Não
  │
  ├─ Tipo: Com Prefixo
  │  ├─ 🎯 Modo: Sequencial/Aleatório  ← DENTRO!
  │  ├─ Prefixos: M, F, PRO
  │  ├─ Separador: -
  │  └─ Range: 1-999
  │
  └─ Tipo: Com Sufixo...
```

**UMA seção com tudo!** ✅

---

## 📊 Como Funciona:

### **Exemplo 1: Numérico Sequencial**
```json
{
  "type": "numeric",
  "numeric": {
    "mode": "sequential",
    "min": 1,
    "max": 9999,
    "use_padding": true,
    "digits": 3
  }
}
```
**Atribui:** 001, 002, 003, 004...

---

### **Exemplo 2: Prefixo Sequencial**
```json
{
  "type": "prefix",
  "prefix": {
    "mode": "sequential",
    "prefixes": "M,F,PRO",
    "separator": "-",
    "min": 1,
    "max": 999
  }
}
```
**Atribui:** M-1, M-2, M-3, F-1, F-2...

---

### **Exemplo 3: Numérico Aleatório**
```json
{
  "type": "numeric",
  "numeric": {
    "mode": "random",
    "min": 100,
    "max": 999
  }
}
```
**Sorteia:** 347, 129, 891...

---

## 🔧 Onde Configurar:

### **config-kromi.html:**
```
https://192.168.1.219:1144/config-kromi.html?event=...
```

**Seção:** 🏷️ Nomenclatura dos Dorsais

**Cada tipo tem:**
1. **🎯 Modo de Atribuição** (sequencial/aleatório) ← Box laranja
2. Configurações específicas do tipo
3. Preview de exemplos

### **calibration-kromi.html:**
```
Step 2: READ-ONLY
Mostra configs do evento
Botão "Ir para Configurações"
```

---

## 📝 Trigger SQL (a atualizar):

O trigger `auto_assign_dorsal_number()` deve ler:
- `settings.dorsal_nomenclature.type` (numeric, prefix, etc.)
- `settings.dorsal_nomenclature.{type}.mode` (sequential, random)
- Outras configs conforme o tipo

**Exemplo:**
```sql
-- Lê a config
v_nomenclature := v_settings->'dorsal_nomenclature';
v_type := v_nomenclature->>'type'; -- 'numeric', 'prefix', etc.

IF v_type = 'numeric' THEN
  v_mode := v_nomenclature->'numeric'->>'mode'; -- 'sequential' ou 'random'
  v_min := (v_nomenclature->'numeric'->>'min')::int;
  v_max := (v_nomenclature->'numeric'->>'max')::int;
  
  IF v_mode = 'sequential' THEN
    -- Próximo número sequencial
  ELSE
    -- Sortear número
  END IF;
END IF;
```

---

## ✅ ESTÁ CORRETO AGORA!

✅ Atribuição DENTRO da nomenclatura  
✅ Cada tipo tem seu modo (sequencial/aleatório)  
✅ Configurações salvas em `events.settings.dorsal_nomenclature`  
✅ Calibração read-only  
✅ GPS Tracking usa `participant_code`  

**Estrutura lógica correta! 🎊**

---

**Queres que atualize o trigger SQL para usar essa nova estrutura?** 🔧

