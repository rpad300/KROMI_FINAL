# 📧 Sistema Completo de Emails - VisionKrono

**Status: ✅ TOTALMENTE IMPLEMENTADO**

---

## 🎯 Funcionalidades Implementadas

### 1. ✅ Gestão de Templates
- **Templates Globais** (Plataforma) - Acesso: Admin
- **Templates de Eventos** - Acesso: Admin e Gestor de Evento
- Editor HTML com preview em tempo real
- Sistema de variáveis dinâmicas
- Adicionar/remover variáveis personalizadas

### 2. ✅ Configuração de Triggers (Quando Enviar)
- **Manual**: Apenas teste
- **Na Inscrição**: Automático ao registar participante
- **Início do Evento**: No dia/hora de início
- **Fim do Evento**: No dia/hora de fim
- **Ao Passar Checkpoint**: Em tempo real
- **Ao Terminar**: Quando cruza meta
- **Após Classificação**: Quando classificação é processada
- **1 Dia Antes**: Lembrete automático
- **X Dias Antes**: Configurável (1-365 dias)
- **1 Dia Depois**: Follow-up
- **X Dias Depois**: Configurável (1-365 dias)
- **Agendado**: Data/hora específica

### 3. ✅ Configuração de Destinatários (Para Quem Enviar)
- **Todos os Participantes**: Lista completa
- **Categoria Específica**: Ex: "Masculino 30-39"
- **Participantes Específicos**: Por números de dorsal
- **Emails Específicos**: Lista de emails
- **Participantes de Checkpoint**: Quem passou por checkpoint X
- **Organizador**: Apenas organizador do evento

### 4. ✅ Sistema de Automação em Background
- **Background Job** rodando a cada 1 minuto
- Processa emails agendados automaticamente
- Sistema de retry para falhas
- Logs detalhados de todos os envios

### 5. ✅ Triggers em Tempo Real
- **Realtime Listeners** para:
  - Inserção de participantes → Email de registro
  - Nova deteção → Email de checkpoint/finish
  - Atualização de classificação → Email de resultados
- Processamento assíncrono (não bloqueia sistema)

### 6. ✅ API Completa
- `POST /api/email/schedule-event-emails` - Criar agendamentos para evento
- `POST /api/email/trigger` - Disparar email em tempo real
- `GET /api/email/schedules/:event_id` - Listar agendamentos
- `DELETE /api/email/schedules/:schedule_id` - Cancelar agendamento
- `POST /api/email/test-template` - Testar template

---

## 📊 Estrutura de Dados

### Tabela: `email_templates`
```sql
- id (UUID)
- template_key (TEXT) - Chave única
- name (TEXT) - Nome do template
- subject (TEXT) - Assunto
- body_html (TEXT) - HTML do email
- variables (JSONB) - Variáveis disponíveis
- example_data (JSONB) - Dados de exemplo
- send_trigger (TEXT) - Quando enviar
- trigger_config (JSONB) - Config do trigger
- recipient_type (TEXT) - Para quem enviar
- recipient_config (JSONB) - Config de destinatários
- event_id (UUID) - NULL = global, NOT NULL = evento
- is_active (BOOLEAN)
```

### Tabela: `email_schedule`
```sql
- id (UUID)
- template_id (UUID)
- event_id (UUID)
- scheduled_for (TIMESTAMP) - Quando enviar
- status (TEXT) - pending, sent, failed, cancelled, partially_sent
- recipient_filters (JSONB)
- sent_at (TIMESTAMP)
- error_message (TEXT)
```

### Tabela: `email_logs`
```sql
- id (UUID)
- template_key (TEXT)
- recipient_email (TEXT)
- recipient_name (TEXT)
- subject (TEXT)
- status (TEXT) - sent, failed, pending, bounced
- error_message (TEXT)
- sent_at (TIMESTAMP)
- event_id (UUID)
```

---

## 🔄 Fluxo de Automação

### Fluxo 1: Emails Agendados (Triggers Temporais)

```
1. Evento é criado
   ↓
2. Admin/Organizador cria templates com triggers temporais
   (ex: "3 dias antes", "no início", "1 dia depois")
   ↓
3. Sistema cria agendamentos na tabela email_schedule
   (via API: POST /api/email/schedule-event-emails)
   ↓
4. Background job verifica a cada 1 minuto
   ↓
5. Quando scheduled_for <= NOW():
   - Busca destinatários baseado em recipient_config
   - Renderiza template com variáveis
   - Envia emails
   - Marca como 'sent' em email_schedule
   - Registra em email_logs
```

### Fluxo 2: Emails em Tempo Real (Triggers de Evento)

```
1. Evento acontece (participante inscrito, passa checkpoint, etc)
   ↓
2. Supabase Realtime detecta INSERT/UPDATE na tabela
   ↓
3. Listener em src/email-automation.js é acionado
   ↓
4. Sistema busca templates com send_trigger correspondente
   (ex: trigger='checkpoint', event_id=X, is_active=true)
   ↓
5. Para cada template encontrado:
   - Busca destinatários
   - Renderiza template
   - Envia emails
   - Registra em email_logs
```

