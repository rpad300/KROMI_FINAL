-- ==========================================
-- Templates de Email de Exemplo para Eventos
-- ==========================================
-- Templates demonstrativos com todas as variáveis
-- disponíveis para diferentes cenários
-- ==========================================

-- Template 1: Passagem por Checkpoint
INSERT INTO email_templates (
    template_key,
    name,
    subject,
    body_html,
    description,
    variables,
    example_data,
    is_active,
    event_id
) VALUES (
    'checkpoint_detection',
    'Notificação de Passagem por Checkpoint',
    '🏃 {{participant_name}} passou pelo {{checkpoint_name}} - {{event_name}}',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f5f5f5; padding: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .highlight { font-size: 32px; font-weight: bold; color: #FC6B03; text-align: center; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏃 Passagem Registada!</h1>
        </div>
        <div class="content">
            <div class="card">
                <p>Olá <strong>{{participant_name}}</strong> (#{{participant_bib}}),</p>
                <p>Acabou de passar pelo checkpoint:</p>
                <div class="highlight">{{checkpoint_name}}</div>
                <p><strong>⏱️ Hora:</strong> {{detection_time}}</p>
                <p><strong>📍 Checkpoint:</strong> {{checkpoint_number}}</p>
                <p><strong>🔄 Volta:</strong> {{lap_number}}</p>
                <p><strong>⚡ Tempo Parcial:</strong> {{split_time}}</p>
            </div>
        </div>
        <div class="footer">
            <p>{{event_name}} • {{event_date}}</p>
            <p>Organizado por {{organizer_name}}</p>
        </div>
    </div>
</body>
</html>',
    'Email enviado quando participante passa por um checkpoint',
    '[
        {"name": "event_name", "description": "Nome do evento", "required": true},
        {"name": "event_date", "description": "Data do evento", "required": true},
        {"name": "participant_name", "description": "Nome do participante", "required": true},
        {"name": "participant_bib", "description": "Número de dorsal", "required": true},
        {"name": "checkpoint_name", "description": "Nome do checkpoint", "required": true},
        {"name": "checkpoint_number", "description": "Número do checkpoint", "required": true},
        {"name": "detection_time", "description": "Hora da deteção", "required": true},
        {"name": "lap_number", "description": "Número da volta", "required": true},
        {"name": "split_time", "description": "Tempo parcial", "required": true},
        {"name": "organizer_name", "description": "Nome do organizador", "required": false}
    ]'::jsonb,
    '{
        "event_name": "Maratona de Lisboa",
        "event_date": "15/11/2025",
        "participant_name": "Maria Santos",
        "participant_bib": "5678",
        "checkpoint_name": "Km 21",
        "checkpoint_number": "3",
        "detection_time": "11:23:45",
        "lap_number": "1",
        "split_time": "01:15:30",
        "organizer_name": "Associação de Atletismo"
    }'::jsonb,
    true,
    NULL  -- Defina event_id manualmente ou use UPDATE depois
) ON CONFLICT (template_key) DO NOTHING;

