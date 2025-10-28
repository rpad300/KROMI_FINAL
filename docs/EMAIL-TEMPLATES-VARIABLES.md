# 📧 Variáveis de Templates de Email - VisionKrono

Documento de referência com todas as variáveis disponíveis para templates de email.

---

## 📋 Templates Globais (Plataforma)

Variáveis disponíveis para templates enviados pela plataforma (não relacionados a eventos específicos):

### Utilizador
- `{{user_name}}` - Nome completo do utilizador
- `{{user_email}}` - Email do utilizador
- `{{temporary_password}}` - Password temporária (para novos utilizadores)

### Sistema
- `{{app_url}}` - URL da aplicação (ex: https://kromi.online)
- `{{company_name}}` - Nome da organização/empresa
- `{{reset_url}}` - URL para recuperação de password
- `{{expiry_time}}` - Tempo de expiração (em minutos)

---

## 🏃 Templates de Eventos

Variáveis disponíveis para templates específicos de eventos:

### 📅 Informações do Evento
- `{{event_name}}` - Nome do evento (ex: "Maratona de Lisboa")
- `{{event_date}}` - Data do evento (ex: "15/11/2025")
- `{{event_location}}` - Local do evento (ex: "Avenida Paulista, São Paulo")
- `{{event_url}}` - URL do evento no sistema
- `{{start_time}}` - Hora de início (ex: "09:00")
- `{{end_time}}` - Hora de fim estimado (ex: "14:00")

### 👤 Informações do Participante
- `{{participant_name}}` - Nome completo do participante
- `{{participant_email}}` - Email do participante
- `{{participant_bib}}` - Número de dorsal (ex: "1234")
- `{{participant_category}}` - Categoria (ex: "Masculino 30-39")
- `{{registration_date}}` - Data de inscrição

### 👔 Informações do Organizador
- `{{organizer_name}}` - Nome do organizador
- `{{organizer_email}}` - Email do organizador

### 📍 Deteções e Passagens
- `{{checkpoint_name}}` - Nome do checkpoint (ex: "Km 21", "Meta")
- `{{checkpoint_number}}` - Número sequencial do checkpoint
- `{{detection_time}}` - Hora da deteção (ex: "10:45:23")
- `{{lap_number}}` - Número da volta
- `{{split_time}}` - Tempo parcial até o checkpoint (ex: "00:32:15")

### 🏆 Classificações
- `{{overall_position}}` - Posição geral (ex: "42º")
- `{{category_position}}` - Posição na categoria (ex: "8º")
- `{{total_time}}` - Tempo total da prova (ex: "01:35:42")
- `{{average_pace}}` - Ritmo médio (ex: "4:35 min/km")
- `{{total_distance}}` - Distância total percorrida (ex: "21.1 km")

### 📊 Estatísticas Avançadas
- `{{total_laps}}` - Total de voltas completadas
- `{{fastest_lap}}` - Tempo da volta mais rápida
- `{{slowest_lap}}` - Tempo da volta mais lenta
- `{{total_participants}}` - Total de participantes no evento
- `{{participants_finished}}` - Participantes que completaram a prova

### 💳 Pagamento e Acesso
- `{{payment_amount}}` - Valor do pagamento (ex: "€50.00")
- `{{payment_status}}` - Estado do pagamento (ex: "Confirmado", "Pendente")
- `{{qr_code_url}}` - URL do QR Code do participante

---

## 🎯 Casos de Uso por Template

### 1. Email de Boas-vindas (Novo Utilizador)
**Variáveis necessárias:**
- `{{user_name}}`
- `{{user_email}}`
- `{{temporary_password}}`
- `{{app_url}}`

**Quando enviar:** Ao criar um novo utilizador no sistema.

---

### 2. Confirmação de Inscrição
**Variáveis necessárias:**
- `{{event_name}}`
- `{{event_date}}`
- `{{event_location}}`
- `{{participant_name}}`
- `{{participant_bib}}`
- `{{participant_category}}`
- `{{qr_code_url}}`
- `{{payment_amount}}`
- `{{payment_status}}`

**Quando enviar:** Após confirmação de inscrição e pagamento.

---

### 3. Passagem por Checkpoint
**Variáveis necessárias:**
- `{{event_name}}`
- `{{participant_name}}`
- `{{participant_bib}}`
- `{{checkpoint_name}}`
- `{{checkpoint_number}}`
- `{{detection_time}}`
- `{{lap_number}}`
- `{{split_time}}`

**Quando enviar:** Quando um participante é detetado num checkpoint (tempo real).

---

### 4. Classificação Final
**Variáveis necessárias:**
- `{{event_name}}`
- `{{event_date}}`
- `{{participant_name}}`
- `{{participant_bib}}`
- `{{participant_category}}`
- `{{overall_position}}`
- `{{category_position}}`
- `{{total_time}}`
- `{{average_pace}}`
- `{{total_distance}}`
- `{{total_laps}}`
- `{{fastest_lap}}`
- `{{total_participants}}`
- `{{participants_finished}}`

**Quando enviar:** Após o participante completar a prova e processamento das classificações.

---

### 5. Alerta de Volta Completada
**Variáveis necessárias:**
- `{{event_name}}`
- `{{participant_name}}`
- `{{participant_bib}}`
- `{{lap_number}}`
- `{{split_time}}`
- `{{total_laps}}`

**Quando enviar:** Ao completar cada volta (eventos com múltiplas voltas).

---

## 💡 Dicas de Uso

### Formatação de Variáveis
Use sempre `{{nome_da_variavel}}` com chaves duplas.

### Variáveis Condicionais
Em HTML, pode usar JavaScript inline para lógica condicional:
```html
<p style="display: {{payment_status}} === 'Confirmado' ? 'block' : 'none';">
    Pagamento confirmado!
</p>
```

### Design Responsivo
Sempre use `max-width: 600px` no container principal para compatibilidade com clientes de email.

### Cores do Branding
- **Laranja Principal:** `#FC6B03`
- **Laranja Claro:** `#FF8800`
- **Gradiente Kromi:** `linear-gradient(135deg, #FC6B03 0%, #FF8800 100%)`

---

## 🔄 Integração com Sistema

### Envio Automático de Emails

O sistema pode enviar emails automaticamente nos seguintes eventos:

1. **Novo Utilizador Criado** → Template: `welcome_user`
2. **Inscrição em Evento** → Template: `registration_confirmation`
3. **Passagem por Checkpoint** → Template: `checkpoint_detection`
4. **Prova Finalizada** → Template: `final_classification`
5. **Recuperação de Password** → Template: `password_reset`

### Como Adicionar Novas Variáveis

1. Acesse a página de Templates de Email (Global ou Evento)
2. Clique em "Novo Template" ou edite um existente
3. Clique em "➕ Adicionar Variável"
4. Preencha:
   - **Nome:** `nova_variavel` (apenas letras minúsculas, números e _)
   - **Descrição:** "Descrição da variável"
   - **Exemplo:** Valor de exemplo para preview
5. Use a variável no HTML: `{{nova_variavel}}`

---

## 📝 Exemplos Práticos

### Exemplo 1: Email de Checkpoint com Estatísticas

```html
<h2>Passagem pelo {{checkpoint_name}}</h2>
<p>Hora: {{detection_time}}</p>
<p>Tempo Parcial: {{split_time}}</p>
<p>Volta {{lap_number}} de {{total_laps}}</p>
```

### Exemplo 2: Email de Classificação com Grid

```html
<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #FC6B03;">{{overall_position}}</div>
        <div style="font-size: 12px; color: #666;">Posição Geral</div>
    </div>
    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: bold; color: #FC6B03;">{{total_time}}</div>
        <div style="font-size: 12px; color: #666;">Tempo Total</div>
    </div>
</div>
```

---

**Última atualização:** 27/10/2025

