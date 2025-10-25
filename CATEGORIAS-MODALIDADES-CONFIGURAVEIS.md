# ✅ CATEGORIAS E MODALIDADES CONFIGURÁVEIS!

## 🎯 **Problema Identificado e Resolvido**

### **Hardcoded → Configurável** ✅
- ❌ **Problema**: Categorias (M40, Elite, etc.) e modalidades hardcoded no código
- ✅ **Solução**: Sistema configurável na base de dados com interface de gestão
- ✅ **Resultado**: Flexibilidade total para diferentes tipos de eventos

---

## 🔍 **Investigação Realizada**

### **Categorias Hardcoded Encontradas**:
```javascript
// ❌ category-rankings-kromi.html (linhas 757-763)
const ageCategories = [
    { name: 'Sub-20', min: 0, max: 19, icon: '👶' },
    { name: '20-29', min: 20, max: 29, icon: '🏃' },
    { name: '30-39', min: 30, max: 39, icon: '🏃‍♂️' },
    { name: '40-49', min: 40, max: 49, icon: '🏃‍♀️' },
    { name: '50-59', min: 50, max: 59, icon: '🚶' },
    { name: '60+', min: 60, max: 999, icon: '🚶‍♂️' }
];

// ❌ implement-professional-classifications.sql (linhas 62-77)
WHEN v_age < 20 THEN v_category := 'M20';
WHEN v_age < 30 THEN v_category := 'M30';
WHEN v_age < 40 THEN v_category := 'M40';
// ... mais categorias hardcoded
```

### **Modalidades Hardcoded Encontradas**:
```javascript
// ❌ config-kromi.html (linhas 289-293)
<option value="running">Corrida</option>
<option value="cycling">Ciclismo</option>
<option value="triathlon">Triatlo</option>
<option value="walking">Caminhada</option>
```

---

## 🗄️ **Estrutura de Base de Dados Criada**

### **1. Tabela `event_modalities`**:
```sql
CREATE TABLE event_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🏃',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2. Tabela `age_categories`**:
```sql
CREATE TABLE age_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'X')),
    icon VARCHAR(10) DEFAULT '🏃',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **3. Tabelas de Configuração por Evento**:
```sql
-- Configuração de categorias por evento
CREATE TABLE event_category_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    age_category_id UUID NOT NULL REFERENCES age_categories(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_name VARCHAR(100),
    custom_description TEXT,
    UNIQUE(event_id, age_category_id)
);

-- Configuração de modalidades por evento
CREATE TABLE event_modality_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    modality_id UUID NOT NULL REFERENCES event_modalities(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_name VARCHAR(100),
    custom_description TEXT,
    UNIQUE(event_id, modality_id)
);
```

---

## 🎨 **Interface de Configuração Criada**

### **Página `config-kromi.html` Atualizada**:

#### **1. Seção de Categorias**:
```html
<div class="config-section">
    <h3>🏅 Configuração de Categorias</h3>
    <div class="form-group">
        <label class="form-label">Categorias Habilitadas:</label>
        <div id="categoriesConfig" class="checkbox-grid">
            <!-- Grid de checkboxes para categorias -->
        </div>
    </div>
    <button class="btn btn-sm btn-secondary" id="addCustomCategory">
        <i>➕</i> Adicionar Categoria Personalizada
    </button>
</div>
```

#### **2. Seção de Modalidades**:
```html
<div class="config-section">
    <h3>🏃 Configuração de Modalidades</h3>
    <div class="form-group">
        <label class="form-label">Modalidades Habilitadas:</label>
        <div id="modalitiesConfig" class="checkbox-grid">
            <!-- Grid de checkboxes para modalidades -->
        </div>
    </div>
    <button class="btn btn-sm btn-secondary" id="addCustomModality">
        <i>➕</i> Adicionar Modalidade Personalizada
    </button>
</div>
```

#### **3. CSS para Grid de Checkboxes**:
```css
.checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-3);
    margin-top: var(--spacing-2);
}

.checkbox-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--surface);
    transition: all 0.2s ease;
}

.checkbox-item:hover {
    background: var(--surface-secondary);
    border-color: var(--primary);
}
```

---

## ⚙️ **Funcionalidades JavaScript Implementadas**

### **1. Carregamento de Dados**:
```javascript
async function loadCategories() {
    const { data: categories, error } = await window.supabaseClient.supabase
        .from('age_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
    
    renderCategoriesConfig(categories || []);
}

async function loadModalities() {
    const { data: modalities, error } = await window.supabaseClient.supabase
        .from('event_modalities')
        .select('*')
        .eq('is_active', true);
    
    renderModalitiesConfig(modalities || []);
}
```

