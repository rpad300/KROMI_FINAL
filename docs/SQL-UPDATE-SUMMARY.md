# ✅ Atualização SQL para Suporte OpenAI - Resumo

## 🎯 Objetivo
Adicionar campos na base de dados para armazenar:
1. Campo `openai_model` na tabela `event_configurations`
2. `OPENAI_API_KEY` na tabela `platform_configurations`
3. Atualizar funções SQL para suportar modelo OpenAI

---

## 📝 Script SQL Criado

### **Arquivo: `sql/add-openai-support.sql`**

O script realiza:

#### **1. Adiciona Campo `openai_model`**
```sql
ALTER TABLE event_configurations 
ADD COLUMN openai_model TEXT DEFAULT 'gpt-4o';
```

#### **2. Atualiza Constraint para Aceitar 'openai'**
```sql
ALTER TABLE event_configurations 
DROP CONSTRAINT IF EXISTS event_configurations_processor_type_check;

ALTER TABLE event_configurations 
ADD CONSTRAINT event_configurations_processor_type_check 
CHECK (processor_type IN ('gemini', 'openai', 'google-vision', 'ocr', 'hybrid', 'manual'));
```

#### **3. Adiciona OPENAI_API_KEY**
```sql
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description)
VALUES 
    ('OPENAI_API_KEY', '', 'api_key', true, 'Chave da API do OpenAI')
ON CONFLICT (config_key) DO UPDATE SET 
    description = EXCLUDED.description;
```

#### **4. Atualiza Função `get_event_processor_config`**
```sql
CREATE OR REPLACE FUNCTION get_event_processor_config(event_id_param UUID)
RETURNS TABLE (
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence DECIMAL(3,2),
    openai_model TEXT  -- ← NOVO
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.processor_type,
        ec.processor_speed,
        ec.processor_confidence,
        COALESCE(ec.openai_model, 'gpt-4o'::TEXT) as openai_model
    FROM event_configurations ec
    WHERE ec.event_id = event_id_param
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

#### **5. Atualiza Função `update_event_processor_config`**
```sql
CREATE OR REPLACE FUNCTION update_event_processor_config(
    event_id_param UUID,
    processor_type_param TEXT,
    processor_speed_param TEXT,
    processor_confidence_param DECIMAL(3,2),
    openai_model_param TEXT DEFAULT 'gpt-4o'  -- ← NOVO
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validações...
    
    INSERT INTO event_configurations (
        event_id,
        processor_type,
        processor_speed,
        processor_confidence,
        openai_model,  -- ← NOVO
        updated_at
    ) VALUES (
        event_id_param,
        processor_type_param,
        processor_speed_param,
        processor_confidence_param,
        openai_model_param,  -- ← NOVO
        NOW()
    )
    ON CONFLICT (event_id) 
    DO UPDATE SET
        processor_type = EXCLUDED.processor_type,
        processor_speed = EXCLUDED.processor_speed,
        processor_confidence = EXCLUDED.processor_confidence,
        openai_model = EXCLUDED.openai_model,  -- ← NOVO
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 Como Executar

### **Opção 1: Supabase Dashboard**
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo de `sql/add-openai-support.sql`
5. Clique em **Run**

### **Opção 2: Terminal (se tiver psql configurado)**
```bash
psql -h your-supabase-host \
     -U postgres \
     -d postgres \
     -f sql/add-openai-support.sql
```

---

## ✅ Alterações de Código

### **Frontend: `src/config-kromi.html`**

#### **Salvando Configuração:**
```javascript
await window.supabaseClient.supabase.rpc('update_event_processor_config', {
    event_id_param: currentEvent.id,
    processor_type_param: config.processorType,
    processor_speed_param: config.processorSpeed,
    processor_confidence_param: config.processorConfidence,
    openai_model_param: config.openaiModel || 'gpt-4o'  // ← NOVO
});
```

#### **Carregando Configuração:**
```javascript
const config = {
    processorType: data[0].processor_type,
    processorSpeed: data[0].processor_speed,
    processorConfidence: parseFloat(data[0].processor_confidence),
    openaiModel: data[0].openai_model || 'gpt-4o'  // ← NOVO
};
```

### **Backend: `src/background-processor.js`**

#### **Carregando Modelo:**
```javascript
return {
    processorType: config[0].processor_type,
    processorSpeed: config[0].processor_speed,
    processorConfidence: parseFloat(config[0].processor_confidence),
    openaiModel: config[0].openai_model || 'gpt-4o'  // ← NOVO
};
```

#### **Usando Modelo:**
```javascript
this.openaiModel = eventConfig.openaiModel || 'gpt-4o';

const requestBody = JSON.stringify({
    model: this.openaiModel || "gpt-4o",  // ← Usa modelo configurado
    messages: [...]
});
```

---

## 📊 Estrutura Final

### **Tabela `event_configurations`**
```
┌─────────────────────────────┬──────────────┬─────────────┐
│ Campo                       │ Tipo         │ Valor       │
├─────────────────────────────┼──────────────┼─────────────┤
│ event_id                    │ UUID         │ ...         │
│ processor_type              │ TEXT         │ gemini/openai │
│ processor_speed             │ TEXT         │ balanced    │
│ processor_confidence        │ DECIMAL(3,2) │ 0.7        │
│ openai_model                │ TEXT         │ gpt-4o     │ ← NOVO
└─────────────────────────────┴──────────────┴─────────────┘
```

### **Tabela `platform_configurations`**
```
┌─────────────────────┬───────────┬─────────────┬────────────┐
│ config_key          │ Valor     │ Tipo        │ Encriptado │
├─────────────────────┼───────────┼─────────────┼────────────┤
│ GEMINI_API_KEY      │ sk-...    │ api_key     │ true       │
│ GOOGLE_VISION_API   │ sk-...    │ api_key     │ true       │
│ OPENAI_API_KEY      │ sk-...    │ api_key     │ true       │ ← NOVO
└─────────────────────┴───────────┴─────────────┴────────────┘
```

---

## ✅ Checklist de Implementação

- [x] Script SQL criado
- [x] Campo `openai_model` adicionado
- [x] Constraint atualizado para aceitar 'openai'
- [x] `OPENAI_API_KEY` adicionado à platform_configurations
- [x] Função `get_event_processor_config` atualizada
- [x] Função `update_event_processor_config` atualizada
- [x] Código frontend atualizado
- [x] Código backend atualizado
- [x] Documentação criada

---

## 🎉 Resultado

Após executar o script SQL:
- ✅ Campo `openai_model` salva na base de dados
- ✅ `OPENAI_API_KEY` gerenciada pela plataforma
- ✅ Funções SQL retornam modelo selecionado
- ✅ Interface sincronizada com base de dados

**Próximo passo**: Executar `sql/add-openai-support.sql` na base de dados! 🚀

