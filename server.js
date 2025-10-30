const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Carregamento do .env:', dotenvResult.error ? 'ERRO: ' + dotenvResult.error : 'SUCESSO');
console.log('Parsed:', dotenvResult.parsed);
console.log('GOOGLE_VISION_API_KEY carregada:', process.env.GOOGLE_VISION_API_KEY ? 'SIM' : 'NÃO');
console.log('Valor da API Key:', process.env.GOOGLE_VISION_API_KEY);

const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
// Limpar cache do módulo para forçar reload
delete require.cache[require.resolve('./src/background-processor')];
const BackgroundImageProcessor = require('./src/background-processor');
const EmailAutomation = require('./src/email-automation');
const SessionManager = require('./src/session-manager');
const { createSessionMiddleware, requireAuth, requireRole } = require('./src/session-middleware');
const setupAuthRoutes = require('./src/auth-routes');
const AuditLogger = require('./src/audit-logger');
const CSRFProtection = require('./src/csrf-protection');

const app = express();
const PORT = 1144;

// Inicializar Supabase para server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Criar cliente Supabase com Service Role Key (bypassa RLS) para operações privilegiadas
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// ==========================================
// Postgres (Service Role) - execução de SQL
// ==========================================
let pgPool = null;
try {
    const { Pool } = require('pg');
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_POSTGRES_URL;
    if (dbUrl) {
        pgPool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        console.log('✅ Conexão Postgres (service role) configurada.');
    } else {
        console.warn('⚠️ Nenhuma connection string de Postgres configurada (SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL).');
    }
} catch (e) {
    console.warn('⚠️ Módulo pg não disponível ou falha ao inicializar:', e.message);
}

// Função helper para carregar API keys da base de dados com fallback para .env
async function getApiKeyFromDatabase(keyName, defaultValue = null) {
    try {
        const { data, error } = await supabase
            .from('platform_configurations')
            .select('config_value')
            .eq('config_key', keyName)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn(`⚠️ Erro ao buscar ${keyName} da base de dados:`, error.message);
        }
        
        if (data && data.config_value) {
            return data.config_value;
        }
        
        // Fallback para .env
        const envKey = process.env[keyName];
        if (envKey) {
            return envKey;
        }
        
        return defaultValue;
    } catch (error) {
        console.warn(`⚠️ Erro ao buscar ${keyName}:`, error.message);
        // Fallback para .env
        return process.env[keyName] || defaultValue;
    }
}

// Inicializar sistemas de segurança
const sessionManager = new SessionManager();
const auditLogger = new AuditLogger(supabase);
const csrfProtection = new CSRFProtection();

// Inicializar processador de imagens em background
const imageProcessor = new BackgroundImageProcessor();

// Middlewares globais
app.use(cookieParser()); // Parser de cookies
app.use(express.json()); // Parser de JSON
app.use(express.urlencoded({ extended: true })); // Parser de form data

// Middleware de sessão em todas as rotas
app.use(createSessionMiddleware(sessionManager));

// Middleware para injetar metadados SEO automaticamente em todas as páginas HTML
// IMPORTANTE: Deve estar antes do express.static para interceptar todas as respostas HTML
if (supabaseAdmin) {
    const { createHtmlMetadataMiddleware } = require('./src/branding-metadata-injector');
    app.use(createHtmlMetadataMiddleware(supabaseAdmin));
    console.log('✅ Middleware de injeção de metadados SEO ativo');
}

// Servir arquivos estáticos
app.use(express.static('.'));  // Raiz (para arquivos como icons, manifest, etc.)
app.use(express.static('src'));  // src/ (para HTML, CSS, JS em src/)

