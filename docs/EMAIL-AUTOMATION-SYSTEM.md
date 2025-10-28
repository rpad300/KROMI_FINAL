# 📧 Sistema de Automação de Emails - VisionKrono

Documentação completa do sistema de envio automático de emails baseado em eventos e triggers.

---

## 🎯 Visão Geral

O sistema permite configurar emails que são enviados automaticamente baseado em:
1. **Quando** o email é enviado (trigger)
2. **Para quem** o email é enviado (destinatários)

---

## ⏰ Triggers de Envio

### 1. Manual (`manual`)
- **Descrição**: Email não é enviado automaticamente, apenas testes
- **Uso**: Templates para envio manual ou testes
- **Configuração**: Nenhuma

### 2. Na Inscrição (`registration`)
- **Descrição**: Enviado automaticamente quando um participante se inscreve
- **Uso**: Email de confirmação de inscrição
- **Configuração**: Nenhuma
- **Variáveis sugeridas**: `participant_name`, `participant_bib`, `event_name`, `qr_code_url`

### 3. Início do Evento (`event_start`)
- **Descrição**: Enviado no dia/hora de início do evento
- **Uso**: Lembrete final, informações de última hora
- **Configuração**:
  - `time` (opcional): Hora específica de envio
- **Variáveis sugeridas**: `event_name`, `start_time`, `event_location`

### 4. Fim do Evento (`event_end`)
- **Descrição**: Enviado no fim do evento
- **Uso**: Agradecimento, link para resultados
- **Configuração**:
  - `time` (opcional): Hora específica de envio

### 5. Ao Passar Checkpoint (`checkpoint`)
- **Descrição**: Enviado quando participante passa por um checkpoint
- **Uso**: Notificação em tempo real de passagem
- **Configuração**:
  - `checkpoint` (opcional): Nome do checkpoint específico
- **Variáveis sugeridas**: `checkpoint_name`, `detection_time`, `split_time`, `lap_number`

### 6. Ao Terminar (`finish`)
- **Descrição**: Enviado quando participante cruza a linha de chegada
- **Uso**: Parabéns imediatos, tempo inicial
- **Configuração**: Nenhuma
- **Variáveis sugeridas**: `total_time`, `overall_position`

### 7. Após Classificação (`classification`)
- **Descrição**: Enviado após processamento final das classificações
- **Uso**: Resultados oficiais, estatísticas completas
- **Configuração**: Nenhuma
- **Variáveis sugeridas**: `overall_position`, `category_position`, `total_time`, `average_pace`, `fastest_lap`

### 8. 1 Dia Antes (`day_before`)
- **Descrição**: Enviado exatamente 1 dia antes do evento
- **Uso**: Lembrete de última hora
- **Configuração**:
  - `time`: Hora de envio (padrão: 09:00)

### 9. X Dias Antes (`days_before`)
- **Descrição**: Enviado X dias antes do evento
- **Uso**: Lembretes antecipados
- **Configuração**:
  - `days`: Número de dias (1-365)
  - `time`: Hora de envio (padrão: 09:00)

### 10. 1 Dia Depois (`day_after`)
- **Descrição**: Enviado 1 dia após o evento
- **Uso**: Follow-up, pesquisa de satisfação
- **Configuração**:
  - `time`: Hora de envio (padrão: 09:00)

### 11. X Dias Depois (`days_after`)
- **Descrição**: Enviado X dias após o evento
- **Uso**: Follow-ups programados
- **Configuração**:
  - `days`: Número de dias (1-365)
  - `time`: Hora de envio (padrão: 09:00)

### 12. Agendado (`scheduled`)
- **Descrição**: Enviado em data/hora específica
- **Uso**: Comunicações programadas
- **Configuração**:
  - `datetime`: Data e hora exata

---

## 👥 Tipos de Destinatários

### 1. Todos os Participantes (`all_participants`)
- **Descrição**: Enviado para todos os participantes do evento
- **Configuração**: Nenhuma
- **Exemplo**: Email de boas-vindas, lembretes gerais

### 2. Categoria Específica (`specific_category`)
- **Descrição**: Apenas participantes de uma categoria
- **Configuração**:
  - `category`: Nome da categoria (ex: "Masculino 30-39")
- **Exemplo**: Informações específicas de categoria, horários diferentes

### 3. Participantes Específicos (`specific_participants`)
- **Descrição**: Lista de dorsais específicos
- **Configuração**:
  - `bibs`: Array de números de dorsal (ex: [123, 456, 789])
- **Exemplo**: Comunicações individuais, vencedores

