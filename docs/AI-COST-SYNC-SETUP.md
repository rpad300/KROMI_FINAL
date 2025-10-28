# Configuração de Sincronização de Custos de IA

## Visão Geral

O sistema de **AI Cost Stats** pode operar em dois modos:

1. **Estimativa baseada em logs da aplicação** (ativo por padrão)
2. **Sincronização real com Google Cloud Billing API** (requer configuração)

## Modo 1: Estimativa Baseada em Logs (Padrão)

### Como Funciona

- Analisa as imagens processadas na tabela `images`
- Calcula custos baseado em preços públicos conhecidos
- Estima uso de Gemini baseado em padrões de uso

### Vantagens

- ✅ Não requer configuração adicional
- ✅ Funciona imediatamente
- ✅ Não requer credenciais do Google Cloud

### Limitações

- ⚠️ São estimativas, não custos exatos
- ⚠️ Pode não capturar todos os tipos de uso

## Modo 2: Sincronização Real com Google Cloud

### Requisitos

1. Projeto Google Cloud ativo
2. Billing Account configurado
3. API de Cloud Billing ativada
4. Service Account com permissões de billing

### Passo 1: Criar Service Account

1. Aceda ao Google Cloud Console
2. IAM & Admin → Service Accounts
3. Criar Service Account:
   - Nome: `visionkrono-billing-reader`
   - Role: `Billing Account Viewer`
4. Criar chave JSON e fazer download

### Passo 2: Ativar API

```bash
gcloud services enable cloudbilling.googleapis.com
```

### Passo 3: Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# Google Cloud Billing
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_BILLING_ACCOUNT_ID=012345-6789AB-CDEF01
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Passo 4: Instalar Dependência

```bash
npm install googleapis
```

### Passo 5: Reiniciar Servidor

```bash
npm restart
```

## Popular Dados Históricos

Para popular dados realistas de 20 a 28 de outubro:

```bash
# No Supabase SQL Editor, execute:
sql/populate-ai-costs-realistic.sql
```

Isto irá criar:
- ~484 registos de processamento de imagem (Google Vision API)
- ~168 registos de uso de Gemini
- Custos distribuídos realisticamente ao longo de 9 dias
- Pico de uso no dia 26 (evento)

## Sincronização Automática

### Frequência

- Por padrão: **a cada 6 horas**
- Sincroniza: **últimas 24 horas**

### Manual

Na interface AI Cost Stats:
1. Clique em "🔄 Sincronizar agora"
2. Aguarde confirmação
3. Dados serão atualizados

### Rate Limiting

- Máximo: 1 sincronização a cada 5 minutos
- Proteção contra uso excessivo da API

## Verificar Sincronização

### No Backend (logs do servidor)

```
💰 [AI-COST-SYNC] Sistema de sincronização inicializado
💰 [AI-COST-SYNC] Sincronização automática ativada (a cada 6h)
💰 [AI-COST-SYNC] 🔄 Executando sincronização automática...
💰 [AI-COST-SYNC] Período: 2025-10-27T... até 2025-10-28T...
💰 [AI-COST-SYNC] Estimando custos de logs da aplicação...
💰 [AI-COST-SYNC] Processamentos de imagem encontrados: 28
💰 [AI-COST-SYNC] ✅ Estimativa concluída
💰 [AI-COST-SYNC] ✅ Sincronização concluída
💰 [AI-COST-SYNC] Registos: 28
💰 [AI-COST-SYNC] Custo total: $ 0.0420
```

### No Frontend (AI Cost Stats)

- Indicador "Última sincronização" é atualizado
- Dados aparecem nas tabelas e gráficos
- Exportação CSV disponível

## Custos Estimados

### Google Vision API

- **Preço**: $1.50 por 1000 imagens
- **Uso típico**: 30-150 imagens/dia
- **Custo estimado**: $0.045 - $0.225/dia

### Gemini 1.5 Flash

- **Input**: $0.075 por 1M tokens
- **Output**: $0.225 por 1M tokens
- **Uso típico**: 50K-200K tokens/dia
- **Custo estimado**: $0.004 - $0.045/dia

### Gemini 1.5 Pro

- **Input**: $1.25 por 1M tokens
- **Output**: $3.75 por 1M tokens
- **Uso típico**: 10K-50K tokens/dia (ocasional)
- **Custo estimado**: $0.013 - $0.190/dia

### Total Estimado Mensal

- **Uso normal**: ~$2-5/mês
- **Uso com eventos**: ~$8-15/mês

## Troubleshooting

### Erro: "Google Cloud Billing API não configurado"

**Causa**: Variáveis de ambiente não configuradas

**Solução**: Configure as variáveis no `.env` ou continue usando estimativas

### Nenhum dado aparece

**Causa**: Tabela vazia

**Solução**: Execute o script `populate-ai-costs-realistic.sql`

### Sincronização falha

**Verificar**:
1. Service Account tem permissões corretas?
2. API de Billing está ativada?
3. Caminho do JSON está correto?
4. Billing Account ID está correto?

### Custos parecem muito baixos

**Normal!** APIs de IA modernas são muito baratas:
- Vision API: frações de centavo por imagem
- Gemini Flash: centavos por milhões de tokens

## Próximos Passos

1. **Execute o SQL** para ver dados históricos
2. **Configure Google Cloud Billing** (opcional) para custos exatos
3. **Monitore regularmente** usando a interface

---

**Documentação criada em**: 28 de outubro de 2025  
**Versão**: 1.0