---

## 🚀 Como Usar

### 1. Criar Template Automático

```javascript
// 1. Acesse Templates de Email do Evento
// 2. Clique em "➕ Novo Template"
// 3. Preencha:
{
  nome: "Confirmação de Inscrição",
  chave: "registration_confirmation",
  assunto: "✅ Inscrição confirmada - {{event_name}}",
  
  // Configurar quando enviar:
  trigger: "registration",  // Na inscrição
  
  // Configurar para quem:
  recipient_type: "all_participants",  // Todos
  
  // HTML com variáveis
  body_html: "<html>...</html>"
}
// 4. Salvar

// 5. Agora, quando alguém se inscrever:
//    → Email é enviado AUTOMATICAMENTE!
```

### 2. Criar Template de Checkpoint

```javascript
{
  trigger: "checkpoint",
  trigger_config: { checkpoint: "Meta" },  // Apenas Meta
  recipient_type: "all_participants"
}
// Resultado: Email automático quando passa na Meta
```

### 3. Criar Template de Lembrete

```javascript
{
  trigger: "days_before",
  trigger_config: { days: 3, time: "09:00" },
  recipient_type: "all_participants"
}
// Resultado: Email enviado 3 dias antes às 09:00
```

### 4. Criar Template de Resultados

```javascript
{
  trigger: "classification",
  recipient_type: "all_participants"
}
// Resultado: Email com resultados após processamento
```

---

## 📝 Scripts SQL a Executar

Execute nesta ordem:

1. `sql/create-email-templates-system.sql` - Cria estrutura base
2. `sql/enhance-email-templates-v3.sql` - Adiciona event_id
3. `sql/add-email-triggers-and-recipients.sql` - Adiciona triggers e destinatários
4. `sql/fix-render-email-template-function.sql` - Corrige função de renderização
5. `sql/fix-email-templates-rls.sql` - Ajusta permissões
6. `sql/create-default-email-templates.sql` - Templates padrão globais
7. `sql/create-example-event-email-templates.sql` - Templates de exemplo (opcional)
8. `sql/create-email-triggers-functions.sql` - Triggers SQL (opcional, já temos Realtime)

---

## 🧪 Testar o Sistema

### Teste 1: Email Manual
1. Vá em Templates de Email
2. Crie/edite um template
3. Clique em "✉️ Testar Email"
4. Digite um email de teste
5. ✅ Email deve chegar

### Teste 2: Email Automático de Inscrição
1. Crie template com:
   - trigger: "registration"
   - recipient: "all_participants"
2. Salve
3. Adicione um participante ao evento
4. ✅ Email deve ser enviado automaticamente

### Teste 3: Email de Checkpoint
1. Crie template com:
   - trigger: "checkpoint"
   - recipient: "all_participants"
2. Salve
3. Registre uma deteção/passagem
4. ✅ Email deve ser enviado em tempo real

### Teste 4: Email Agendado
1. Crie template com:
   - trigger: "days_before"
   - config: { days: 1, time: "10:00" }
2. Salve
3. Chame API para criar agendamentos:
```bash
POST /api/email/schedule-event-emails
{
  "event_id": "uuid-do-evento"
}
```
4. ✅ Email será enviado no dia/hora configurados

---

## 📈 Monitoramento

### Ver Logs de Email
```sql
SELECT * FROM email_logs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Ver Agendamentos Pendentes
```sql
SELECT 
    es.*,
    et.name as template_name,
    et.send_trigger
FROM email_schedule es
JOIN email_templates et ON et.id = es.template_id
WHERE es.status = 'pending'
ORDER BY es.scheduled_for;
```

### Ver Emails Falhados
```sql
SELECT * FROM email_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 🎨 Variáveis Disponíveis (35+)

Veja `docs/EMAIL-TEMPLATES-VARIABLES.md` para lista completa.

**Principais:**
- Evento: `event_name`, `event_date`, `event_location`
- Participante: `participant_name`, `participant_bib`, `participant_category`
- Deteções: `checkpoint_name`, `detection_time`, `split_time`
- Classificações: `overall_position`, `total_time`, `average_pace`
- Estatísticas: `total_laps`, `fastest_lap`, `participants_finished`

---

## ✅ Checklist de Implementação

- [x] Estrutura de DB (templates, schedule, logs)
- [x] Interface de criação/edição de templates
- [x] Configuração de triggers
- [x] Configuração de destinatários
- [x] Background job para emails agendados
- [x] Realtime listeners para triggers instantâneos
- [x] API endpoints completos
- [x] Sistema de logs
- [x] Tratamento de erros
- [x] Graceful shutdown
- [x] Documentação completa

---

**Sistema 100% funcional e pronto para uso!** 🎉

---

**Última atualização:** 27/10/2025

