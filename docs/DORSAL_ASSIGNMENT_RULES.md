# 🔢 Regras de Atribuição de Dorsais

## 📋 Requisito

A atribuição de dorsais deve seguir 2 cenários:

### **Cenário 1: Lista de Participantes Carregada**
```
✅ Se ficheiro CSV/Excel importado TEM dorsal
→ Usar o dorsal que vem no ficheiro
```

**Exemplo:**
```csv
nome,email,dorsal
João Silva,joao@email.com,101
Maria Santos,maria@email.com,102
```
→ João fica com #101, Maria com #102

---

### **Cenário 2: Inscrição via Formulário**
```
✅ Se participante se inscreve via formulário
→ Atribuir dorsal sequencial automático
→ Baseado na regra configurada no evento
```

**Regras possíveis (em `events.settings`):**
```json
{
  "dorsal_assignment": {
    "mode": "sequential",
    "start_from": 1,
    "prefix": "",
    "per_category": false
  }
}
```

---

## ⚙️ Configurações de Atribuição

### **Modo Sequencial Simples:**
```json
{
  "dorsal_assignment": {
    "mode": "sequential",
    "start_from": 1
  }
}
```
**Resultado:** 1, 2, 3, 4, 5...

---

### **Sequencial com Prefixo:**
```json
{
  "dorsal_assignment": {
    "mode": "sequential",
    "start_from": 100,
    "prefix": "M"
  }
}
```
**Resultado:** M100, M101, M102...

---

### **Por Categoria:**
```json
{
  "dorsal_assignment": {
    "mode": "sequential",
    "per_category": true,
    "category_ranges": {
      "M20": { "start": 1, "end": 100 },
      "M30": { "start": 101, "end": 200 },
      "F20": { "start": 201, "end": 300 }
    }
  }
}
```
**Resultado:**
- Homem 20-29 anos → 1-100
- Homem 30-39 anos → 101-200
- Mulher 20-29 anos → 201-300

---

## 🔄 Lógica de Atribuição

### **Trigger/Função SQL:**

```sql
CREATE OR REPLACE FUNCTION assign_dorsal_number()
RETURNS TRIGGER AS $$
DECLARE
    v_settings JSONB;
    v_next_dorsal INTEGER;
    v_mode TEXT;
BEGIN
    -- Se já tem dorsal (importação), manter
    IF NEW.dorsal_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Buscar configurações do evento
    SELECT settings INTO v_settings
    FROM events
    WHERE id = NEW.event_id;
    
    v_mode := v_settings->'dorsal_assignment'->>'mode';
    
    -- Modo sequencial simples
    IF v_mode = 'sequential' OR v_mode IS NULL THEN
        -- Próximo dorsal disponível
        SELECT COALESCE(MAX(dorsal_number), 0) + 1 
        INTO v_next_dorsal
        FROM participants
        WHERE event_id = NEW.event_id;
        
        -- Aplicar start_from se configurado
        v_next_dorsal := GREATEST(
            v_next_dorsal,
            COALESCE((v_settings->'dorsal_assignment'->>'start_from')::INTEGER, 1)
        );
        
        NEW.dorsal_number := v_next_dorsal;
    END IF;
    
    -- TODO: Implementar outros modos (per_category, etc.)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
CREATE TRIGGER assign_dorsal_before_insert
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION assign_dorsal_number();
```

---

## 📊 **Fluxo Completo:**

### **Importação de Lista:**
```
1. Upload CSV com dorsais
2. Sistema lê dorsal do ficheiro
3. INSERT com dorsal_number preenchido
4. Trigger vê que já tem → Mantém
5. ✅ Dorsal preservado da lista
```

### **Inscrição via Formulário:**
```
1. Participante preenche formulário
2. Submissão aprovada/paga
3. INSERT SEM dorsal_number (NULL)
4. Trigger detecta NULL
5. Busca config do evento
6. Calcula próximo dorsal sequencial
7. Atribui automaticamente
8. ✅ Dorsal atribuído: #123
```

---

## 🎯 **Para GPS Tracking:**

O módulo GPS **apenas LÊ** o `dorsal_number` que já foi atribuído!

```javascript
// Na aba QR Codes
#${p.dorsal_number} ${p.full_name}

// Código: ${p.participant_code}
```

**Não faz atribuição** - isso é responsabilidade do sistema de participantes!

---

## 📝 **Implementação Recomendada:**

### **1. Adicionar campo em `events.settings`:**
```sql
UPDATE events 
SET settings = settings || jsonb_build_object(
    'dorsal_assignment', jsonb_build_object(
        'mode', 'sequential',
        'start_from', 1,
        'prefix', '',
        'per_category', false
    )
)
WHERE id = 'event-uuid';
```

### **2. Criar trigger** (SQL acima)

### **3. Testar:**
```sql
-- Inserir participante SEM dorsal
INSERT INTO participants (event_id, full_name, email)
VALUES ('event-uuid', 'Teste Auto', 'teste@email.com')
RETURNING dorsal_number;

-- Deve retornar próximo número disponível!
```

---

## ✅ **Para o GPS Tracking:**

**Está pronto!** Apenas mostra o dorsal que já existe:
- Se veio de import → Mostra o importado
- Se veio de formulário → Mostra o auto-atribuído

**Não precisa fazer nada no GPS Tracking!** 🎊

---

**Queres que implemente o trigger de atribuição automática agora?** 🔢
