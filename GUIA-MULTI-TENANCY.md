# 🏢 Guia de Multi-Tenancy (Controlo por Organizador)

## 📋 O Que é Multi-Tenancy?

Multi-tenancy permite que **múltiplos organizadores** usem a mesma plataforma, mas cada um vê apenas os **seus próprios dados**.

### **Antes (Sem Multi-Tenancy):**
- ❌ Todos veem todos os eventos
- ❌ Sem separação de dados
- ❌ Apenas controlo por role (admin/event_manager)

### **Depois (Com Multi-Tenancy):**
- ✅ Cada organizador vê apenas os seus eventos
- ✅ Separação clara de dados
- ✅ Admin vê tudo, organizadores veem apenas o seu

---

## 🚀 Como Implementar

### **Opção 1: Script Completo (RECOMENDADO)**

Execute o ficheiro "`../sql/add-multi-tenancy.sql" no Supabase SQL Editor.

**O que faz:**
1. ✅ Cria tabela `organizers`
2. ✅ Adiciona `organizer_id` em `user_profiles`
3. ✅ Adiciona `organizer_id` em `events`
4. ✅ Cria "Organizador Padrão" e migra dados existentes
5. ✅ Atualiza todas as policies com controlo por organizador

### **Opção 2: Passo a Passo (Para Entender Melhor)**

#### **Passo 1: Criar Tabela de Organizadores**

```sql
CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_organizers_is_active ON organizers(is_active);
CREATE INDEX idx_organizers_created_by ON organizers(created_by);
```

#### **Passo 2: Adicionar Colunas organizer_id**

```sql
-- Em user_profiles
ALTER TABLE user_profiles 
ADD COLUMN organizer_id UUID REFERENCES organizers(id);

CREATE INDEX idx_user_profiles_organizer_id ON user_profiles(organizer_id);

-- Em events
ALTER TABLE events 
ADD COLUMN organizer_id UUID REFERENCES organizers(id);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
```

#### **Passo 3: Criar Organizador Padrão e Migrar Dados**

```sql
-- Criar organizador padrão
INSERT INTO organizers (name, email, is_active)
VALUES ('Organizador Padrão', 'admin@visionkrono.com', true)
RETURNING id;

-- Copiar o ID retornado e usar nas queries abaixo
-- Substitua <ID_DO_ORGANIZADOR> pelo UUID retornado

-- Migrar utilizadores existentes
UPDATE user_profiles 
SET organizer_id = '<ID_DO_ORGANIZADOR>'
WHERE organizer_id IS NULL;

-- Migrar eventos existentes
UPDATE events 
SET organizer_id = '<ID_DO_ORGANIZADOR>'
WHERE organizer_id IS NULL;
```

#### **Passo 4: Atualizar Policies**

Executa o script "`../sql/add-multi-tenancy.sql" ou copia as policies do PASSO 5 e 6.

---

## 📊 Estrutura Final

### **Tabela: organizers**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| name | TEXT | Nome do organizador |
| email | TEXT | Email de contacto |
| phone | TEXT | Telefone |
| address | TEXT | Morada |
| website | TEXT | Website |
| logo_url | TEXT | URL do logotipo |
| is_active | BOOLEAN | Organizador ativo? |
| created_at | TIMESTAMPTZ | Data de criação |
| created_by | UUID | Quem criou |

### **user_profiles (Nova Coluna)**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| organizer_id | UUID | A que organizador pertence |

### **events (Nova Coluna)**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| organizer_id | UUID | Qual organizador criou o evento |

---

## 🔒 Regras de Acesso (Novas Policies)

### **Para event_configurations:**

| Role | Leitura | Inserção/Edição | Exclusão |
|------|---------|-----------------|----------|
| Admin | ✅ Todos os organizadores | ✅ Todos os organizadores | ✅ Sim |
| Event Manager | ✅ Apenas seu organizador | ✅ Apenas seu organizador | ❌ Não |
| User | ✅ Apenas seu organizador | ❌ Não | ❌ Não |

### **Para events:**

| Role | Leitura | Inserção/Edição | Exclusão |
|------|---------|-----------------|----------|
| Admin | ✅ Todos os organizadores | ✅ Todos os organizadores | ✅ Sim |
| Event Manager | ✅ Apenas seu organizador | ✅ Apenas seu organizador | ❌ Não |
| User | ✅ Apenas seu organizador | ❌ Não | ❌ Não |

---

## 🧪 Como Testar

### **1. Criar Novo Organizador**

```sql
INSERT INTO organizers (name, email)
VALUES ('Clube Desportivo XYZ', 'contato@clubexyz.com')
RETURNING id;
```

### **2. Atribuir Utilizador ao Organizador**

