# 🗄️ COMO EXECUTAR O SQL NO SUPABASE

## 🎯 **Problema Resolvido**

### **Tabelas Não Existem** ❌
- ❌ **Erro**: `relation "event_modalities" does not exist`
- ❌ **Erro**: `relation "age_categories" does not exist`
- ✅ **Solução**: Executar SQL para criar as tabelas

---

## 📋 **Passos para Executar**

### **1. Aceder ao Supabase**:
1. Vá para [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto VisionKrono

### **2. Abrir SQL Editor**:
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**

### **3. Executar o SQL**:
1. Copie todo o conteúdo do arquivo "`../sql/create-tables-simple.sql"
2. Cole no editor SQL
3. Clique em **"Run"** ou pressione `Ctrl+Enter`

### **4. Verificar Criação**:
1. Vá para **"Table Editor"** no menu lateral
2. Verifique se as tabelas foram criadas:
   - ✅ `event_modalities`
   - ✅ `age_categories`
   - ✅ `event_category_config`
   - ✅ `event_modality_config`

---

## 📄 **Conteúdo do SQL**

### **Arquivo: "`../sql/create-tables-simple.sql"**

```sql
-- =====================================================
-- VISIONKRONO - CRIAÇÃO DE TABELAS PARA CATEGORIAS E MODALIDADES
-- =====================================================

-- 1. TABELA DE MODALIDADES DE EVENTO
CREATE TABLE IF NOT EXISTS event_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🏃',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CATEGORIAS POR IDADE
CREATE TABLE IF NOT EXISTS age_categories (
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

-- 3. TABELA DE CONFIGURAÇÃO DE CATEGORIAS POR EVENTO
CREATE TABLE IF NOT EXISTS event_category_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    age_category_id UUID NOT NULL REFERENCES age_categories(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_name VARCHAR(100),
    custom_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, age_category_id)
);

-- 4. TABELA DE CONFIGURAÇÃO DE MODALIDADES POR EVENTO
CREATE TABLE IF NOT EXISTS event_modality_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    modality_id UUID NOT NULL REFERENCES event_modalities(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_name VARCHAR(100),
    custom_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, modality_id)
);

-- 5. INSERIR MODALIDADES PADRÃO
INSERT INTO event_modalities (name, description, icon) VALUES
('Corrida', 'Corridas de rua e trail running', '🏃'),
('Ciclismo', 'Eventos de ciclismo de estrada e BTT', '🚴'),
('Triatlo', 'Natação, ciclismo e corrida', '🏊'),
('Caminhada', 'Caminhadas e marchas', '🚶'),
('Natação', 'Eventos de natação', '🏊'),
('Atletismo', 'Eventos de pista e campo', '🏃‍♂️')
ON CONFLICT (name) DO NOTHING;

-- 6. INSERIR CATEGORIAS PADRÃO
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
('Open', 0, 999, 'X', '🏆', 13)
ON CONFLICT (name) DO NOTHING;

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_event_category_config_event_id ON event_category_config(event_id);
CREATE INDEX IF NOT EXISTS idx_event_category_config_category_id ON event_category_config(age_category_id);
CREATE INDEX IF NOT EXISTS idx_event_modality_config_event_id ON event_modality_config(event_id);
CREATE INDEX IF NOT EXISTS idx_event_modality_config_modality_id ON event_modality_config(modality_id);
CREATE INDEX IF NOT EXISTS idx_age_categories_gender_age ON age_categories(gender, min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_age_categories_sort_order ON age_categories(sort_order);
```

---

## ✅ **Resultado Esperado**

### **Após Executar o SQL**:
- ✅ **4 novas tabelas** criadas
- ✅ **6 modalidades** inseridas (Corrida, Ciclismo, etc.)
- ✅ **13 categorias** inseridas (M20, M30, F20, etc.)
- ✅ **Índices** criados para performance
- ✅ **Relacionamentos** configurados corretamente

### **Verificação**:
```sql
-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('event_modalities', 'age_categories', 'event_category_config', 'event_modality_config');

-- Verificar dados inseridos
SELECT COUNT(*) as total_modalities FROM event_modalities;
SELECT COUNT(*) as total_categories FROM age_categories;
```

---

## 🚀 **Próximos Passos**

### **1. Após Executar o SQL**:
- ✅ **Testar a página de configuração**: `https://192.168.1.219:1144/config`
- ✅ **Verificar se as categorias aparecem** nos checkboxes
- ✅ **Verificar se as modalidades aparecem** nos checkboxes

### **2. Se Houver Erros**:
- ❌ **Verificar se a tabela `events` existe**
- ❌ **Verificar permissões de criação de tabelas**
- ❌ **Verificar se há conflitos de nomes**

### **3. Teste de Funcionamento**:
```javascript
// Testar no console do browser
console.log('Testando conexão...');
window.supabaseClient.supabase
    .from('event_modalities')
    .select('*')
    .then(result => console.log('Modalidades:', result.data));
```

---

## 🎯 **Problema Resolvido!**

**Execute o SQL no Supabase e as tabelas serão criadas!**

**Depois poderá testar a interface de configuração!** ✨
