# Módulo AI Cost Stats

## Visão Geral

O módulo **AI Cost Stats** centraliza a visualização e análise de custos reais de IA da plataforma em uma página única, exclusiva para administradores.

## Objetivo

Fornecer aos administradores uma ferramenta completa para:
- Visualizar custos reais de IA da plataforma
- Analisar gastos por período, serviço, modelo e evento
- Exportar dados para análise externa
- Monitorizar evolução temporal dos custos

## Acesso e Permissões

### Perfis Autorizados

- **Administrador**: Acesso completo a todas as funcionalidades
  - Visualização de todos os dados
  - Aplicação de filtros
  - Exportação de dados
  - Sincronização manual de custos

### Outros Perfis

- Não veem o item de menu "AI Cost Stats"
- Não acedem à página
- Não acedem às APIs de custos (bloqueio a nível de backend)

## Arquitetura

### Componentes

1. **Base de Dados** (`sql/create-ai-cost-stats-system.sql`)
   - Tabela `ai_cost_stats`: Armazena custos sincronizados
   - Tabela `ai_cost_sync_log`: Registo de sincronizações
   - Views e funções para agregações
   - RLS (Row Level Security) para segurança

2. **Backend API** (`src/ai-cost-stats-api.js`)
   - Endpoints REST para consulta e agregação
   - Middleware de verificação de administrador
   - Exportação para CSV
   - Sincronização manual

3. **Frontend** 
   - `src/ai-cost-stats.html`: Interface visual
   - `src/ai-cost-stats.js`: Lógica de interação

4. **Navegação** (`src/navigation-config.js`)
   - Item de menu visível apenas para admins

## Funcionalidades

### 1. Indicadores de Topo

Métricas principais apresentadas em cards:
- **Custo Total do Período**: Somatório de todos os custos no período selecionado
- **Últimas 24 horas**: Custos das últimas 24 horas
- **Últimas 72 horas**: Custos dos últimos 3 dias
- **Mês Corrente**: Custos acumulados no mês atual
- **Última Sincronização**: Timestamp da última atualização de dados

### 2. Filtros

Filtros disponíveis para análise:
- **Período**: Data e hora de início e fim
- **Serviço de IA**: OpenAI, Anthropic, Google AI, etc.
- **Modelo**: GPT-4, Claude, Gemini, etc.
- **Evento**: Filtrar custos por evento específico
- **Região**: Região do cloud provider (us-east-1, eu-west-1, etc.)

### 3. Visualizações

#### Evolução Temporal
- Gráfico de linha mostrando custos ao longo do tempo
- Agregação por hora ou por dia
- Visualização interativa com Chart.js

#### Custos por Dimensão
Tabelas agregadas por:
- **Serviço**: Total por provider de IA
- **Modelo**: Total por modelo de IA
- **Região**: Total por região geográfica

Colunas exibidas:
- Dimensão (ex: nome do serviço)
- Número de pedidos
- Custo total
- Total de tokens processados

#### Custos por Evento
Tabela mostrando custos agregados por evento:
- Nome do evento
- Número de pedidos de IA
- Custo total do evento
- Total de tokens utilizados

#### Detalhe de Pedidos
Lista paginada de pedidos individuais com:
- Data/hora do pedido
- Serviço e modelo utilizados
- Região
- Tokens (input, output, total)
- Duração do pedido
- Custo individual

### 4. Exportação

- **Formato**: CSV com encoding UTF-8
- **Tipos de exportação**:
  - Detalhe completo de pedidos
  - Dados agregados por serviço
- **Filtros aplicados**: Exportação respeita filtros ativos
- **Nomenclatura**: Arquivo nomeado com data (`ai-costs-detail-2025-10-28.csv`)

### 5. Sincronização Manual

- Botão "Sincronizar agora" para atualizar custos
- Proteção contra uso excessivo: máximo 1 sincronização a cada 5 minutos
- Indicador de última sincronização
- Feedback de sucesso/erro