// Rota para debug - escrever logs no terminal
app.post('/api/debug', express.json(), (req, res) => {
    const { level, message, data } = req.body;
    const timestamp = new Date().toISOString();
    
    // Escrever no terminal com cores
    const colors = {
        error: '\x1b[31m',    // Vermelho
        warn: '\x1b[33m',     // Amarelo
        info: '\x1b[36m',     // Ciano
        success: '\x1b[32m',  // Verde
        reset: '\x1b[0m'      // Reset
    };
    
    const color = colors[level] || colors.info;
    const reset = colors.reset;
    
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${reset}`);
    
    if (data) {
        console.log(`${color}Data:${reset}`, JSON.stringify(data, null, 2));
    }
    
    res.json({ success: true });
});

// Rota para buscar dados do evento usando SERVICE_ROLE_KEY
app.get('/api/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID é obrigatório' });
        }
        
        // Usar supabaseAdmin se disponível (tem SERVICE_ROLE_KEY)
        const client = supabaseAdmin || supabase;
        
        const { data, error } = await client
            .from('events')
            .select('id, name, event_date, status')
            .eq('id', eventId)
            .maybeSingle();
        
        if (error) {
            console.error('❌ Erro ao buscar evento:', error);
            return res.status(500).json({ error: error.message });
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }
        
        res.json(data);
    } catch (error) {
        console.error('❌ Erro na rota /api/event:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para fornecer configurações do ambiente
app.get('/api/config', (req, res) => {
    console.log('Solicitação de configuração recebida');
    console.log('GOOGLE_VISION_API_KEY no processo:', process.env.GOOGLE_VISION_API_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
    console.log('SUPABASE_URL no processo:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
    
    res.json({
        GOOGLE_VISION_API_KEY: process.env.GOOGLE_VISION_API_KEY || null,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || null,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || null
    });
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
setupAuthRoutes(app, sessionManager, supabase, auditLogger, supabaseAdmin);

// ==========================================
// ROTAS DE GESTÃO DE UTILIZADORES
// ==========================================

// Função para gerar password segura
function generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Função para enviar email com credenciais
async function sendWelcomeEmail(to, name, password) {
    try {
        // Carregar configurações de email da base de dados ou usar variáveis de ambiente
        let emailUser, emailPassword, appUrl;
        
        try {
            const { data: emailConfig, error: configError } = await supabaseAdmin
                .from('platform_configurations')
                .select('*')
                .in('config_key', ['EMAIL_USER', 'EMAIL_PASSWORD', 'APP_URL']);
            
            if (!configError && emailConfig && emailConfig.length > 0) {
                emailConfig.forEach(config => {
                    if (config.config_key === 'EMAIL_USER') emailUser = config.config_value;
                    if (config.config_key === 'EMAIL_PASSWORD') emailPassword = config.config_value;
                    if (config.config_key === 'APP_URL') appUrl = config.config_value;
                });
            }
        } catch (error) {
            console.warn('⚠️ Não foi possível carregar configurações de email da base de dados');
        }
        
        // Usar valores da base de dados ou fallback para variáveis de ambiente
        emailUser = emailUser || process.env.EMAIL_USER || 'system@kromi.online';
        emailPassword = emailPassword || process.env.EMAIL_PASSWORD || '';
        appUrl = appUrl || process.env.APP_URL || 'https://kromi.online';
        
        // Se não houver configuração de email, não enviar
        if (!emailPassword) {
            console.warn('⚠️ EMAIL_PASSWORD não configurado. Email não será enviado.');
            return { success: false, error: 'EMAIL_PASSWORD não configurado' };
        }
        
        // Configurar transporter de email (usando Gmail SMTP)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        });
        
        // HTML do email
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                    .credential-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
                    .credential-label { font-weight: bold; color: #667eea; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Bem-vindo ao VisionKrono!</h1>
                    </div>
                    <div class="content">
                        <p>Olá <strong>${name}</strong>,</p>
                        <p>A sua conta foi criada com sucesso no sistema VisionKrono.</p>
                        
                        <div class="credentials">
                            <h3>📧 As suas credenciais:</h3>
                            <div class="credential-item">
                                <span class="credential-label">Email:</span> ${to}
                            </div>
                            <div class="credential-item">
                                <span class="credential-label">Password Temporária:</span> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${password}</code>
                            </div>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Importante:</strong><br>
                            Esta é uma password temporária. Será obrigatório trocar a password no primeiro login por motivos de segurança.
                        </div>
                        
                        <p><strong>Próximos passos:</strong></p>
                        <ol>
                            <li>Acesse o sistema através do link: <a href="${appUrl}">${appUrl}</a></li>
                            <li>Faça login com as credenciais acima</li>
                            <li>Complete o seu perfil</li>
                            <li>Altere a sua password</li>
                        </ol>
                        
                        <p>Se tiver alguma dúvida, não hesite em contactar-nos.</p>
                        
                        <div class="footer">
                            <p>Este é um email automático, por favor não responda.</p>
                            <p>VisionKrono - Sistema de Gestão de Eventos</p>
                            <p>Sistema enviado por: system@kromi.online</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Enviar email
        const info = await transporter.sendMail({
            from: `"VisionKrono System" <${emailUser}>`,
            to: to,
            subject: '🎉 Bem-vindo ao VisionKrono - As suas credenciais',
            html: html
        });
        
        console.log(`📧 Email enviado com sucesso para ${to}:`, info.messageId);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error(`❌ Erro ao enviar email para ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Rota para criar utilizador com password automática
app.post('/api/users/create', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { email, name, phone, organization, role } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email e nome são obrigatórios'
            });
        }
        
        if (!supabaseAdmin) {
            console.error('❌ Service Role Key não configurada');
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada no servidor'
            });
        }
        
        console.log('📝 Criando novo utilizador:', email);
        
        // Gerar password segura
        const temporaryPassword = generateSecurePassword(12);
        
        // Criar utilizador no Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: {
                name: name,
                must_change_password: true // Marcar para obrigar troca de password
            }
        });
        
        if (authError) {
            console.error('❌ Erro ao criar utilizador no auth:', authError);
            return res.status(400).json({
                success: false,
                error: authError.message
            });
        }
        
        console.log('✅ Utilizador criado no auth:', authData.user.id);
        
        // Criar perfil do utilizador
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: authData.user.id,
                name: name,
                email: email,
                phone: phone || null,
                organization: organization || null,
                role: role || 'user',
                status: 'active',
                created_by: req.session.userId, // ID do admin que criou
                must_change_password: true // Flag para obrigar troca de password
            })
            .select()
            .single();
        
        if (profileError) {
            console.error('❌ Erro ao criar perfil:', profileError);
            
            // Se falhou ao criar perfil, eliminar utilizador do auth
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            
            return res.status(500).json({
                success: false,
                error: profileError.message
            });
        }
        
        console.log('✅ Perfil criado:', profileData.id);
        
        // Log de auditoria
        auditLogger.log('USER_CREATED', req.session.userId, {
            user_email: email,
            user_name: name,
            role: role || 'user',
            created_at: new Date().toISOString()
        });
        
        // Tentar enviar email (não bloquear se falhar)
        const emailResult = await sendWelcomeEmail(email, name, temporaryPassword);
        if (emailResult.success) {
            console.log(`✅ Email de boas-vindas enviado para ${email}`);
        } else {
            console.warn(`⚠️ Email não enviado para ${email}: ${emailResult.error}`);
        }
        
        res.json({
            success: true,
            data: {
                profile: profileData,
                temporaryPassword: temporaryPassword, // Enviar password temporária para exibição
                emailSent: emailResult.success, // Informar se email foi enviado
                message: emailResult.success 
                    ? 'Utilizador criado com sucesso! Email com credenciais enviado.' 
                    : 'Utilizador criado com sucesso! Email não pôde ser enviado.'
            }
        });
        
    } catch (error) {
        console.error('❌ Erro inesperado ao criar utilizador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ROTAS DE ROLES E PERMISSÕES
// ==========================================

// ==========================================
// Rotas de Automação de Emails
// ==========================================

// Criar agendamentos para evento
app.post('/api/email/schedule-event-emails', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { event_id } = req.body;
        
        if (!event_id) {
            return res.status(400).json({ error: 'event_id é obrigatório' });
        }
        
        if (global.emailAutomation) {
            await global.emailAutomation.scheduleTimeBasedEmails(event_id);
            res.json({ success: true, message: 'Agendamentos criados com sucesso' });
        } else {
            res.status(500).json({ error: 'Sistema de automação não disponível' });
        }
    } catch (error) {
        console.error('❌ Erro ao criar agendamentos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Disparar email em tempo real (para triggers como checkpoint, finish, etc)
app.post('/api/email/trigger', requireAuth, express.json(), async (req, res) => {
    try {
        const { trigger, event_id, participant_data } = req.body;
        
        if (!trigger || !event_id) {
            return res.status(400).json({ error: 'trigger e event_id são obrigatórios' });
        }
        
        if (global.emailAutomation) {
            await global.emailAutomation.triggerRealtimeEmail(trigger, event_id, participant_data);
            res.json({ success: true, message: 'Emails disparados' });
        } else {
            res.status(500).json({ error: 'Sistema de automação não disponível' });
        }
    } catch (error) {
        console.error('❌ Erro ao disparar emails:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar agendamentos de um evento
app.get('/api/email/schedules/:event_id', requireAuth, async (req, res) => {
    try {
        const { event_id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('email_schedule')
            .select(`
                *,
                template:email_templates(name, subject, send_trigger)
            `)
            .eq('event_id', event_id)
            .order('scheduled_for');
        
        if (error) throw error;
        
        res.json(data || []);
    } catch (error) {
        console.error('❌ Erro ao listar agendamentos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancelar agendamento
app.delete('/api/email/schedules/:schedule_id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { schedule_id } = req.params;
        
        const { error } = await supabaseAdmin
            .from('email_schedule')
            .update({ status: 'cancelled' })
            .eq('id', schedule_id);
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Agendamento cancelado' });
    } catch (error) {
        console.error('❌ Erro ao cancelar agendamento:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para testar envio de email de template
app.post('/api/email/test-template', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { template_key, recipient_email, variables } = req.body;
        
        if (!template_key || !recipient_email) {
            return res.status(400).json({
                success: false,
                error: 'template_key e recipient_email são obrigatórios'
            });
        }
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Buscar template
        const { data: template, error: templateError } = await supabaseAdmin
            .from('email_templates')
            .select('*')
            .eq('template_key', template_key)
            .single();
        
        if (templateError || !template) {
            return res.status(404).json({
                success: false,
                error: 'Template não encontrado'
            });
        }
        
        // Renderizar template com variáveis
        const { data: renderedTemplate, error: renderError } = await supabaseAdmin
            .rpc('render_email_template', {
                template_key_param: template_key,
                variables_param: variables || {}
            });
        
        if (renderError || !renderedTemplate || renderedTemplate.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao renderizar template: ' + (renderError?.message || 'Template vazio')
            });
        }
        
        const { subject, body_html } = renderedTemplate[0];
        
        // Carregar configurações de email
        let emailUser, emailPassword;
        
        try {
            const { data: emailConfig, error: configError } = await supabaseAdmin
                .from('platform_configurations')
                .select('*')
                .in('config_key', ['EMAIL_USER', 'EMAIL_PASSWORD']);
            
            if (!configError && emailConfig) {
                emailConfig.forEach(config => {
                    if (config.config_key === 'EMAIL_USER') emailUser = config.config_value;
                    if (config.config_key === 'EMAIL_PASSWORD') emailPassword = config.config_value;
                });
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações de email');
        }
        
        emailUser = emailUser || process.env.EMAIL_USER || 'system@kromi.online';
        emailPassword = emailPassword || process.env.EMAIL_PASSWORD || '';
        
        if (!emailPassword) {
            return res.json({
                success: false,
                error: 'EMAIL_PASSWORD não configurado. Configure na página de Configurações.'
            });
        }
        
        // Configurar transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        });
        
        // Enviar email de teste
        const info = await transporter.sendMail({
            from: `"VisionKrono System (Teste)" <${emailUser}>`,
            to: recipient_email,
            subject: `[TESTE] ${subject}`,
            html: body_html
        });
        
        console.log(`📧 Email de teste enviado para ${recipient_email}:`, info.messageId);
        
        res.json({
            success: true,
            message: `Email de teste enviado para ${recipient_email}`,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('❌ Erro ao enviar email de teste:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para atualizar permissões de um perfil (usa Service Role Key)
app.post('/api/roles/update-permissions', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { role_name, permissions } = req.body;
        
        if (!role_name || !permissions) {
            return res.status(400).json({
                success: false,
                error: 'role_name e permissions são obrigatórios'
            });
        }
        
        if (!supabaseAdmin) {
            console.error('❌ Service Role Key não configurada');
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada no servidor'
            });
        }
        
        console.log('🔄 Atualizando permissões via servidor:', { role_name, permissions });
        
        const { data, error } = await supabaseAdmin
            .from('role_definitions')
            .update({
                permissions: permissions,
                updated_at: new Date().toISOString()
            })
            .eq('role_name', role_name)
            .select();
        
        if (error) {
            console.error('❌ Erro ao atualizar permissões:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
        
        console.log('✅ Permissões atualizadas:', data);
        
        res.json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('❌ Erro inesperado ao atualizar permissões:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ROTA PARA LISTAR CLASSIFICAÇÕES (LÓGICA DO SERVIDOR)
// ==========================================
app.get('/api/classifications/list', async (req, res) => {
    try {
        const eventId = req.query.event;
        
        console.log('📋 [GET /api/classifications/list] Event ID:', eventId);
        
        if (!eventId) {
            return res.status(400).json({
                success: false,
                error: 'Event ID requerido'
            });
        }
        
        // Usar módulo de lógica centralizada
        const ClassificationLogic = require('./src/classification-logic');
        const classLogic = new ClassificationLogic(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role para contornar RLS
        );
        
        console.log('🔍 Processando classificações com lógica do servidor...');
        
        // Processar com TODA a lógica (ranking, gaps, velocidade, etc)
        const classifications = await classLogic.processCompleteClassifications(eventId);
        
        console.log(`✅ Retornando ${classifications.length} classificações processadas`);
        
        res.json({
            success: true,
            classifications: classifications,
            count: classifications.length
        });
        
    } catch (error) {
        console.error('❌ Erro na rota /api/classifications/list:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ROTAS DE EVENTOS (REST API)
// ==========================================
const setupEventsRoutes = require('./src/events-routes');
setupEventsRoutes(app, sessionManager);

// Função helper para obter preços
function getOpenAIPricing(modelId) {
    const pricing = {
        'gpt-4o': { input: 0.0025, output: 0.010 },
        'gpt-4o-2024-08-06': { input: 0.0025, output: 0.010 },
        'gpt-4-turbo': { input: 0.010, output: 0.030 },
        'gpt-4': { input: 0.030, output: 0.060 },
        'gpt-4-vision-preview': { input: 0.010, output: 0.030 }
    };
    
    // Tentar encontrar o modelo exato
    if (pricing[modelId]) {
        return pricing[modelId];
    }
    
    // Fallback para modelos similares
    if (modelId.includes('gpt-4o')) {
        return pricing['gpt-4o'];
    } else if (modelId.includes('gpt-4-turbo')) {
        return pricing['gpt-4-turbo'];
    } else if (modelId.includes('gpt-4')) {
        return pricing['gpt-4'];
    }
    
    // Default
    return { input: 0.0025, output: 0.010 };
}

// Função helper para obter preços Gemini
function getGeminiPricing(modelId) {
    const pricing = {
        // VEo (Video)
        'veo-3.1': { input: 0.001, output: 0.02 }, // $1/1M input, $20/1M output
        'veo-3': { input: 0.001, output: 0.02 },
        'veo-2': { input: 0.001, output: 0.025 },
        
        // Modelos 2.5 (mais recentes)
        'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
        'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
        'gemini-2.5-flash-lite': { input: 0.00005, output: 0.0002 },
        
        // Modelos 2.0
        'gemini-2.0-flash-exp': { input: 0.000075, output: 0.0003 },
        'gemini-2.0-flash-thinking-exp': { input: 0.000075, output: 0.0003 },
        
        // Modelos 1.5
        'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
        'gemini-1.5-pro-latest': { input: 0.00125, output: 0.005 },
        'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
        'gemini-1.5-flash-latest': { input: 0.000075, output: 0.0003 },
        
        // Ultra
        'gemini-ultra': { input: 0.0025, output: 0.01 }
    };
    
    // Tentar encontrar o modelo exato
    if (pricing[modelId]) {
        return pricing[modelId];
    }
    
    // Fallback para modelos similares
    if (modelId.includes('veo')) {
        // Modelos VEo (geração de vídeo)
        return pricing['veo-3.1'] || pricing['veo-3'] || pricing['veo-2'];
    } else if (modelId.includes('ultra')) {
        return pricing['gemini-ultra'];
    } else if (modelId.includes('pro')) {
        // Modelos Pro (mais caros)
        return pricing['gemini-2.5-pro'] || pricing['gemini-1.5-pro'];
    } else if (modelId.includes('lite')) {
        // Modelos Lite (mais baratos)
        return pricing['gemini-2.5-flash-lite'];
    } else if (modelId.includes('flash')) {
        // Modelos Flash (padrão)
        return pricing['gemini-2.5-flash'] || pricing['gemini-1.5-flash'];
    }
    
    // Default (flash é mais barato)
    return { input: 0.000075, output: 0.0003 };
}

// Função helper para obter preços DeepSeek
function getDeepSeekPricing(modelId) {
    const pricing = {
        'deepseek-chat': { input: 0.14, output: 0.28 },
        'deepseek-chat-0324': { input: 0.14, output: 0.28 },
        'deepseek-reasoner': { input: 0.55, output: 2.19 },
        'deepseek-reasoner-0324': { input: 0.55, output: 2.19 }
    };
    
    // Tentar encontrar o modelo exato
    if (pricing[modelId]) {
        return pricing[modelId];
    }
    
    // Fallback para modelos similares
    if (modelId.includes('reasoner')) {
        return pricing['deepseek-reasoner'];
    } else if (modelId.includes('chat')) {
        return pricing['deepseek-chat'];
    }
    
    // Default
    return { input: 0.14, output: 0.28 };
}

// ==========================================
// ROTA PARA LISTAR MODELOS GEMINI
// ==========================================
app.get('/api/gemini/models', async (req, res) => {
    console.log('🔍 Rota /api/gemini/models foi chamada!');
    try {
        const geminiKey = await getApiKeyFromDatabase('GEMINI_API_KEY');
        
        if (!geminiKey) {
            return res.status(400).json({
                success: false,
                error: 'GEMINI_API_KEY não configurada'
            });
        }
        
        console.log('📡 Consultando modelos disponíveis no Gemini via API...');
        
        // Chamar API oficial do Gemini para listar modelos
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro na API Gemini: ${response.status} - ${errorText}`);
            throw new Error(`Gemini API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filtrar TODOS os modelos Gemini (incluindo VEo, Lite, etc)
        const geminiModels = data.models
            .filter(model => 
                model.name.startsWith('models/') &&
                (model.name.includes('gemini') || model.name.includes('veo')) &&
                model.supportedGenerationMethods && 
                model.supportedGenerationMethods.includes('generateContent')
            )
            .map(model => {
                // Extrair nome simplificado
                const modelId = model.name.replace('models/', '');
                const nameParts = modelId.split('-');
                let displayName = nameParts
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' ')
                    .replace('Gemini', 'Gemini')
                    .replace('Veo', 'VEo');
                
                // Adicionar descrição baseada no tipo de modelo
                let description = '';
                let hasVision = false;
                
                if (modelId.includes('veo')) {
                    description = 'Modelo de geração de vídeo com áudio nativo';
                    hasVision = false;
                } else if (modelId.includes('lite')) {
                    description = 'Modelo mais rápido e econômico - Processamento de alta frequência';
                    hasVision = true;
                } else if (modelId.includes('flash')) {
                    description = 'Modelo rápido e eficiente com suporte a visão';
                    hasVision = true;
                } else if (modelId.includes('pro')) {
                    description = 'Modelo avançado com alta precisão e raciocínio complexo';
                    hasVision = true;
                } else if (modelId.includes('ultra')) {
                    description = 'Modelo mais poderoso (quando disponível)';
                    hasVision = true;
                } else {
                    description = 'Modelo multimodal com suporte avançado';
                    hasVision = true;
                }
                
                // Extrair categoria do modelo
                let category = 'text';
                if (modelId.includes('veo')) {
                    category = 'video';
                } else if (modelId.includes('image') || modelId.includes('nano')) {
                    category = 'image';
                }
                
                return {
                    id: modelId,
                    name: displayName,
                    description: description,
                    has_vision: hasVision,
                    category: category,
                    pricing: getGeminiPricing(modelId)
                };
            })
            .sort((a, b) => {
                // Ordenar: video primeiro, depois text, depois outros
                const order = { video: 0, text: 1, image: 2 };
                const orderA = order[a.category] || 3;
                const orderB = order[b.category] || 3;
                return orderA - orderB;
            });
        
        console.log(`✅ Retornando ${geminiModels.length} modelos do Gemini`);
        
        // Se não retornar modelos da API, usar lista fallback
        if (geminiModels.length === 0) {
            console.warn('⚠️ API não retornou modelos, usando lista fallback');
            const fallbackModels = [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Modelo equilibrado com contexto longo' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Modelo avançado com raciocínio complexo' },
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Modelo rápido e eficiente' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Modelo avançado com alta precisão' }
            ];
            
            return res.json({
                success: true,
                models: fallbackModels.map(m => ({
                    ...m,
                    has_vision: true,
                    pricing: getGeminiPricing(m.id)
                }))
            });
        }
        
        res.json({
            success: true,
            models: geminiModels
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar modelos Gemini:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ROTA PARA LISTAR MODELOS OPENAI
// ==========================================
app.get('/api/openai/models', async (req, res) => {
    console.log('🔍 Rota /api/openai/models foi chamada!');
    try {
        const openaiKey = await getApiKeyFromDatabase('OPENAI_API_KEY');
        
        if (!openaiKey) {
            return res.status(400).json({
                success: false,
                error: 'OPENAI_API_KEY não configurada'
            });
        }
        
        console.log('📡 Consultando modelos disponíveis na OpenAI...');
        
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filtrar apenas modelos com suporte a visão (gpt-4o, gpt-4-turbo, etc)
        const visionModels = data.data.filter(model => 
            (model.id.startsWith('gpt-4o') || 
             model.id.startsWith('gpt-4-turbo') || 
             model.id.startsWith('o1') ||
             model.id.includes('vision')) &&
            !model.id.includes('preview') // Excluir modelos de preview
        ).slice(0, 20); // Limitar a 20 resultados
        
        console.log(`✅ Encontrados ${visionModels.length} modelos com visão`);
        
        res.json({
            success: true,
            models: visionModels.map(m => ({
                id: m.id,
                name: m.id,
                description: m.object === 'model' ? `Modelo ${m.id} com suporte a visão` : m.id,
                has_vision: true, // Todos os modelos filtrados têm visão
                context_window: m.context_window || '128k',
                pricing: getOpenAIPricing(m.id)
            }))
        });
        
    } catch (error) {
        console.error('❌ Erro ao consultar modelos OpenAI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ROTA PARA LISTAR MODELOS DEEPSEEK
// ==========================================
app.get('/api/deepseek/models', async (req, res) => {
    console.log('🔍 Rota /api/deepseek/models foi chamada!');
    try {
        const deepseekKey = await getApiKeyFromDatabase('DEEPSEEK_API_KEY');
        
        if (!deepseekKey) {
            return res.status(400).json({
                success: false,
                error: 'DEEPSEEK_API_KEY não configurada'
            });
        }
        
        console.log('📡 Consultando modelos disponíveis no DeepSeek...');
        
        // Lista de modelos DeepSeek disponíveis
        const visionModels = [
            { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Modelo conversacional com suporte a visão', has_vision: true },
            { id: 'deepseek-chat-0324', name: 'DeepSeek Chat (0324)', description: 'Versão de março 2024 com visão', has_vision: true },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Modelo avançado com raciocínio profundo', has_vision: false }
        ];
        
        console.log(`✅ Retornando ${visionModels.length} modelos do DeepSeek`);
        
        res.json({
            success: true,
            models: visionModels.map(m => ({
                id: m.id,
                name: m.name,
                description: m.description,
                has_vision: m.has_vision, // Campo explícito para indicar suporte a visão
                pricing: getDeepSeekPricing(m.id)
            }))
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar modelos DeepSeek:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// ROTAS DE BASE DE DADOS (REST API)
// ==========================================
const setupDatabaseRoutes = require('./src/database-routes');
const setupBrandingRoutes = require('./src/branding-routes');

setupDatabaseRoutes(app, sessionManager);
setupBrandingRoutes(app, sessionManager);

// ==========================================
// Admin: Executar SQL (Service Role)
// ==========================================
app.post('/api/admin/execute-sql', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        if (!pgPool) {
            return res.status(500).json({ success: false, error: 'Postgres não configurado no servidor (missing SUPABASE_DB_URL/DATABASE_URL)' });
        }

        const { script } = req.body;
        if (!script) {
            return res.status(400).json({ success: false, error: 'Parâmetro "script" é obrigatório' });
        }

        // Whitelist de scripts permitidos (apenas ficheiros em sql/)
        const allowed = {
            'create-site-global-metadata-table': path.join(__dirname, 'sql', 'create-site-global-metadata-table.sql'),
            'add-social-platforms-thumbnails': path.join(__dirname, 'sql', 'add-social-platforms-thumbnails.sql'),
            'add-social-platforms-metadata': path.join(__dirname, 'sql', 'add-social-platforms-metadata.sql'),
            'add-platform-context': path.join(__dirname, 'sql', 'add-platform-context.sql')
        };

        const filePath = allowed[script];
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Script SQL não permitido ou não encontrado' });
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        if (!sql || !sql.trim()) {
            return res.status(400).json({ success: false, error: 'Script SQL vazio' });
        }

        console.log(`🗄️ Executando SQL: ${script}`);
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        res.json({ success: true, message: `Script ${script} executado com sucesso` });
    } catch (error) {
        console.error('❌ Erro ao executar SQL:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ROTAS DE AI COST STATS (REST API)
// ==========================================
const aiCostStatsRoutes = require('./src/ai-cost-stats-api');
// Configurar sessionManager no módulo
aiCostStatsRoutes.setSessionManager(sessionManager);
// Inicializar sistema de sincronização automática
aiCostStatsRoutes.initSync();
// Registar rotas
app.use('/api/ai-costs', aiCostStatsRoutes);
console.log('💰 Rotas de AI Cost Stats carregadas');
console.log('   GET    /api/ai-costs/indicators');
console.log('   POST   /api/ai-costs/query');
console.log('   POST   /api/ai-costs/aggregate');
console.log('   POST   /api/ai-costs/export');
console.log('   GET    /api/ai-costs/event/:eventId');
console.log('   POST   /api/ai-costs/sync');
console.log('   GET    /api/ai-costs/filters');

// Rota para obter CSRF token
app.get('/api/csrf-token', (req, res) => {
    const sessionId = req.cookies?.sid;
    const token = csrfProtection.generateToken(sessionId);
    
    res.json({
        csrfToken: token
    });
});

// Endpoint para obter configuração do processador de um evento
app.get('/api/processor-config/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const processorConfig = await imageProcessor.getProcessorConfigForEvent(eventId);
        
        res.json({
            success: true,
            config: processorConfig
        });
    } catch (error) {
        console.error('Erro ao obter configuração do processador:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Rotas principais
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index-kromi.html'));
});

// Página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'login.html'));
});

// Páginas de gestão de utilizadores e permissões
app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'usuarios.html'));
});

app.get('/perfis-permissoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'perfis-permissoes.html'));
});

// Páginas de templates de email
app.get('/email-templates-platform', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'email-templates-platform.html'));
});

app.get('/email-templates-event', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'email-templates-event.html'));
});

// Rota legada
app.get('/index-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/platform-config', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'configuracoes.html'));
});

app.get('/detection', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'detection-kromi.html'));
});

// Arquivo detection-kromi.html da raiz removido - agora tudo está em src/detection-kromi.html
app.get('/detection-kromi.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'detection-kromi.html'));
});

// Rota /detections-kromi.html - página de scanner/entrada (QR code + código manual)
app.get('/detections-kromi.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'detections-kromi.html'));
});

// Rota /detections - redirecionar para página de scanner
app.get('/detections', (req, res) => {
    res.redirect('/detections-kromi.html');
});

app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'debug-mobile.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'events-kromi.html'));
});

// Rota legada (manter para compatibilidade)
app.get('/events-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'events.html'));
});

app.get('/detection-debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'detection-debug.html'));
});

app.get('/image-processor', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'image-processor-kromi.html'));
});

// Página de gestão da base de dados
app.get('/database-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'database-management-kromi.html'));
});

// Página de classificações
app.get('/classifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'classifications-kromi.html'));
});

// Página de gestão de participantes
app.get('/participants', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'participants-kromi.html'));
});

// Página de configurações do evento
app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'config-kromi.html'));
});

// Rota de compatibilidade para /config/image-processor
app.get('/config/image-processor', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'image-processor-kromi.html'));
});

