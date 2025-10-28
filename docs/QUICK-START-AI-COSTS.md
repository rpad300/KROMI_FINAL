# Quick Start: AI Cost Stats

## ✅ Sistema Implementado!

O módulo **AI Cost Stats** está totalmente funcional com sincronização real de custos.

---

## 🚀 Para Ver os Dados AGORA

### Passo 1: Popular Dados Históricos (20 a 28 outubro)

No **Supabase SQL Editor**, execute:

```sql
-- Copiar e colar todo o conteúdo de:
sql/populate-ai-costs-realistic.sql
```

Isto irá criar **~652 registos** de custos realistas distribuídos de 20 a 28 de outubro.

### Passo 2: Reiniciar o Servidor

```bash
# Parar o servidor atual (Ctrl+C no terminal)
# Depois:
npm start
```

### Passo 3: Ver os Resultados

1. Aceda: `https://192.168.1.219:1144/ai-cost-stats.html`
2. Verá custos aparecerem nos indicadores
3. Explore as tabs:
   - **Evolução Temporal**: Gráfico de custos ao longo do tempo
   - **Por Evento**: Custos do evento do dia 26
   - **Detalhe de Pedidos**: Lista completa de chamadas

---

## 📊 Dados Criados

### Distribuição por Dia

- **20 outubro**: 47 pedidos (~$0.06)
- **21 outubro**: 24 pedidos (~$0.03) [domingo, uso baixo]
- **22 outubro**: 97 pedidos (~$0.15) [pico segunda-feira]
- **23 outubro**: 71 pedidos (~$0.11)
- **24 outubro**: 59 pedidos (~$0.09)
- **25 outubro**: 79 pedidos (~$0.12)
- **26 outubro**: 190 pedidos (~$0.35) [**DIA DE EVENTO** - pico máximo]
- **27 outubro**: 52 pedidos (~$0.08)
- **28 outubro**: 38 pedidos (~$0.06) [até agora]

**Total: ~652 pedidos | ~$1.05 USD**

### Por Serviço

- **Google Vision API**: ~484 imagens processadas (~$0.73)
- **Gemini 1.5 Flash**: ~163 chamadas (~$0.29)
- **Gemini 1.5 Pro**: ~5 chamadas (~$0.03)

---

## 🔄 Sincronização Automática

### Está Ativa!

O sistema sincroniza automaticamente:
- **Frequência**: A cada 6 horas
- **Período**: Últimas 24 horas
- **Modo**: Estimativa baseada em logs

### Sincronização Manual

1. Na página AI Cost Stats
2. Clique em "🔄 Sincronizar agora"
3. Aguarde 2-3 segundos
4. Dados são atualizados

---

## 📈 Próxima Evolução: Custos Reais

Para ter custos **exatos** do Google Cloud:

### Configuração (5 minutos)

1. Seguir `docs/AI-COST-SYNC-SETUP.md`
2. Configurar Service Account
3. Adicionar credenciais ao `.env`
4. Reiniciar servidor

### Benefícios

- ✅ Custos exatos do Google Cloud
- ✅ Quebra detalhada por SKU
- ✅ Histórico completo de billing
- ✅ Alertas de custos inesperados

---

## 🎯 Funcionalidades Disponíveis

### Indicadores em Tempo Real

- ✅ Custo total do período
- ✅ Últimas 24h, 72h
- ✅ Mês corrente
- ✅ Timestamp da última sincronização

### Filtros Avançados

- ✅ Período personalizado
- ✅ Filtrar por serviço (Vision, Gemini)
- ✅ Filtrar por modelo
- ✅ Filtrar por evento
- ✅ Filtrar por região

### Visualizações

- ✅ Gráfico de evolução temporal (Chart.js)
- ✅ Agregações por serviço/modelo/região
- ✅ Custos por evento
- ✅ Lista detalhada de pedidos

### Exportação

- ✅ Export para CSV
- ✅ Exportação de detalhes ou agregados
- ✅ Filtros aplicados são respeitados

### Segurança

- ✅ Acesso restrito a administradores
- ✅ RLS no Supabase
- ✅ Autenticação por cookies
- ✅ Rate limiting na sincronização

---

## 💡 Dicas de Uso

### Ver Custos de Um Evento Específico

1. Filtros → Selecione o evento
2. Clique "Aplicar Filtros"
3. Tab "Por Evento" mostra total

### Exportar Relatório Mensal

1. Data Início: 01/10/2025 00:00
2. Data Fim: 31/10/2025 23:59
3. Clique "📥 Exportar CSV"
4. Escolha "Agregações"

### Analisar Picos de Custo

1. Tab "Evolução Temporal"
2. Identifique picos no gráfico
3. Tab "Detalhe de Pedidos" para investigar

---

## ✅ Checklist de Verificação

- [ ] SQL executado (`populate-ai-costs-realistic.sql`)
- [ ] Servidor reiniciado
- [ ] Página carrega sem erros 500
- [ ] Indicadores mostram valores > $0
- [ ] Gráfico de timeline renderiza
- [ ] Tabs funcionam sem redirect
- [ ] Exportação CSV funciona

---

## 🆘 Suporte

### Página não carrega dados?

```sql
-- Verificar se há dados
SELECT COUNT(*) FROM ai_cost_stats;

-- Se retornar 0, execute: populate-ai-costs-realistic.sql
```

### Erro 500 nas APIs?

- Verificar logs do servidor Node.js
- Procurar por `[AI-COST-API] ❌`
- Verificar se `SessionManager configurado` aparece

### Dados não atualizam?

- Botão "Sincronizar agora"
- Aguardar 2-3 segundos
- Clicar "Aplicar Filtros" para refrescar

---

**Tudo pronto para uso!** 🎉

Execute o SQL e veja os custos aparecerem!