## APIs

### Endpoints Disponíveis

#### `GET /api/ai-costs/indicators`
Obtém indicadores principais (totais por período).

**Response:**
```json
{
  "total_period": 1234.56,
  "last_24h": 45.67,
  "last_72h": 123.45,
  "current_month": 890.12,
  "last_sync": "2025-10-28T10:30:00Z"
}
```

#### `POST /api/ai-costs/query`
Consulta detalhada de custos com filtros e paginação.

**Request:**
```json
{
  "start_date": "2025-10-01T00:00:00Z",
  "end_date": "2025-10-28T23:59:59Z",
  "service": "openai",
  "model": "gpt-4",
  "event_id": "uuid-do-evento",
  "region": "us-east-1",
  "page": 1,
  "page_size": 50
}
```

**Response:**
```json
{
  "data": [
    {
      "timestamp": "2025-10-28T10:15:30Z",
      "service": "openai",
      "model": "gpt-4",
      "region": "us-east-1",
      "cost_amount": 0.0234,
      "tokens_total": 1500,
      "request_duration_ms": 1234
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 1234,
    "total_pages": 25
  }
}
```

#### `POST /api/ai-costs/aggregate`
Obtém dados agregados por dimensão.

**Request:**
```json
{
  "start_date": "2025-10-01T00:00:00Z",
  "end_date": "2025-10-28T23:59:59Z",
  "dimension": "service"
}
```

Dimensões válidas: `service`, `model`, `region`, `event`, `hour`, `day`

**Response:**
```json
{
  "dimension": "service",
  "data": [
    {
      "dimension_value": "openai",
      "request_count": 1234,
      "total_cost": 456.78,
      "total_tokens": 1500000
    }
  ]
}
```

#### `POST /api/ai-costs/export`
Exporta dados para CSV.

**Request:**
```json
{
  "start_date": "2025-10-01T00:00:00Z",
  "end_date": "2025-10-28T23:59:59Z",
  "export_type": "detail",
  "service": "openai"
}
```

**Response:** Arquivo CSV para download

#### `GET /api/ai-costs/event/:eventId`
Obtém custos de um evento específico.

**Query Parameters:**
- `start_date`: Data de início
- `end_date`: Data de fim

**Response:**
```json
{
  "event_id": "uuid-do-evento",
  "total_cost": 123.45,
  "total_tokens": 500000,
  "request_count": 234,
  "timeline": [...],
  "recent_requests": [...]
}
```

#### `POST /api/ai-costs/sync`
Dispara sincronização manual de custos.

**Response:**
```json
{
  "message": "Sincronização iniciada com sucesso",
  "sync_id": "uuid-do-log",
  "status": "running"
}
```

#### `GET /api/ai-costs/filters`
Obtém valores únicos para popular filtros.

**Response:**
```json
{
  "services": ["openai", "anthropic", "google-ai"],
  "models": ["gpt-4", "claude-3-sonnet", "gemini-pro"],
  "regions": ["us-east-1", "eu-west-1"],
  "events": [
    {"id": "uuid", "event_name": "Meia Maratona Lisboa 2025"}
  ]
}
```

## Segurança

### Controle de Acesso

1. **Middleware `requireAdmin`**: Todas as rotas verificam se o utilizador é admin
2. **RLS no Supabase**: Políticas garantem acesso apenas para admins
3. **Validação de Token**: Verificação do token JWT em cada request
4. **Rate Limiting**: Sincronização manual limitada a 1x a cada 5 minutos

### Privacidade

- Dados pessoais não são exibidos
- Apenas métricas agregadas e custos
- Logs de auditoria de acessos

## Base de Dados

### Tabela `ai_cost_stats`