// Página de rankings por categoria
app.get('/category-rankings', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'category-rankings-kromi.html'));
});

app.get('/devices', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'devices-kromi.html'));
});

app.get('/checkpoint-order', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'checkpoint-order-kromi.html'));
});

// Página de Branding e SEO (apenas Admin)
app.get('/branding-seo', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'branding-seo.html'));
});

app.get('/calibration', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'calibration-kromi.html'));
});

// Rotas legadas (para compatibilidade)
app.get('/calibration-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'calibration.html'));
});

app.get('/detection-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'detection.html'));
});

app.get('/classifications-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'classifications.html'));
});

app.get('/participants-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'participants.html'));
});

app.get('/image-processor-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'image-processor.html'));
});

app.get('/database-management-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'database-management.html'));
});

// Página de Live Stream
app.get('/live-stream', (req, res) => {
    res.sendFile(path.join(__dirname, 'live-stream.html'));
});

// Página de teste do Supabase
app.get('/test-supabase', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-supabase.html'));
});

// Verificar se os certificados existem
const keyPath = path.join(__dirname, 'certs', 'key.pem');
const certPath = path.join(__dirname, 'certs', 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('❌ Certificados SSL não encontrados!');
    console.log('🔧 Execute primeiro: npm run generate-cert');
    process.exit(1);
}