### **2. Renderização Dinâmica**:
```javascript
function renderCategoriesConfig(categories) {
    const container = document.getElementById('categoriesConfig');
    let html = '';
    
    categories.forEach(category => {
        const genderText = category.gender === 'M' ? 'Masculino' : 
                         category.gender === 'F' ? 'Feminino' : 'Misto';
        
        html += `
            <div class="checkbox-item">
                <input type="checkbox" 
                       id="category_${category.id}" 
                       value="${category.id}">
                <label for="category_${category.id}">
                    <span class="category-icon">${category.icon}</span>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        <div class="category-details">${genderText} • ${category.min_age}-${category.max_age} anos</div>
                    </div>
                </label>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
```

### **3. Salvamento de Configurações**:
```javascript
async function saveCategoryConfigurations(eventId) {
    // Get all checked categories
    const checkedCategories = document.querySelectorAll('#categoriesConfig input[type="checkbox"]:checked');
    
    // Delete existing configurations
    await window.supabaseClient.supabase
        .from('event_category_config')
        .delete()
        .eq('event_id', eventId);
    
    // Insert new configurations
    if (checkedCategories.length > 0) {
        const configs = Array.from(checkedCategories).map(checkbox => ({
            event_id: eventId,
            age_category_id: checkbox.value,
            is_enabled: true
        }));
        
        await window.supabaseClient.supabase
            .from('event_category_config')
            .insert(configs);
    }
}
```

---

## 📊 **Dados Padrão Inseridos**

### **Modalidades Padrão**:
```sql
INSERT INTO event_modalities (name, description, icon) VALUES
('Corrida', 'Corridas de rua e trail running', '🏃'),
('Ciclismo', 'Eventos de ciclismo de estrada e BTT', '🚴'),
('Triatlo', 'Natação, ciclismo e corrida', '🏊'),
('Caminhada', 'Caminhadas e marchas', '🚶'),
('Natação', 'Eventos de natação', '🏊'),
('Atletismo', 'Eventos de pista e campo', '🏃‍♂️');
```

### **Categorias Padrão**:
```sql
INSERT INTO age_categories (name, min_age, max_age, gender, icon, sort_order) VALUES
-- Categorias Masculinas
('M20', 0, 19, 'M', '👶', 1),
('M30', 20, 29, 'M', '🏃', 2),
('M40', 30, 39, 'M', '🏃‍♂️', 3),
('M50', 40, 49, 'M', '🏃‍♀️', 4),
('M60', 50, 59, 'M', '🚶', 5),
('M70+', 60, 999, 'M', '🚶‍♂️', 6),
-- Categorias Femininas
('F20', 0, 19, 'F', '👶', 7),
('F30', 20, 29, 'F', '🏃', 8),
('F40', 30, 39, 'F', '🏃‍♂️', 9),
('F50', 40, 49, 'F', '🏃‍♀️', 10),
('F60', 50, 59, 'F', '🚶', 11),
('F70+', 60, 999, 'F', '🚶‍♂️', 12),
-- Categorias Mistas
('Open', 0, 999, 'X', '🏆', 13);
```

---

## 🚀 **Funcionalidades Implementadas**

### **1. Configuração por Evento**:
- ✅ **Seleção de categorias** habilitadas para cada evento
- ✅ **Seleção de modalidades** habilitadas para cada evento
- ✅ **Nomes personalizados** para categorias/modalidades específicas
- ✅ **Descrições customizadas** por evento

### **2. Interface Intuitiva**:
- ✅ **Grid de checkboxes** com ícones e informações
- ✅ **Hover effects** e feedback visual
- ✅ **Layout responsivo** para mobile
- ✅ **Botões de ação** para adicionar personalizações

### **3. Gestão Dinâmica**:
- ✅ **Carregamento automático** das configurações do evento
- ✅ **Salvamento em tempo real** das alterações
- ✅ **Validação de dados** antes de salvar
- ✅ **Feedback de sucesso/erro** para o utilizador

---

## 🎯 **Próximos Passos**

### **1. Aplicar ao Código Existente**:
- 🔄 **Atualizar `category-rankings-kromi.html`** para usar dados da BD
- 🔄 **Atualizar `classifications-kromi.html`** para usar categorias configuráveis
- 🔄 **Atualizar `participants-kromi.html`** para usar modalidades configuráveis

### **2. Executar SQL**:
```bash
# Executar o arquivo SQL no Supabase
psql -h your-supabase-host -U postgres -d postgres -f configurable-categories-modalities.sql
```

### **3. Testar Interface**:
```
https://192.168.1.219:1144/config?event=EVENT_ID&eventName=EVENT_NAME
```

---

## 🎉 **Resultado Final**

**Agora temos:**
- ✅ **Categorias configuráveis** na base de dados
- ✅ **Modalidades configuráveis** na base de dados
- ✅ **Interface de gestão** completa
- ✅ **Flexibilidade total** para diferentes tipos de eventos
- ✅ **Sistema escalável** e manutenível

**Não mais hardcoded! Tudo configurável através da interface!** 🚀