-- Template 2: Classificação Final
INSERT INTO email_templates (
    template_key,
    name,
    subject,
    body_html,
    description,
    variables,
    example_data,
    is_active,
    event_id
) VALUES (
    'final_classification',
    'Classificação Final do Evento',
    '🏆 Resultados Finais - {{event_name}}',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; padding: 40px; text-align: center; }
        .trophy { font-size: 64px; margin: 20px 0; }
        .content { background: #f5f5f5; padding: 30px; }
        .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 15px 0; }
        .stats-row { display: flex; justify-content: space-between; padding: 12px; background: #f8f9fa; border-radius: 6px; margin: 8px 0; }
        .stat-label { color: #666; font-weight: 600; }
        .stat-value { color: #FC6B03; font-weight: bold; }
        .position-badge { background: #FC6B03; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="trophy">🏆</div>
            <h1>Parabéns {{participant_name}}!</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Você completou o {{event_name}}</p>
        </div>
        <div class="content">
            <div class="card">
                <h2 style="text-align: center; color: #FC6B03; margin-top: 0;">Sua Classificação</h2>
                
                <div style="text-align: center; margin: 25px 0;">
                    <div class="position-badge">{{overall_position}} Geral</div>
                    <div class="position-badge" style="margin-left: 10px;">{{category_position}} na Categoria</div>
                </div>
                
                <div class="stats-row">
                    <span class="stat-label">⏱️ Tempo Total:</span>
                    <span class="stat-value">{{total_time}}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">🏃 Ritmo Médio:</span>
                    <span class="stat-value">{{average_pace}}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">📏 Distância:</span>
                    <span class="stat-value">{{total_distance}}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">🔄 Total de Voltas:</span>
                    <span class="stat-value">{{total_laps}}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">⚡ Volta Mais Rápida:</span>
                    <span class="stat-value">{{fastest_lap}}</span>
                </div>
                
                <p style="margin-top: 25px; text-align: center;">
                    <strong>Dorsal:</strong> {{participant_bib}} | 
                    <strong>Categoria:</strong> {{participant_category}}
                </p>
                
                <p style="text-align: center; margin-top: 20px;">
                    De {{total_participants}} participantes, {{participants_finished}} completaram a prova.
                </p>
            </div>
        </div>
        <div class="footer">
            <p><strong>{{organizer_name}}</strong><br>{{organizer_email}}</p>
            <p style="margin-top: 15px;">{{event_name}} • {{event_date}}</p>
            <p>© 2025 VisionKrono. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>',
    'Email com classificação final e estatísticas completas',
    '[
        {"name": "event_name", "description": "Nome do evento", "required": true},
        {"name": "event_date", "description": "Data do evento", "required": true},
        {"name": "participant_name", "description": "Nome do participante", "required": true},
        {"name": "participant_bib", "description": "Número de dorsal", "required": true},
        {"name": "participant_category", "description": "Categoria", "required": true},
        {"name": "overall_position", "description": "Posição geral", "required": true},
        {"name": "category_position", "description": "Posição na categoria", "required": true},
        {"name": "total_time", "description": "Tempo total", "required": true},
        {"name": "average_pace", "description": "Ritmo médio", "required": true},
        {"name": "total_distance", "description": "Distância total", "required": true},
        {"name": "total_laps", "description": "Total de voltas", "required": true},
        {"name": "fastest_lap", "description": "Volta mais rápida", "required": true},
        {"name": "total_participants", "description": "Total de participantes", "required": false},
        {"name": "participants_finished", "description": "Participantes que terminaram", "required": false},
        {"name": "organizer_name", "description": "Nome do organizador", "required": false},
        {"name": "organizer_email", "description": "Email do organizador", "required": false}
    ]'::jsonb,
    '{
        "event_name": "Maratona de Lisboa",
        "event_date": "15/11/2025",
        "participant_name": "Maria Santos",
        "participant_bib": "5678",
        "participant_category": "Feminino 30-39",
        "overall_position": "42º",
        "category_position": "8º",
        "total_time": "03:45:23",
        "average_pace": "5:20 min/km",
        "total_distance": "42.195 km",
        "total_laps": "1",
        "fastest_lap": "03:45:23",
        "total_participants": "1500",
        "participants_finished": "1387",
        "organizer_name": "Associação de Atletismo",
        "organizer_email": "info@maratona.pt"
    }'::jsonb,
    true,
    NULL  -- Defina event_id manualmente ou use UPDATE depois
) ON CONFLICT (template_key) DO NOTHING;

-- Template 3: Confirmação de Inscrição
INSERT INTO email_templates (
    template_key,
    name,
    subject,
    body_html,
    description,
    variables,
    example_data,
    is_active,
    event_id
) VALUES (
    'registration_confirmation',
    'Confirmação de Inscrição',
    '✅ Inscrição confirmada - {{event_name}}',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f5f5f5; padding: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 15px 0; }
        .info-box { background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 15px 0; }
        .qr-code { text-align: center; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Inscrição Confirmada!</h1>
        </div>
        <div class="content">
            <div class="card">
                <p>Olá <strong>{{participant_name}}</strong>,</p>
                <p>A sua inscrição no <strong>{{event_name}}</strong> foi confirmada com sucesso!</p>
                
                <div class="info-box">
                    <p style="margin: 0;"><strong>📅 Data:</strong> {{event_date}}</p>
                    <p style="margin: 5px 0 0 0;"><strong>📍 Local:</strong> {{event_location}}</p>
                    <p style="margin: 5px 0 0 0;"><strong>🕐 Início:</strong> {{start_time}}</p>
                </div>
                
                <h3 style="color: #FC6B03;">Seus Dados de Participação</h3>
                <p><strong>Dorsal:</strong> {{participant_bib}}</p>
                <p><strong>Categoria:</strong> {{participant_category}}</p>
                <p><strong>Data de Inscrição:</strong> {{registration_date}}</p>
                
                <div class="qr-code">
                    <p><strong>QR Code para Check-in:</strong></p>
                    <img src="{{qr_code_url}}" alt="QR Code" style="max-width: 200px;">
                </div>
                
                <p><strong>💳 Pagamento:</strong> {{payment_status}} - {{payment_amount}}</p>
            </div>
        </div>
        <div class="footer">
            <p><strong>{{organizer_name}}</strong><br>{{organizer_email}}</p>
            <p style="margin-top: 10px;">{{event_name}} • {{event_url}}</p>
        </div>
    </div>
</body>
</html>',
    'Email de confirmação de inscrição com QR code e detalhes',
    '[
        {"name": "event_name", "description": "Nome do evento", "required": true},
        {"name": "event_date", "description": "Data do evento", "required": true},
        {"name": "event_location", "description": "Local do evento", "required": true},
        {"name": "start_time", "description": "Hora de início", "required": true},
        {"name": "participant_name", "description": "Nome do participante", "required": true},
        {"name": "participant_bib", "description": "Número de dorsal", "required": true},
        {"name": "participant_category", "description": "Categoria", "required": true},
        {"name": "registration_date", "description": "Data de inscrição", "required": true},
        {"name": "qr_code_url", "description": "URL do QR Code", "required": true},
        {"name": "payment_amount", "description": "Valor do pagamento", "required": true},
        {"name": "payment_status", "description": "Estado do pagamento", "required": true},
        {"name": "organizer_name", "description": "Nome do organizador", "required": false},
        {"name": "organizer_email", "description": "Email do organizador", "required": false},
        {"name": "event_url", "description": "URL do evento", "required": false}
    ]'::jsonb,
    '{
        "event_name": "Ultra Trail Serra da Estrela",
        "event_date": "20/06/2025",
        "event_location": "Torre, Serra da Estrela",
        "start_time": "07:00",
        "participant_name": "Pedro Costa",
        "participant_bib": "789",
        "participant_category": "Masculino 40-49",
        "registration_date": "10/05/2025",
        "qr_code_url": "https://kromi.online/qr/participant-789",
        "payment_amount": "€75.00",
        "payment_status": "Confirmado",
        "organizer_name": "Trail Running Portugal",
        "organizer_email": "info@trailpt.com",
        "event_url": "https://kromi.online/eventos/ultra-trail-estrela"
    }'::jsonb,
    true,
    NULL
) ON CONFLICT (template_key) DO NOTHING;

-- Verificação
SELECT 
    '✅ Templates de exemplo criados!' as status,
    COUNT(*) as total_templates,
    COUNT(*) FILTER (WHERE template_key LIKE '%checkpoint%') as checkpoint_templates,
    COUNT(*) FILTER (WHERE template_key LIKE '%classification%') as classification_templates,
    COUNT(*) FILTER (WHERE template_key LIKE '%registration%') as registration_templates
FROM email_templates;