### 4. Emails Específicos (`specific_emails`)
- **Descrição**: Lista de emails
- **Configuração**:
  - `emails`: Array de emails (ex: ["email1@ex.com", "email2@ex.com"])
- **Exemplo**: Staff, voluntários, parceiros

### 5. Participantes de Checkpoint (`checkpoint_participants`)
- **Descrição**: Apenas quem passou por checkpoint específico
- **Configuração**:
  - `checkpoint`: Nome do checkpoint
- **Exemplo**: Email para quem completou primeira volta

### 6. Organizador (`organizer`)
- **Descrição**: Apenas o organizador do evento
- **Configuração**: Nenhuma
- **Exemplo**: Relatórios, alertas administrativos

---

## 🔄 Fluxo de Automação

### 1. Criação do Template
```
Admin/Organizador → Criar Template
  ↓
Configurar Trigger (quando enviar)
  ↓
Configurar Destinatários (para quem)
  ↓
Definir HTML e Variáveis
  ↓
Salvar Template
```

### 2. Ativação Automática
```
Sistema monitora eventos:
  - Inscrições
  - Início/fim de eventos
  - Deteções em checkpoints
  - Processamento de classificações
  ↓
Quando trigger é ativado:
  ↓
Sistema seleciona destinatários baseado em recipient_config
  ↓
Renderiza template com variáveis específicas
  ↓
Envia email via Nodemailer
  ↓
Registra em email_logs
```

---

## 📊 Exemplos de Configuração

### Exemplo 1: Email de Checkpoint em Tempo Real

**Trigger:** `checkpoint`
**Trigger Config:** `{"checkpoint": null}` (qualquer checkpoint)
**Recipient:** `all_participants`
**Recipient Config:** `{}`

**Resultado:** Cada participante recebe um email imediatamente quando passa por qualquer checkpoint.

---

### Exemplo 2: Lembrete 3 Dias Antes

**Trigger:** `days_before`
**Trigger Config:** `{"days": 3, "time": "09:00"}`
**Recipient:** `all_participants`
**Recipient Config:** `{}`

**Resultado:** Todos os participantes recebem email 3 dias antes do evento às 09:00.

---

### Exemplo 3: Classificação para Categoria Específica

**Trigger:** `classification`
**Trigger Config:** `{}`
**Recipient:** `specific_category`
**Recipient Config:** `{"category": "Masculino 30-39"}`

**Resultado:** Apenas participantes da categoria "Masculino 30-39" recebem suas classificações após o processamento.

---

### Exemplo 4: Email para Vencedores (Top 3)

**Trigger:** `classification`
**Trigger Config:** `{}`
**Recipient:** `specific_participants`
**Recipient Config:** `{"bibs": [123, 456, 789]}`

**Resultado:** Apenas os dorsais 123, 456 e 789 recebem email especial de vencedores.

---

## 🛠️ Implementação Técnica

### Estrutura da Tabela `email_templates`

```sql
- send_trigger: TEXT          -- Tipo de trigger
- trigger_config: JSONB       -- Configurações do trigger
- recipient_type: TEXT        -- Tipo de destinatário
- recipient_config: JSONB     -- Configurações de destinatários
```

### Estrutura da Tabela `email_schedule`

```sql
- template_id: UUID           -- Template a ser enviado
- event_id: UUID              -- Evento relacionado
- scheduled_for: TIMESTAMP    -- Quando enviar
- status: TEXT                -- pending, sent, failed, cancelled
- recipient_filters: JSONB    -- Filtros de destinatários
```

### Background Job (a ser implementado)

```javascript
// Verificar emails agendados a cada minuto
setInterval(async () => {
    const now = new Date();
    const scheduled = await getScheduledEmails(now);
    
    for (const schedule of scheduled) {
        const template = await getTemplate(schedule.template_id);
        const recipients = await getRecipients(
            schedule.event_id, 
            template.recipient_type, 
            template.recipient_config
        );
        
        for (const recipient of recipients) {
            await sendEmail(template, recipient);
        }
        
        await markAsS ent(schedule.id);
    }
}, 60000); // A cada 1 minuto
```

---

## 🚀 Próximos Passos

1. ✅ Estrutura de DB criada (`sql/add-email-triggers-and-recipients.sql`)
2. ✅ Interface de configuração implementada
3. ⏳ **A FAZER**: Background job para processar emails agendados
4. ⏳ **A FAZER**: Webhook handlers para triggers em tempo real (checkpoint, finish)
5. ⏳ **A FAZER**: Integração com sistema de inscrições

---

**Última atualização:** 27/10/2025

