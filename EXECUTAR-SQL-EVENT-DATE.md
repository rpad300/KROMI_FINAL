# 🚀 EXECUTAR SQL - Converter event_date para TIMESTAMPTZ

## ⚠️ AÇÃO NECESSÁRIA

A coluna `event_date` na tabela `events` está como tipo `DATE`, o que não permite armazenar hora. 
Este SQL converte para `TIMESTAMPTZ` para suportar data + hora.

## 📋 Como Executar

### Opção 1: Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie o conteúdo do arquivo: `sql/FIX-EVENT-DATE-TIMESTAMP-EXECUTAR.sql`
4. Cole no editor SQL
5. Clique em **RUN** ou pressione `Ctrl+Enter`

### Opção 2: Via linha de comando (psql)

```bash
psql -h [seu-host] -U postgres -d postgres -f sql/FIX-EVENT-DATE-TIMESTAMP-EXECUTAR.sql
```

## ✅ Verificação

Após executar, verifique:

```sql
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name = 'event_date';
```

Deve retornar: `data_type = 'timestamp with time zone'`

## 📝 O que o script faz:

1. ✅ Verifica o tipo atual da coluna
2. ✅ Converte valores existentes preservando a data (hora será 00:00:00)
3. ✅ Altera o tipo da coluna de `DATE` para `TIMESTAMPTZ`
4. ✅ Verifica o resultado

## ⚠️ IMPORTANTE

- Os eventos existentes terão hora `00:00:00` por padrão
- Após a conversão, você poderá salvar e recuperar hora corretamente
- A conversão é segura e não perde dados (apenas adiciona hora padrão)