```sql
-- Substitua <ORGANIZER_ID> pelo ID retornado acima
-- Substitua <USER_EMAIL> pelo email do utilizador

UPDATE user_profiles 
SET organizer_id = '<ORGANIZER_ID>'
WHERE email = '<USER_EMAIL>';
```

### **3. Criar Evento para o Organizador**

```sql
INSERT INTO events (
    name, 
    organizer_id,
    event_date,
    created_by
)
VALUES (
    'Corrida XYZ 2025',
    '<ORGANIZER_ID>',
    '2025-06-15',
    auth.uid()
);
```

### **4. Verificar Isolamento**

```sql
-- Como admin: deve ver TODOS os eventos
SELECT id, name, organizer_id FROM events;

-- Como event_manager do Organizador A:
-- deve ver apenas eventos do Organizador A

-- Como event_manager do Organizador B:
-- deve ver apenas eventos do Organizador B
```

---

## 📱 Atualizar Frontend

### **1. Mostrar Organizador na UI**

No `auth-system.js` ou onde carregar o perfil:

```javascript
// Carregar informação do organizador
const { data: organizerInfo } = await supabase
    .from('organizers')
    .select('id, name, logo_url')
    .eq('id', userProfile.organizer_id)
    .single();

console.log('Organizador:', organizerInfo.name);
```

### **2. Filtrar Eventos por Organizador (Opcional)**

As policies já fazem isto automaticamente, mas se quiseres filtrar manualmente:

```javascript
// A policy já filtra, mas podes ser explícito
const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', userProfile.organizer_id);
```

### **3. Interface de Gestão de Organizadores (Admin)**

Criar página para admins gerirem organizadores:

```javascript
// Listar organizadores
const { data: organizers } = await supabase
    .from('organizers')
    .select('*')
    .order('name');

// Criar organizador
const { data, error } = await supabase
    .from('organizers')
    .insert({
        name: 'Novo Organizador',
        email: 'contato@exemplo.com'
    });
```

---

## 🔧 Gestão de Organizadores

### **Criar Organizador**

```sql
INSERT INTO organizers (name, email, phone, website)
VALUES (
    'Associação Desportiva ABC',
    'contato@abc.com',
    '+351 912 345 678',
    'https://www.abc.com'
);
```

### **Listar Organizadores**

```sql
SELECT 
    id,
    name,
    email,
    is_active,
    (SELECT COUNT(*) FROM events WHERE organizer_id = organizers.id) as total_eventos,
    (SELECT COUNT(*) FROM user_profiles WHERE organizer_id = organizers.id) as total_utilizadores
FROM organizers
ORDER BY name;
```

### **Desativar Organizador**

```sql
UPDATE organizers 
SET is_active = false
WHERE id = '<ORGANIZER_ID>';
```

### **Transferir Utilizadores Entre Organizadores**

```sql
-- Mover todos os utilizadores do Organizador A para Organizador B
UPDATE user_profiles 
SET organizer_id = '<NOVO_ORGANIZER_ID>'
WHERE organizer_id = '<ANTIGO_ORGANIZER_ID>';
```

---

## ⚠️ Cuidados Importantes

### **1. Migração de Dados**

- ✅ Todos os dados existentes são atribuídos ao "Organizador Padrão"
- ⚠️ Revê e redistribui utilizadores/eventos aos organizadores corretos

### **2. Integridade Referencial**

- ⚠️ Se apagar um organizador, tens de transferir os dados primeiro
- ✅ Use `ON DELETE RESTRICT` nas foreign keys (já implementado)

### **3. Performance**

- ✅ Índices criados em `organizer_id` para queries rápidas
- ✅ Policies otimizadas com EXISTS

### **4. Segurança**

- ✅ Admin sempre vê tudo (para suporte/debug)
- ✅ Event Manager isolado no seu organizador
- ✅ RLS garante isolamento a nível de base de dados

---

## 🆘 Troubleshooting

### **"Não consigo ver eventos após migração"**

Verifica se tens `organizer_id`:

```sql
SELECT 
    email,
    role,
    profile_type,
    organizer_id
FROM user_profiles
WHERE user_id = auth.uid();
```

Se `organizer_id` for NULL, atribui um:

```sql
UPDATE user_profiles
SET organizer_id = (SELECT id FROM organizers LIMIT 1)
WHERE user_id = auth.uid();
```

### **"Policies não estão a funcionar"**

Verifica se as policies têm a lógica de organizador:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'events'
AND policyname = 'read_events';
```

---

## 📚 Recursos

- [Documentação RLS Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Multi-Tenancy Patterns](https://supabase.com/blog/multi-tenancy)

---

**Última atualização:** 2025-10-26  
**Versão:** 1.0  
**Script:** add-multi-tenancy.sql

