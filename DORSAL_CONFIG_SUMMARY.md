# 📋 Sistema de Dorsais - Resumo Completo

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Trigger Automático de Atribuição** ✅
**Ficheiro:** `sql/auto-assign-dorsals.sql` (EXECUTADO)

**Funciona assim:**
- Se participante **tem dorsal** (importação) → Mantém ✅
- Se participante **sem dorsal** (formulário) → Atribui automático ✅

**3 Modos suportados:**
- `sequential` - Sequencial simples (1, 2, 3...)
- `per_category` - Por categoria (M20: 1-100, F20: 101-200...)
- `random` - Sortear dentro de um range

---

### 2. **GPS Tracking Usa Dorsais Existentes** ✅
**Ficheiro:** `src/gps-tracking-kromi.html`

**Aba QR Codes mostra:**
- Dorsal do participante (já atribuído)
- Código único (`participant_code`)
- QR Code gerado
- Botões: Ver QR, Copiar

**NÃO cria dorsais novos!** Apenas mostra o que já existe. ✅

---

## 🔄 **O QUE FALTA FAZER:**

### **MOVER Configuração de Dorsais:**

**De:** `calibration-kromi.html` (Step 2: Nomenclatura dos Dorsais)  
**Para:** `config-kromi.html` (Seção nova: Configuração de Dorsais)

**Motivo:** Faz mais sentido estar em Configurações!

---

## 📝 **Implementação Necessária:**

### **1. Adicionar Seção em config-kromi.html:**

```html
<!-- Seção: Configuração de Dorsais -->
<div class="config-section">
    <h3>🔢 Atribuição de Dorsais</h3>
    <p class="text-secondary">
        Configure como os dorsais são atribuídos automaticamente
    </p>
    
    <div class="form-group">
        <label>Modo de Atribuição:</label>
        <select id="dorsal-mode" class="form-control">
            <option value="sequential">Sequencial</option>
            <option value="per_category">Por Categoria</option>
            <option value="random">Aleatório</option>
        </select>
    </div>
    
    <div class="form-group">
        <label>Começar de:</label>
        <input type="number" id="dorsal-start" class="form-control" value="1">
    </div>
    
    <div id="category-ranges" style="display:none;">
        <!-- Configuração de ranges por categoria -->
    </div>
    
    <button class="btn btn-primary" onclick="saveDorsalConfig()">
        💾 Guardar Configuração
    </button>
</div>
```

### **2. JavaScript para Salvar:**

```javascript
async function saveDorsalConfig() {
    const mode = document.getElementById('dorsal-mode').value;
    const startFrom = parseInt(document.getElementById('dorsal-start').value);
    
    const dorsalConfig = {
        mode: mode,
        start_from: startFrom
    };
    
    // Se per_category, adicionar ranges
    if (mode === 'per_category') {
        dorsalConfig.category_ranges = {
            // Ler dos inputs configurados
        };
    }
    
    // Atualizar evento
    const { error } = await supabase
        .from('events')
        .update({
            settings: {
                ...currentEventSettings,
                dorsal_assignment: dorsalConfig
            }
        })
        .eq('id', currentEventId);
    
    if (!error) {
        alert('✅ Configuração salva!');
    }
}
```

### **3. Calibração Lê Configuração:**

Em `calibration-kromi.html`:
```javascript
// Buscar config do evento
const { data: event } = await supabase
    .from('events')
    .select('settings')
    .eq('id', eventId)
    .single();

const dorsalConfig = event.settings?.dorsal_assignment || {
    mode: 'sequential',
    start_from: 1
};

// Usar essa config na calibração
```

---

## 🎯 **Status Atual:**

✅ **Trigger criado** - Atribui dorsais automaticamente  
✅ **GPS Tracking** - Usa dorsais existentes  
✅ **Configuração default** - Sequencial desde 1  
⏳ **UI de Configuração** - Falta criar em config-kromi.html  
⏳ **Calibração usar config** - Falta adaptar  

---

## 📊 **Próximo Passo:**

**Queres que eu:**
1. Crie a seção de configuração de dorsais em `config-kromi.html`?
2. Adapte a calibração para ler essas configurações?

Ou está OK assim e ajustas manualmente via SQL quando necessário?

---

**GPS Tracking está 100% funcional independente disso!** ✅

Usa os dorsais que já existem, seja de onde vieram! 🎊