Campos principais:
- `id`: UUID primary key
- `timestamp`: Data/hora do custo
- `service`: Serviço de IA (openai, anthropic, etc.)
- `model`: Modelo utilizado
- `region`: Região do provider
- `cost_amount`: Custo em USD (decimal)
- `event_id`: Referência ao evento (opcional)
- `tokens_input`, `tokens_output`, `tokens_total`: Métricas de tokens
- `request_duration_ms`: Duração do pedido
- `synced_at`: Timestamp de sincronização

### Tabela `ai_cost_sync_log`

Registo de sincronizações:
- `id`: UUID primary key
- `sync_started_at`: Início da sincronização
- `sync_completed_at`: Conclusão da sincronização
- `sync_status`: Status (running, completed, failed)
- `records_synced`: Número de registos sincronizados
- `total_cost_synced`: Custo total sincronizado
- `triggered_by`: ID do utilizador que disparou

## Instalação e Configuração

### 1. Executar SQL

```bash
psql -h <host> -U <user> -d <database> -f sql/create-ai-cost-stats-system.sql
```

### 2. Instalar Dependências

```bash
npm install
```

A dependência `json2csv` será instalada automaticamente.

### 3. Reiniciar Servidor

```bash
npm restart
```

### 4. Aceder ao Módulo

1. Fazer login como administrador
2. Navegar para "AI Cost Stats" no menu principal
3. Configurar filtros e explorar dados

## Integração com Cloud Provider

### Sincronização de Custos (TODO)

Para sincronização real com cloud providers, implementar:

1. **AWS Cost Explorer API** (se usar AWS)
2. **Google Cloud Billing API** (se usar GCP)
3. **Azure Cost Management API** (se usar Azure)

Exemplo de implementação (pseudo-código):

```javascript
async function syncAICosts() {
    // Conectar à API do provider
    const costs = await cloudProvider.getCosts({
        service: 'ai-services',
        startDate: lastSyncDate,
        endDate: new Date()
    });
    
    // Inserir na base de dados
    for (const cost of costs) {
        await supabase
            .from('ai_cost_stats')
            .insert({
                timestamp: cost.date,
                service: cost.service,
                model: cost.sku,
                cost_amount: cost.amount,
                region: cost.region,
                synced_at: new Date()
            });
    }
}
```

## Manutenção

### Limpeza de Dados Antigos

Criar job para arquivar ou eliminar dados antigos:

```sql
-- Eliminar dados com mais de 1 ano
DELETE FROM ai_cost_stats 
WHERE timestamp < NOW() - INTERVAL '1 year';
```

### Monitorização

Criar alertas para:
- Custos acima de threshold definido
- Falhas de sincronização
- Acessos não autorizados

## Troubleshooting

### Erro: "Acesso negado"

**Causa**: Utilizador não é administrador
**Solução**: Verificar role do utilizador na tabela `user_profiles`

```sql
SELECT * FROM user_profiles WHERE user_id = '<uuid>';
```

### Erro: "Sincronização solicitada recentemente"

**Causa**: Rate limiting ativo
**Solução**: Aguardar 5 minutos desde a última sincronização

### Dados não aparecem

**Causa**: Tabela vazia ou filtros muito restritivos
**Solução**: 
1. Verificar se há dados: `SELECT COUNT(*) FROM ai_cost_stats;`
2. Ajustar filtros de período
3. Executar sincronização manual

## Roadmap

### Funcionalidades Futuras

- [ ] Alertas automáticos por email quando custos ultrapassam threshold
- [ ] Previsão de custos usando ML
- [ ] Dashboard com comparação mensal/anual
- [ ] Export para Excel com gráficos
- [ ] Integração com sistema de billing
- [ ] Relatórios agendados automáticos
- [ ] API pública para integração externa
- [ ] Otimizações e sugestões de economia

## Suporte

Para questões ou problemas, contactar a equipa de desenvolvimento.

---

**Versão**: 1.0.0  
**Data**: 28 de outubro de 2025  
**Autor**: VisionKrono Team

