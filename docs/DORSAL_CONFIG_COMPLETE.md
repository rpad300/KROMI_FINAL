# ✅ Configuração de Dorsais - IMPLEMENTADO!

## 🎊 O QUE FOI FEITO

### 1. **Seção Adicionada em config-kromi.html** ✅

**Localização:** Logo depois de "Configuração de Categorias"

**Seção:** 🔢 Atribuição de Dorsais

**Campos:**
- **Modo de Atribuição** (select):
  - Sequencial (1, 2, 3...)
  - Por Categoria (ranges)
  - Aleatório (sorteia)
- **Começar de:** (número)
- **Ranges por categoria** (se modo = per_category)
- **Min/Max** (se modo = random)

### 2. **Trigger SQL Criado** ✅

**Ficheiro:** `sql/auto-assign-dorsals.sql` (já executado!)

**Funciona:**
- Importação com dorsal → Mantém ✅
- Formulário sem dorsal → Atribui automático ✅

### 3. **JavaScript Implementado** ✅

**Funções criadas:**
- `saveDorsalConfig()` - Salva em `events.settings.dorsal_assignment`
- `loadDorsalConfig()` - Carrega ao abrir evento
- `handleDorsalModeChange()` - Alterna visualização
- `addCategoryRange()` - Adicionar ranges (placeholder)

**Integrado com:**
- Botão "💾 Guardar Configurações" salva dorsais
- Carrega automaticamente ao abrir evento

---

## 🔄 COMO USAR

### 1. **Abrir Configurações do Evento:**
```
https://192.168.1.219:1144/config-kromi.html?event=a6301479-56c8-4269-a42d-aa8a7650a575
```

### 2. **Procurar Seção:**
```
Scroll até: 🔢 Atribuição de Dorsais
```

### 3. **Configurar:**

**Exemplo 1: Sequencial desde 1**
- Modo: Sequencial
- Começar de: 1
- Guardar

**Exemplo 2: Sequencial desde 100**
- Modo: Sequencial  
- Começar de: 100
- Guardar

**Exemplo 3: Aleatório**
- Modo: Aleatório
- Dorsal Mínimo: 100
- Dorsal Máximo: 999
- Guardar

### 4. **Resultado:**
- Config salva em `events.settings.dorsal_assignment`
- Trigger usa essa config automaticamente
- Próximo participante via formulário recebe dorsal automático!

---

## 🧪 TESTAR

### 1. **Configurar:**
```
Config → Dorsais → Sequencial desde 100 → Guardar
```

### 2. **Criar Participante:**
```sql
-- Via SQL (simula formulário)
INSERT INTO participants (event_id, full_name, email, registration_status)
VALUES ('a6301479-56c8-4269-a42d-aa8a7650a575', 'Teste Auto', 'teste@email.com', 'paid')
RETURNING dorsal_number;

-- Deve retornar: 100 (ou próximo disponível)
```

### 3. **Verificar no GPS Tracking:**
- Aba QR Codes
- Ver participante com dorsal #100 ✅

---

## 📋 INTEGRAÇÃO CALIBRAÇÃO

**Próximo passo:** Adaptar `calibration-kromi.html` para **LER** essas configurações.

Em calibration, mudar de:
```javascript
// ANTES: Config hardcoded
const dorsalConfig = { mode: 'sequential', start_from: 1 };
```

Para:
```javascript
// AGORA: Ler de events.settings
const { data: event } = await supabase
    .from('events')
    .select('settings')
    .eq('id', eventId)
    .single();

const dorsalConfig = event.settings?.dorsal_assignment || {
    mode: 'sequential',
    start_from: 1
};

// Usar essa config na calibração!
```

---

## ✅ STATUS FINAL

✅ **UI criada** em config-kromi.html  
✅ **JavaScript implementado** (save/load)  
✅ **Trigger SQL** funcionando  
✅ **Integrado** com botão Guardar  
⏳ **Calibração** - Precisa adaptar para ler daqui  

---

## 🎊 ESTÁ PRONTO!

**Abre agora:**
```
https://192.168.1.219:1144/config-kromi.html?event=a6301479-56c8-4269-a42d-aa8a7650a575
```

**Scroll até:** 🔢 Atribuição de Dorsais

**Configura e salva!** ✅

**Depois adapto a calibração para ler daqui!** 🔧

---

**VisionKrono - Sistema Completo de Dorsais Automáticos! 🔢**