// Configurar HTTPS
const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

// Iniciar servidor HTTPS
const server = https.createServer(httpsOptions, app);

// Configurar Socket.IO para LiveStream Signaling
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Mapa para rastrear dispositivos e salas
const devices = new Map(); // deviceId -> socketId
const rooms = new Map(); // eventId -> Set of socketIds

io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.id);
    
    // Dispositivo registra-se
    socket.on('register-device', ({ deviceId, eventId, deviceName }) => {
        console.log(`📱 Dispositivo registrado: ${deviceName} (${deviceId}) no evento ${eventId}`);
        
        devices.set(deviceId, {
            socketId: socket.id,
            deviceId,
            eventId,
            deviceName,
            status: 'online',
            connectedAt: new Date()
        });
        
        // Adicionar à sala do evento
        socket.join(`event:${eventId}`);
        
        if (!rooms.has(eventId)) {
            rooms.set(eventId, new Set());
        }
        rooms.get(eventId).add(socket.id);
        
        // Notificar viewers sobre novo dispositivo
        socket.to(`event:${eventId}`).emit('device-online', {
            deviceId,
            deviceName,
            status: 'online'
        });
        
        // Enviar lista de dispositivos online para o novo socket
        const onlineDevices = Array.from(devices.values())
            .filter(d => d.eventId === eventId)
            .map(d => ({
                deviceId: d.deviceId,
                deviceName: d.deviceName,
                status: d.status
            }));
        
        socket.emit('devices-list', onlineDevices);
    });
    
    // Viewer registra-se para monitorar evento
    socket.on('register-viewer', ({ eventId }) => {
        console.log(`👁️ Viewer registrado para evento ${eventId}`);
        socket.join(`event:${eventId}`);
        
        // Enviar lista de dispositivos online
        const onlineDevices = Array.from(devices.values())
            .filter(d => d.eventId === eventId)
            .map(d => ({
                deviceId: d.deviceId,
                deviceName: d.deviceName,
                status: d.status
            }));
        
        socket.emit('devices-list', onlineDevices);
    });
    
    // WebRTC Signaling: Offer
    socket.on('webrtc-offer', ({ from, to, offer }) => {
        console.log(`📡 Offer de ${from} para ${to}`);
        const targetDevice = devices.get(to);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('webrtc-offer', { from, offer });
        }
    });
    
    // WebRTC Signaling: Answer
    socket.on('webrtc-answer', ({ from, to, answer }) => {
        console.log(`📡 Answer de ${from} para ${to}`);
        const targetDevice = devices.get(to);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('webrtc-answer', { from, answer });
        }
    });
    
    // WebRTC Signaling: ICE Candidate
    socket.on('webrtc-ice-candidate', ({ from, to, candidate }) => {
        console.log(`📡 ICE candidate de ${from} para ${to}`);
        const targetDevice = devices.get(to);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('webrtc-ice-candidate', { from, candidate });
        }
    });
    
    // Comando para iniciar stream
    socket.on('start-stream', ({ deviceId }) => {
        console.log(`▶️ Comando para iniciar stream do dispositivo ${deviceId}`);
        const device = devices.get(deviceId);
        if (device) {
            io.to(device.socketId).emit('stream-command', { command: 'start' });
        }
    });
    
    // Comando para parar stream
    socket.on('stop-stream', ({ deviceId }) => {
        console.log(`⏹️ Comando para parar stream do dispositivo ${deviceId}`);
        const device = devices.get(deviceId);
        if (device) {
            io.to(device.socketId).emit('stream-command', { command: 'stop' });
        }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
        console.log('🔌 Socket desconectado:', socket.id);
        
        // Remover dispositivo
        for (const [deviceId, device] of devices.entries()) {
            if (device.socketId === socket.id) {
                console.log(`📱 Dispositivo offline: ${device.deviceName}`);
                
                // Notificar viewers
                socket.to(`event:${device.eventId}`).emit('device-offline', {
                    deviceId,
                    deviceName: device.deviceName,
                    status: 'offline'
                });
                
                // Remover da sala
                if (rooms.has(device.eventId)) {
                    rooms.get(device.eventId).delete(socket.id);
                }
                
                devices.delete(deviceId);
                break;
            }
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 VisionKrono servidor iniciado!');
    console.log('');
    console.log('🌐 Acesso local:');
    console.log(`   https://localhost:${PORT}`);
    console.log(`   https://127.0.0.1:${PORT}`);
    console.log('');
    console.log('📱 Acesso móvel:');
    
    // Tentar obter IP local
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    
    // Mostrar IPs disponíveis
    Object.keys(results).forEach(name => {
        results[name].forEach(ip => {
            console.log(`   https://${ip}:${PORT}`);
        });
    });
    
    console.log('');
    console.log('⚠️  IMPORTANTE para telemóvel:');
    console.log('   1. Conecte o telemóvel na mesma rede WiFi');
    console.log('   2. Acesse um dos IPs acima no browser do telemóvel');
    console.log('   3. Aceite o certificado auto-assinado quando solicitado');
    console.log('   4. Permita acesso à câmera e localização');
    console.log('');
    console.log('🔐 Certificado SSL ativo - necessário para acesso à câmera');
    console.log('⏹️  Para parar: Ctrl+C');
    console.log('');
    console.log('🎥 Socket.IO Live Stream Signaling ativo');
    console.log('   - WebRTC P2P com baixa latência');
    console.log('   - Suporte para múltiplos dispositivos');
    console.log('');
    
    // Iniciar processador de imagens em background
    console.log('🤖 Iniciando processador de imagens em background...');
    imageProcessor.init().then(success => {
        if (success) {
            console.log('✅ Processador de imagens ativo e monitorando buffer');
        } else {
            console.log('❌ Falha ao iniciar processador de imagens');
        }
    });
    
    // Iniciar sistema de automação de emails
    console.log('📧 Iniciando sistema de automação de emails...');
    global.emailAutomation = new EmailAutomation(supabaseAdmin);
    global.emailAutomation.start();
});

// Tratamento de erros
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Porta ${PORT} já está em uso!`);
        console.log('🔧 Tente uma porta diferente ou pare o processo que está usando a porta');
    } else {
        console.error('❌ Erro no servidor:', err.message);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Parando servidor...');
    console.log('🛑 Parando processador de imagens...');
    imageProcessor.stop();
    
    if (global.emailAutomation) {
        console.log('🛑 Parando automação de emails...');
        await global.emailAutomation.stop();
    }
    
    server.close(() => {
        console.log('✅ Servidor parado com sucesso!');
        process.exit(0);
    });
});
