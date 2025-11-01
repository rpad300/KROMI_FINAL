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
const DeviceDetectionProcessorSimple = require('./src/device-detection-processor-simple');
const EmailAutomation = require('./src/email-automation');
const SessionManager = require('./src/session-manager');
const { createSessionMiddleware, requireAuth, requireRole } = require('./src/session-middleware');
const setupAuthRoutes = require('./src/auth-routes');
const AuditLogger = require('./src/audit-logger');
const CSRFProtection = require('./src/csrf-protection');

// Integração direta Twilio para SMS (sem depender do Supabase Auth SMS)
// Geramos códigos OTP localmente e enviamos via Twilio API direta

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

// Inicializar processador de device detections (app nativa) - versão SIMPLES (processa no servidor)
const deviceDetectionProcessor = new DeviceDetectionProcessorSimple();

// Middlewares globais
app.use(cookieParser()); // Parser de cookies
app.use(express.json()); // Parser de JSON
app.use(express.urlencoded({ extended: true })); // Parser de form data

// Helper para obter IP real do cliente (suporta proxies)
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           null;
}

// Expor serviços no app para acesso via req.app.get()
app.set('sessionManager', sessionManager);
app.set('auditLogger', auditLogger);

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

// Rota para buscar device_detections (para visualização de imagens)
app.get('/api/device-detections', async (req, res) => {
    try {
        const { status, limit = 10 } = req.query;
        
        // Usar supabaseAdmin se disponível (tem SERVICE_ROLE_KEY)
        const client = supabaseAdmin || supabase;
        
        let query = client
            .from('device_detections')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));
        
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ Erro ao buscar device_detections:', error);
            return res.status(500).json({ error: error.message });
        }
        
        res.json(data || []);
    } catch (error) {
        console.error('❌ Erro na rota /api/device-detections:', error);
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
// SISTEMA DE VERIFICAÇÃO DE CONTACTO
// ==========================================

// Funções helper para verificação
async function checkRateLimit(userId, actionType, maxAttempts = 5, windowMinutes = 60) {
    if (!supabaseAdmin) return { allowed: false, error: 'Service Role Key não configurada' };
    
    const { data: rateLimit, error } = await supabaseAdmin
        .from('verification_rate_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        return { allowed: false, error: error.message };
    }
    
    const now = new Date();
    
    // Se não existe, criar
    if (!rateLimit) {
        await supabaseAdmin
            .from('verification_rate_limits')
            .insert({
                user_id: userId,
                action_type: actionType,
                attempt_count: 1,
                window_start: now.toISOString()
            });
        return { allowed: true };
    }
    
    // Verificar se está bloqueado
    if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > now) {
        const blockedUntil = new Date(rateLimit.blocked_until);
        const minutesLeft = Math.ceil((blockedUntil - now) / 60000);
        return { 
            allowed: false, 
            error: `Bloqueado. Tente novamente em ${minutesLeft} minuto(s)`,
            blocked_until: rateLimit.blocked_until
        };
    }
    
    // Verificar janela de tempo
    const windowStart = new Date(rateLimit.window_start);
    const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60000);
    
    if (now > windowEnd) {
        // Nova janela, resetar contador
        await supabaseAdmin
            .from('verification_rate_limits')
            .update({
                attempt_count: 1,
                window_start: now.toISOString(),
                blocked_until: null
            })
            .eq('id', rateLimit.id);
        return { allowed: true };
    }
    
    // Verificar tentativas
    if (rateLimit.attempt_count >= maxAttempts) {
        // Bloquear por 1 hora
        const blockedUntil = new Date(now.getTime() + 60 * 60000);
        await supabaseAdmin
            .from('verification_rate_limits')
            .update({
                blocked_until: blockedUntil.toISOString()
            })
            .eq('id', rateLimit.id);
        
        return { 
            allowed: false, 
            error: `Limite de tentativas excedido. Bloqueado por 1 hora.`,
            blocked_until: blockedUntil.toISOString()
        };
    }
    
    // Incrementar contador
    await supabaseAdmin
        .from('verification_rate_limits')
        .update({
            attempt_count: rateLimit.attempt_count + 1
        })
        .eq('id', rateLimit.id);
    
    return { allowed: true, attemptsLeft: maxAttempts - rateLimit.attempt_count - 1 };
}

async function checkCooldown(userId, actionType, cooldownSeconds = 60) {
    if (!supabaseAdmin) return { allowed: true }; // Se não há admin, permitir
    
    const { data: rateLimit } = await supabaseAdmin
        .from('verification_rate_limits')
        .select('updated_at')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .single();
    
    if (!rateLimit) return { allowed: true };
    
    const lastUpdate = new Date(rateLimit.updated_at);
    const now = new Date();
    const secondsSince = (now - lastUpdate) / 1000;
    
    if (secondsSince < cooldownSeconds) {
        const secondsLeft = Math.ceil(cooldownSeconds - secondsSince);
        return { 
            allowed: false, 
            error: `Aguarde ${secondsLeft} segundo(s) antes de reenviar`,
            secondsLeft 
        };
    }
    
    return { allowed: true };
}

// Função para renderizar template SMS
async function renderSMSTemplate(templateKey, variables = {}) {
    try {
        if (!supabaseAdmin) {
            throw new Error('Service Role Key não configurada');
        }
        
        const { data, error } = await supabaseAdmin
            .rpc('render_sms_template', {
                template_key_param: templateKey,
                variables_param: variables
            });
        
        if (error) {
            console.warn(`⚠️ Erro ao renderizar template SMS ${templateKey}:`, error);
            // Fallback para template padrão
            return `O seu código Kromi é ${variables.code || 'XXXXXX'}. Válido por 10 minutos.`;
        }
        
        if (data && data.length > 0) {
            return data[0].message;
        }
        
        throw new Error('Template retornou vazio');
    } catch (error) {
        console.warn(`⚠️ Erro ao renderizar SMS template:`, error);
        // Fallback simples
        return `O seu código Kromi é ${variables.code || 'XXXXXX'}. Válido por 10 minutos.`;
    }
}

// Função para registrar SMS no log
async function logSMS(templateKey, phone, message, status = 'sent', metadata = {}) {
    try {
        if (!supabaseAdmin) {
            return; // Silenciosamente falhar se não tiver admin client
        }
        
        await supabaseAdmin
            .from('sms_logs')
            .insert({
                template_key: templateKey,
                recipient_phone: phone,
                message: message,
                status: status,
                sent_at: new Date().toISOString(),
                metadata: metadata
            });
    } catch (error) {
        console.warn('⚠️ Erro ao registrar SMS no log:', error);
        // Não falhar se o log falhar
    }
}

// ==========================================
// FUNÇÕES TWILIO DIRETO
// ==========================================

// Função para gerar código OTP (6 dígitos)
function generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Função para enviar SMS diretamente via Twilio API
async function sendSMSViaTwilioDirect(phone, message) {
    try {
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        let twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
        
        if (!twilioAuthToken) {
            throw new Error('TWILIO_AUTH_TOKEN não configurado nas variáveis de ambiente');
        }
        
        // Se não tem número From configurado, tentar buscar da base de dados ou usar padrão
        if (!twilioFromNumber) {
            // Tentar buscar da base de dados (platform_configurations)
            try {
                if (supabaseAdmin) {
                    const { data: config } = await supabaseAdmin
                        .from('platform_configurations')
                        .select('config_value')
                        .eq('config_key', 'TWILIO_FROM_NUMBER')
                        .maybeSingle();
                    
                    if (config && config.config_value) {
                        twilioFromNumber = config.config_value;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Erro ao buscar TWILIO_FROM_NUMBER da base de dados:', e);
            }
            
            // Fallback: usar padrão (número correto da conta)
            if (!twilioFromNumber) {
                twilioFromNumber = '+13188893212';
                console.warn('⚠️ TWILIO_FROM_NUMBER não configurado. Usando padrão:', twilioFromNumber);
            }
        }
        
        console.log(`📱 Enviando SMS via Twilio: From=${twilioFromNumber}, To=${phone}, Account=${twilioAccountSid}`);
        
        // Usar biblioteca Twilio se disponível, senão usar HTTPS
        let twilio;
        try {
            twilio = require('twilio');
        } catch (e) {
            // Se não tiver biblioteca, usar HTTPS nativo
            const https = require('https');
            const querystring = require('querystring');
            
            const postData = querystring.stringify({
                To: phone,
                From: twilioFromNumber,
                Body: message
            });
            
            const options = {
                hostname: 'api.twilio.com',
                port: 443,
                path: `/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
                }
            };
            
            return new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                console.log(`✅ SMS enviado via Twilio direto: ${response.sid}`);
                                resolve({
                                    success: true,
                                    sid: response.sid,
                                    status: response.status
                                });
                            } else {
                                reject(new Error(response.message || `Erro HTTP ${res.statusCode}: ${data}`));
                            }
                        } catch (parseError) {
                            reject(new Error('Erro ao processar resposta: ' + parseError.message));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.write(postData);
                req.end();
            });
        }
        
        // Se tiver biblioteca Twilio instalada, usar ela
        const client = twilio(twilioAccountSid, twilioAuthToken);
        
        const result = await client.messages.create({
            to: phone,
            from: twilioFromNumber,
            body: message
        });
        
        console.log(`✅ SMS enviado via Twilio direto: ${result.sid}`);
        
        return {
            success: true,
            sid: result.sid,
            status: result.status
        };
        
    } catch (error) {
        console.error('❌ Erro ao enviar SMS via Twilio:', error);
        
        // Verificar se é erro de número não pertencer à conta
        if (error.message && (error.message.includes('Mismatch') || error.message.includes('does not belong'))) {
            const configError = new Error(`O número "From" (${twilioFromNumber}) não pertence à conta Twilio configurada. Verifique se o número está correto e pertence à conta ${twilioAccountSid}`);
            configError.code = 'TWILIO_NUMBER_MISMATCH';
            throw configError;
        }
        
        throw new Error('Erro ao enviar SMS: ' + error.message);
    }
}

// Função para armazenar código OTP no user_profiles
async function storeOTPCode(userId, phone, code, expiresInMinutes = 10) {
    try {
        if (!supabaseAdmin) {
            throw new Error('Service Role Key não configurada');
        }
        
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
        
        // Buscar perfil por user_id ou phone
        let profileQuery = supabaseAdmin
            .from('user_profiles')
            .select('id, user_id');
        
        if (userId) {
            profileQuery = profileQuery.eq('user_id', userId);
        } else {
            profileQuery = profileQuery.eq('phone', phone);
        }
        
        const { data: profile, error: profileError } = await profileQuery.maybeSingle();
        
        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }
        
        if (!profile && !userId) {
            // Se não existe perfil e não temos userId, não podemos armazenar
            console.warn('⚠️ Não foi possível armazenar código OTP: perfil não encontrado');
            return false;
        }
        
        // Atualizar ou criar perfil com código OTP
        const updateData = {
            sms_verification_code: code,
            sms_code_expires_at: expiresAt.toISOString(),
            sms_code_attempts: 0,
            updated_at: new Date().toISOString()
        };
        
        if (profile) {
            const { error: updateError } = await supabaseAdmin
                .from('user_profiles')
                .update(updateData)
                .eq('id', profile.id);
            
            if (updateError) throw updateError;
        } else if (userId) {
            // Criar perfil básico se não existe
            const { error: insertError } = await supabaseAdmin
                .from('user_profiles')
                .upsert({
                    user_id: userId,
                    phone: phone,
                    ...updateData,
                    status: 'pending_verification',
                    role: 'user'
                }, {
                    onConflict: 'user_id'
                });
            
            if (insertError) throw insertError;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao armazenar código OTP:', error);
        return false;
    }
}

// Função para verificar código OTP armazenado
async function verifyOTPCode(phone, code, userId = null) {
    try {
        if (!supabaseAdmin) {
            throw new Error('Service Role Key não configurada');
        }
        
        // Buscar perfil por phone ou user_id
        let profileQuery = supabaseAdmin
            .from('user_profiles')
            .select('id, user_id, sms_verification_code, sms_code_expires_at, sms_code_attempts, phone');
        
        if (userId) {
            profileQuery = profileQuery.eq('user_id', userId);
        } else {
            profileQuery = profileQuery.eq('phone', phone);
        }
        
        const { data: profile, error: profileError } = await profileQuery.maybeSingle();
        
        if (profileError) {
            throw profileError;
        }
        
        if (!profile) {
            return {
                valid: false,
                error: 'Perfil não encontrado'
            };
        }
        
        // Verificar se código existe e não expirou
        if (!profile.sms_verification_code) {
            return {
                valid: false,
                error: 'Nenhum código OTP gerado para este telefone'
            };
        }
        
        // Verificar expiração
        const expiresAt = new Date(profile.sms_code_expires_at);
        if (expiresAt < new Date()) {
            return {
                valid: false,
                error: 'Código OTP expirado'
            };
        }
        
        // Verificar tentativas (máximo 5)
        if (profile.sms_code_attempts >= 5) {
            return {
                valid: false,
                error: 'Muitas tentativas inválidas. Solicite um novo código.'
            };
        }
        
        // Verificar código
        if (profile.sms_verification_code !== code) {
            // Incrementar tentativas
            await supabaseAdmin
                .from('user_profiles')
                .update({
                    sms_code_attempts: (profile.sms_code_attempts || 0) + 1
                })
                .eq('id', profile.id);
            
            return {
                valid: false,
                error: 'Código inválido'
            };
        }
        
        // Código válido! Limpar código e atualizar telefone confirmado
        const now = new Date().toISOString();
        await supabaseAdmin
            .from('user_profiles')
            .update({
                sms_verification_code: null,
                sms_code_expires_at: null,
                sms_code_attempts: 0,
                phone_confirmed_at: now,
                phone: phone, // Garantir que telefone está atualizado
                updated_at: now
            })
            .eq('id', profile.id);
        
        return {
            valid: true,
            userId: profile.user_id
        };
        
    } catch (error) {
        console.error('❌ Erro ao verificar código OTP:', error);
        return {
            valid: false,
            error: error.message
        };
    }
}

// Função para sincronizar verificação de telefone com Supabase Auth
async function syncPhoneVerificationWithSupabase(userId, phone) {
    try {
        if (!supabaseAdmin) {
            console.warn('⚠️ Service Role Key não configurada - não é possível sincronizar com Supabase Auth');
            return false;
        }
        
        // Atualizar telefone e confirmação no Supabase Auth usando Admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            {
                phone: phone,
                phone_confirmed: true
            }
        );
        
        if (updateError) {
            console.warn('⚠️ Erro ao sincronizar telefone com Supabase Auth:', updateError);
            return false;
        }
        
        console.log(`✅ Telefone sincronizado com Supabase Auth: ${userId}`);
        return true;
        
    } catch (error) {
        console.warn('⚠️ Erro ao sincronizar telefone com Supabase:', error);
        return false;
    }
}

// Endpoint: Enviar código SMS para verificação (via Twilio Direto)
app.post('/api/auth/send-sms-code', express.json(), async (req, res) => {
    try {
        const { phone, user_id, email } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Telefone é obrigatório'
            });
        }
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Verificar se Twilio está configurado
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        if (!twilioAuthToken) {
            return res.status(500).json({
                success: false,
                error: 'TWILIO_AUTH_TOKEN não configurado nas variáveis de ambiente'
            });
        }
        
        // Buscar utilizador se fornecido (opcional, pode ser login com telefone apenas)
        let userId = user_id;
        if (!userId && email) {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const authUser = authUsers.users.find(u => u.email === email);
            if (authUser) {
                userId = authUser.id;
            }
        }
        
        // Se temos user_id, verificar rate limiting
        if (userId) {
            // Verificar cooldown (60 segundos)
            const cooldownCheck = await checkCooldown(userId, 'sms_send', 60);
            if (!cooldownCheck.allowed) {
                return res.status(429).json({
                    success: false,
                    error: cooldownCheck.error,
                    secondsLeft: cooldownCheck.secondsLeft
                });
            }
            
            // Verificar rate limit (5 tentativas por hora)
            const rateLimitCheck = await checkRateLimit(userId, 'sms_send', 5, 60);
            if (!rateLimitCheck.allowed) {
                return res.status(429).json({
                    success: false,
                    error: rateLimitCheck.error,
                    blocked_until: rateLimitCheck.blocked_until
                });
            }
        }
        
        // Buscar perfil para obter nome do utilizador (se disponível)
        let userName = null;
        if (userId) {
            try {
                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('name')
                    .eq('user_id', userId)
                    .single();
                
                if (profile) {
                    userName = profile.name;
                }
            } catch (e) {
                // Ignorar erro
            }
        }
        
        // Verificar se telefone existe antes de enviar SMS
        const duplicateCheck = await checkDuplicateContact(null, phone);
        if (!duplicateCheck.exists) {
            console.log(`ℹ️ Telefone não encontrado: ${phone} - Sugerindo registo`);
            
            return res.status(404).json({
                success: false,
                error: 'Este telefone não está registado. Por favor, registe-se primeiro.',
                code: 'PHONE_NOT_FOUND',
                suggestion: 'register'
            });
        }
        
        // Gerar código OTP localmente
        const otpCode = generateOTPCode();
        console.log(`📱 Gerando código OTP para: ${phone} (código: ${otpCode})`);
        
        // Armazenar código OTP no user_profiles
        const stored = await storeOTPCode(userId, phone, otpCode, 10);
        if (!stored) {
            console.warn('⚠️ Não foi possível armazenar código OTP, mas continuando...');
        }
        
        // Preparar variáveis para template SMS
        const templateVars = {
            code: otpCode,
            user_name: userName || 'Utilizador',
            expires_minutes: '10'
        };
        
        // Renderizar template SMS com código real
        const renderedMessage = await renderSMSTemplate('phone_verification', templateVars);
        
        // Enviar SMS via Twilio direto
        console.log(`📱 Enviando SMS via Twilio direto para: ${phone}`);
        
        try {
            const smsResult = await sendSMSViaTwilioDirect(phone, renderedMessage);
            
            // Registrar sucesso no log
            await logSMS('phone_verification', phone, renderedMessage, 'sent', {
                provider: 'twilio_direct',
                user_id: userId || null,
                email: email || null,
                message_sid: smsResult.sid || null,
                otp_code: otpCode // Para debugging (remover em produção se necessário)
            });
            
            console.log(`✅ SMS enviado para ${phone} via Twilio direto (template: phone_verification, SID: ${smsResult.sid})`);
            
            // Se temos user_id, atualizar perfil e fazer audit log
            if (userId) {
                // Atualizar telefone no perfil se necessário
                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('phone')
                    .eq('user_id', userId)
                    .single();
                
                if (profile && profile.phone !== phone) {
                    await supabaseAdmin
                        .from('user_profiles')
                        .update({ phone: phone })
                        .eq('user_id', userId);
                }
                
                // Audit log
                await auditLogger.log('SMS_CODE_SENT', userId, {
                    phone: phone,
                    method: 'twilio_direct',
                    message_sid: smsResult.sid
                });
            }
            
            res.json({
                success: true,
                message: 'Código SMS enviado com sucesso',
                expires_in: 600 // 10 minutos
            });
            
        } catch (smsError) {
            console.error('❌ Erro ao enviar SMS via Twilio:', smsError);
            
            // Registrar falha no log
            await logSMS('phone_verification', phone, renderedMessage, 'failed', {
                error: smsError.message || 'Erro desconhecido',
                provider: 'twilio_direct',
                user_id: userId || null,
                email: email || null,
                error_code: smsError.code
            });
            
            // Verificar se é erro de número não pertencer à conta
            if (smsError.code === 'TWILIO_NUMBER_MISMATCH' || (smsError.message && smsError.message.includes('Mismatch'))) {
                return res.status(500).json({
                    success: false,
                    error: smsError.message || 'O número "From" não pertence à conta Twilio configurada. Verifique a configuração.',
                    code: 'TWILIO_NUMBER_MISMATCH',
                    details: 'O número Twilio configurado não pertence à conta. Verifique no Console Twilio quais números pertencem à sua conta e configure TWILIO_FROM_NUMBER corretamente.'
                });
            }
            
            return res.status(500).json({
                success: false,
                error: 'Erro ao enviar SMS: ' + (smsError.message || 'Erro desconhecido'),
                code: 'SMS_SEND_ERROR'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar código SMS:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Verificar código SMS (via OTP local + sincronização Supabase)
app.post('/api/auth/verify-phone', express.json(), async (req, res) => {
    try {
        const { code, phone, user_id } = req.body;
        
        if (!code || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Código e telefone são obrigatórios'
            });
        }
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        console.log(`🔍 Verificando código OTP para: ${phone}`);
        
        // Verificar código OTP armazenado localmente
        const verifyResult = await verifyOTPCode(phone, code, user_id);
        
        if (!verifyResult.valid) {
            console.error('❌ Código OTP inválido:', verifyResult.error);
            
            // Se temos user_id, incrementar tentativas de rate limiting
            if (user_id) {
                await checkRateLimit(user_id, 'sms_verify', 5, 60);
            }
            
            return res.status(400).json({
                success: false,
                error: verifyResult.error || 'Código inválido ou expirado'
            });
        }
        
        const userId = verifyResult.userId || user_id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Utilizador não encontrado. Por favor, registe-se primeiro.'
            });
        }
        
        // Sincronizar verificação de telefone com Supabase Auth
        console.log(`🔄 Sincronizando telefone confirmado com Supabase Auth para: ${userId}`);
        await syncPhoneVerificationWithSupabase(userId, phone);
        
        // Buscar perfil
        let profile = null;
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (profileError && profileError.code === 'PGRST116') {
            // Criar perfil básico se não existe
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const authUser = authUsers.users.find(u => u.id === userId);
            
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('user_profiles')
                .insert({
                    user_id: userId,
                    email: authUser?.email || null,
                    phone: phone,
                    status: 'active', // Já confirmou telefone
                    phone_confirmed_at: new Date().toISOString(),
                    last_verification_channel: 'phone'
                })
                .select()
                .single();
            
            if (!createError && newProfile) {
                profile = newProfile;
            }
        } else if (profileData) {
            profile = profileData;
        }
        
        // O telefone já foi confirmado na função verifyOTPCode
        // O trigger SQL vai atualizar o status para 'active' automaticamente
        
        console.log(`✅ Telefone confirmado para user_id: ${userId}`);
        
        // Buscar email do utilizador no Supabase Auth
        let userEmail = null;
        try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const authUser = authUsers.users.find(u => u.id === userId);
            if (authUser) {
                userEmail = authUser.email;
            }
        } catch (e) {
            console.warn('⚠️ Erro ao buscar email do utilizador:', e);
        }
        
        // Audit log
        await auditLogger.log('PHONE_VERIFIED', userId, {
            phone: phone,
            method: 'twilio_direct_otp'
        });
        
        // Criar sessão se necessário
        let sessionData = null;
        try {
            if (profile) {
                const sessionId = sessionManager.createSession(userId, {
                    user_id: userId,
                    email: profile.email || userEmail,
                    name: profile.name,
                    role: profile.role || 'user',
                    status: profile.status || 'active'
                }, {
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                    loginAt: Date.now()
                });
                
                // Configurar cookie
                res.cookie('sid', sessionId, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'lax',
                    maxAge: sessionManager.MAX_SESSION_LIFETIME,
                    path: '/'
                });
                
                sessionData = {
                    expiresIn: sessionManager.INACTIVITY_TIMEOUT / 1000,
                    maxLifetime: sessionManager.MAX_SESSION_LIFETIME / 1000
                };
            }
        } catch (sessionError) {
            console.warn('⚠️ Erro ao criar sessão:', sessionError);
        }
        
        res.json({
            success: true,
            message: 'Telefone confirmado com sucesso',
            user: {
                id: userId,
                email: profile?.email || userEmail,
                phone: phone
            },
            session: sessionData
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar código SMS:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Verificar email (callback do Supabase)
app.get('/api/auth/verify-email-callback', async (req, res) => {
    try {
        const { token, type } = req.query;
        
        if (!token) {
            return res.redirect('/auth/email-verification-failed?error=token_missing');
        }
        
        if (!supabaseAdmin) {
            return res.redirect('/auth/email-verification-failed?error=config_error');
        }
        
        // O Supabase já processou o token quando o utilizador clica no link
        // Precisamos sincronizar o email_confirmed_at do auth.users para user_profiles
        // Vamos redirecionar para página que faz isso via API (com sessão do utilizador)
        return res.redirect(`/verify-contact.html?email_verified=true&token=${token}`);
        
    } catch (error) {
        console.error('❌ Erro no callback de verificação de email:', error);
        res.redirect('/auth/email-verification-failed?error=' + encodeURIComponent(error.message));
    }
});

// Endpoint: Reenviar SMS ou Email
app.post('/api/auth/resend-verification', express.json(), async (req, res) => {
    try {
        const { type, user_id, email, phone } = req.body; // type: 'sms' ou 'email'
        
        if (!type || !user_id && !email) {
            return res.status(400).json({
                success: false,
                error: 'Tipo e user_id ou email são obrigatórios'
            });
        }
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Buscar utilizador
        let userId = user_id;
        if (!userId && email) {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const authUser = authUsers.users.find(u => u.email === email);
            if (!authUser) {
                return res.status(404).json({
                    success: false,
                    error: 'Utilizador não encontrado'
                });
            }
            userId = authUser.id;
        }
        
        if (type === 'sms') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefone é obrigatório para reenvio de SMS'
                });
            }
            
            // Buscar nome do utilizador para template
            let userName = null;
            try {
                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('name')
                    .eq('user_id', userId)
                    .single();
                
                if (profile) {
                    userName = profile.name;
                }
            } catch (e) {
                // Ignorar erro
            }
            
            // Verificar cooldown
            const cooldownCheck = await checkCooldown(userId, 'sms_send', 60);
            if (!cooldownCheck.allowed) {
                return res.status(429).json({
                    success: false,
                    error: cooldownCheck.error,
                    secondsLeft: cooldownCheck.secondsLeft
                });
            }
            
            // Buscar telefone do perfil se não fornecido
            if (!phone) {
                try {
                    const { data: profile } = await supabaseAdmin
                        .from('user_profiles')
                        .select('phone')
                        .eq('user_id', userId)
                        .single();
                    
                    if (profile && profile.phone) {
                        phone = profile.phone;
                    } else {
                        // Buscar em auth.users
                        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
                        if (authUser?.user?.phone) {
                            phone = authUser.user.phone;
                        }
                    }
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        error: 'Telefone não encontrado para este utilizador'
                    });
                }
            }
            
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefone não encontrado para este utilizador'
                });
            }
            
            // Gerar novo código OTP
            const otpCode = generateOTPCode();
            
            // Armazenar código OTP
            await storeOTPCode(userId, phone, otpCode, 10);
            
            // Renderizar template
            const templateVars = {
                code: otpCode,
                user_name: userName || 'Utilizador',
                expires_minutes: '10'
            };
            
            const renderedMessage = await renderSMSTemplate('phone_verification', templateVars);
            
            try {
                // Enviar via Twilio direto
                const smsResult = await sendSMSViaTwilioDirect(phone, renderedMessage);
                
                // Log
                await logSMS('phone_verification', phone, renderedMessage, 'sent', {
                    provider: 'twilio_direct',
                    user_id: userId,
                    message_sid: smsResult.sid,
                    resend: true
                });
                
                res.json({
                    success: true,
                    message: 'SMS reenviado com sucesso'
                });
            } catch (smsError) {
                console.error('❌ Erro ao reenviar SMS:', smsError);
                
                // Log erro
                await logSMS('phone_verification', phone, renderedMessage, 'failed', {
                    error: smsError.message,
                    provider: 'twilio_direct',
                    user_id: userId,
                    resend: true
                });
                
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao enviar SMS: ' + smsError.message
                });
            }
            
        } else if (type === 'email') {
            // Reenviar email de confirmação
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
            
            // Gerar novo link de confirmação
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'signup',
                email: authUser.user.email,
                options: { redirectTo: null }
            });
            
            if (linkError || !linkData) {
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao gerar link de confirmação'
                });
            }
            
            const urlObj = new URL(linkData.properties.action_link);
            const token = urlObj.searchParams.get('token');
            
            // Buscar APP_URL
            // PRIORIDADE 1: Variável de ambiente (.env) - RECOMENDADO
            let appUrl = process.env.APP_URL;
            
            // PRIORIDADE 2: Base de dados (fallback)
            if (!appUrl) {
                try {
                    const { data: urlConfig } = await supabaseAdmin
                        .from('platform_configurations')
                        .select('config_value')
                        .eq('config_key', 'APP_URL')
                        .single();
                    if (urlConfig && urlConfig.config_value) {
                        appUrl = urlConfig.config_value;
                    }
                } catch (e) {
                    // Ignorar erro e continuar
                }
            }
            
            // PRIORIDADE 3: Hostname da requisição (último recurso)
            if (!appUrl) {
                const host = req.get('host') || req.hostname;
                const protocol = req.protocol || (req.secure ? 'https' : 'http');
                appUrl = `${protocol}://${host}`;
            }
            
            const confirmationUrl = `${appUrl}/api/auth/verify-email-callback?token=${token}&type=email`;
            
            // Enviar email usando template
            try {
                const { data: template } = await supabaseAdmin
                    .from('email_templates')
                    .select('*')
                    .eq('template_key', 'signup_confirmation')
                    .eq('is_active', true)
                    .single();
                
                if (template) {
                    const variables = {
                        user_name: authUser.user.user_metadata?.full_name || authUser.user.email.split('@')[0],
                        confirmation_url: confirmationUrl,
                        expiry_time: '24'
                    };
                    
                    const { data: rendered } = await supabaseAdmin
                        .rpc('render_email_template', {
                            template_key_param: 'signup_confirmation',
                            variables_param: variables
                        });
                    
                    if (rendered && rendered.length > 0) {
                        await sendConfirmationEmailDirectly(
                            authUser.user.email, 
                            rendered[0].subject, 
                            rendered[0].body_html
                        );
                    }
                } else {
                    // Usar template padrão
                    const userName = authUser.user.user_metadata?.full_name || authUser.user.email.split('@')[0];
                    const subject = '✅ Confirme o seu registo no VisionKrono';
                    const html = createDefaultConfirmationEmail(userName, confirmationUrl);
                    await sendConfirmationEmailDirectly(authUser.user.email, subject, html);
                }
            } catch (emailError) {
                console.error('Erro ao reenviar email:', emailError);
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao enviar email: ' + emailError.message
                });
            }
            
            res.json({
                success: true,
                message: 'Email de confirmação reenviado com sucesso'
            });
            
        } else {
            return res.status(400).json({
                success: false,
                error: 'Tipo inválido. Use "sms" ou "email"'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao reenviar verificação:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Sincronizar verificação de email (chamado após callback do Supabase)
app.post('/api/auth/sync-email-verification', express.json(), async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Buscar utilizador autenticado da sessão
        const session = req.session;
        if (!session || !session.userId) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado'
            });
        }
        
        // Buscar dados do auth.users para verificar email_confirmed_at
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(session.userId);
        
        if (authError || !authData || !authData.user) {
            return res.status(404).json({
                success: false,
                error: 'Utilizador não encontrado'
            });
        }
        
        // Se email já está confirmado no auth.users, atualizar perfil
        // O trigger SQL vai automaticamente atualizar status de 'pending_verification' para 'active'
        if (authData.user.email_confirmed_at) {
            await supabaseAdmin
                .from('user_profiles')
                .update({
                    email_confirmed_at: authData.user.email_confirmed_at,
                    last_verification_channel: 'email'
                    // O trigger update_user_verification_status() vai mudar status para 'active' automaticamente
                })
                .eq('user_id', session.userId);
            
            // Audit log
            await auditLogger.log('EMAIL_VERIFIED', session.userId, {
                email: authData.user.email
            });
            
            console.log(`✅ Email sincronizado para user_id: ${session.userId}`);
            
            res.json({
                success: true,
                message: 'Email confirmado com sucesso'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Email ainda não confirmado no Supabase'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar verificação de email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Iniciar login com Google OAuth
app.get('/api/auth/google', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Supabase não configurado'
            });
        }
        
        // Obter URL base da aplicação
        // PRIORIDADE 1: Variável de ambiente (.env) - RECOMENDADO
        let appUrl = process.env.APP_URL;
        
        // PRIORIDADE 2: Base de dados (fallback)
        if (!appUrl) {
            try {
                const { data: urlConfig } = await supabaseAdmin
                    .from('platform_configurations')
                    .select('config_value')
                    .eq('config_key', 'APP_URL')
                    .single();
                
                if (urlConfig && urlConfig.config_value) {
                    appUrl = urlConfig.config_value;
                }
            } catch (e) {
                // Ignorar erro e continuar
            }
        }
        
        // PRIORIDADE 3: Hostname da requisição (último recurso)
        if (!appUrl) {
            const protocol = req.protocol === 'https' ? 'https' : 'http';
            const host = req.get('host') || req.hostname;
            appUrl = `${protocol}://${host}`;
        }
        
        // Usar página HTML que funciona mesmo se Supabase redirecionar para localhost:3000
        const redirectUrl = `${appUrl}/auth/google-callback.html`;
        
        console.log(`🔐 Iniciando Google OAuth com callback: ${redirectUrl}`);
        
        // Usar Supabase Auth para iniciar OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: false,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
        
        if (error) {
            console.error('❌ Erro ao iniciar OAuth Google:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
        
        // Redirecionar para URL do Google OAuth
        if (data?.url) {
            res.redirect(data.url);
        } else {
            res.status(500).json({
                success: false,
                error: 'URL de OAuth não gerada'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro no login com Google:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Callback do Google OAuth
app.get('/api/auth/google/callback', async (req, res) => {
    try {
        // O Supabase pode retornar de duas formas:
        // 1. Query params (fluxo com código): ?code=...
        // 2. Hash fragment (fluxo implícito): #access_token=...
        
        const { code, error: oauthError } = req.query;
        const hash = req.query.hash || req.url.match(/#(.+)/)?.[1];
        
        if (oauthError) {
            console.error('❌ Erro no OAuth Google:', oauthError);
            return res.redirect(`/login.html?error=${encodeURIComponent(oauthError)}`);
        }
        
        if (!supabase) {
            return res.redirect('/login.html?error=config_error');
        }
        
        let sessionData = null;
        let session = null;
        let user = null;
        
        // Se temos código, usar fluxo de autorização
        if (code) {
            console.log('📝 Processando OAuth com código...');
            const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (sessionError || !data?.session) {
                console.error('❌ Erro ao trocar código por sessão:', sessionError);
                return res.redirect('/login.html?error=auth_failed');
            }
            
            sessionData = data;
            session = data.session;
            user = data.user;
        } 
        // Se não temos código, o token pode estar no hash (fluxo implícito)
        // Mas na verdade, se não temos código, devemos redirecionar para a página HTML
        // que vai processar o hash (mesmo que venha de localhost:3000)
        else {
            // Obter URL base da aplicação
            // PRIORIDADE 1: Variável de ambiente (.env) - RECOMENDADO
            let appUrl = process.env.APP_URL;
            
            // PRIORIDADE 2: Base de dados (fallback)
            if (!appUrl) {
                try {
                    const { data: urlConfig } = await supabaseAdmin
                        .from('platform_configurations')
                        .select('config_value')
                        .eq('config_key', 'APP_URL')
                        .single();
                    
                    if (urlConfig && urlConfig.config_value) {
                        appUrl = urlConfig.config_value;
                    }
                } catch (e) {
                    // Ignorar erro e continuar
                }
            }
            
            // PRIORIDADE 3: Hostname da requisição (último recurso)
            if (!appUrl) {
                const protocol = req.protocol === 'https' ? 'https' : 'http';
                const host = req.get('host') || req.hostname;
                appUrl = `${protocol}://${host}`;
            }
            
            const redirectUrl = `${appUrl}/auth/google-callback.html`;
            
            // Se já estamos na URL correta com hash, deixar o browser processar
            // Se não, redirecionar (mas manter o hash se houver)
            if (req.url.includes('access_token') || req.url.includes('#')) {
                // Já temos tokens no URL, redirecionar para página HTML que processa
                return res.redirect(redirectUrl + req.url);
            }
            
            return res.redirect('/login.html?error=missing_code');
        }
        
        // Código abaixo só executa se temos código (fluxo PKCE)
        if (!user) {
            return; // Já foi redirecionado acima
        }
        
        console.log(`✅ Google OAuth bem-sucedido: ${user.email}`);
        
        // Verificar se utilizador já existe na base de dados
        if (!supabaseAdmin) {
            return res.redirect('/login.html?error=config_error');
        }
        
        // Buscar perfil existente
        let profile = null;
        const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (existingProfile) {
            profile = existingProfile;
            console.log('📋 Perfil existente encontrado:', profile.email);
        } else {
            // Verificar se existe utilizador com mesmo email (mas diferente auth provider)
            const { data: emailProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('email', user.email)
                .maybeSingle();
            
            if (emailProfile) {
                // Utilizador existe com email mas sem Google OAuth - vincular
                console.log('🔗 Vinculando Google OAuth a utilizador existente:', user.email);
                
                // Atualizar perfil para usar o user_id do Google
                await supabaseAdmin
                    .from('user_profiles')
                    .update({ user_id: user.id })
                    .eq('id', emailProfile.id);
                
                profile = { ...emailProfile, user_id: user.id };
            } else {
                // Criar novo perfil
                console.log('➕ Criando novo perfil para:', user.email);
                
                const { data: newProfile, error: createError } = await supabaseAdmin
                    .from('user_profiles')
                    .insert({
                        user_id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilizador',
                        phone: user.phone || null,
                        role: 'user',
                        status: 'pending_verification', // Precisa verificar contacto
                        is_active: false
                    })
                    .select()
                    .single();
                
                if (createError) {
                    console.error('❌ Erro ao criar perfil:', createError);
                    return res.redirect('/login.html?error=profile_creation_failed');
                }
                
                profile = newProfile;
            }
        }
        
        // Verificar status do utilizador
        if (profile.status === 'inactive' || profile.status === 'suspended') {
            return res.redirect(`/login.html?error=${encodeURIComponent('Conta desativada. Contacte o administrador.')}`);
        }
        
        // Criar sessão server-side
        const sessionManager = req.app.get('sessionManager');
        const sessionId = sessionManager.createSession(user.id, profile, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            loginAt: Date.now(),
            provider: 'google'
        });
        
        // Configurar cookie
        res.cookie('sid', sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: sessionManager.MAX_SESSION_LIFETIME,
            path: '/'
        });
        
        // Audit log
        const auditLogger = req.app.get('auditLogger');
        await auditLogger.log('LOGIN_SUCCESS', user.id, {
            email: user.email,
            provider: 'google',
            role: profile.role,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Atualizar último login
        await supabaseAdmin
            .from('user_profiles')
            .update({
                last_login: new Date().toISOString(),
                login_count: (profile.login_count || 0) + 1
            })
            .eq('user_id', user.id);
        
        // Redirecionar baseado no status
        if (profile.status === 'pending_verification') {
            return res.redirect('/verify-contact.html');
        }
        
        // Redirecionar para página inicial
        return res.redirect('/index-kromi.html');
        
    } catch (error) {
        console.error('❌ Erro no callback do Google OAuth:', error);
        res.redirect(`/login.html?error=${encodeURIComponent(error.message)}`);
    }
});

// Endpoint: Processar tokens OAuth (quando vêm no hash)
app.post('/api/auth/google/process-tokens', express.json(), async (req, res) => {
    try {
        const { access_token, refresh_token } = req.body;
        
        if (!access_token || !supabase) {
            return res.status(400).json({
                success: false,
                error: 'Token não fornecido'
            });
        }
        
        // Definir sessão manualmente com os tokens
        const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
        
        if (userError || !user) {
            console.error('❌ Erro ao obter utilizador:', userError);
            return res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
        }
        
        console.log(`✅ Google OAuth bem-sucedido (hash flow): ${user.email}`);
        
        // Continuar com a mesma lógica do callback
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Buscar perfil existente
        let profile = null;
        const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (existingProfile) {
            profile = existingProfile;
            console.log('📋 Perfil existente encontrado:', profile.email);
        } else {
            // Verificar se existe utilizador com mesmo email
            const { data: emailProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('email', user.email)
                .maybeSingle();
            
            if (emailProfile) {
                console.log('🔗 Vinculando Google OAuth a utilizador existente:', user.email);
                await supabaseAdmin
                    .from('user_profiles')
                    .update({ user_id: user.id })
                    .eq('id', emailProfile.id);
                profile = { ...emailProfile, user_id: user.id };
            } else {
                console.log('➕ Criando novo perfil para:', user.email);
                const { data: newProfile, error: createError } = await supabaseAdmin
                    .from('user_profiles')
                    .insert({
                        user_id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilizador',
                        phone: user.phone || null,
                        role: 'user',
                        status: 'pending_verification',
                        is_active: false
                    })
                    .select()
                    .single();
                
                if (createError) {
                    console.error('❌ Erro ao criar perfil:', createError);
                    return res.status(500).json({
                        success: false,
                        error: 'Erro ao criar perfil'
                    });
                }
                profile = newProfile;
            }
        }
        
        // Verificar status
        if (profile.status === 'inactive' || profile.status === 'suspended') {
            return res.json({
                success: false,
                error: 'Conta desativada. Contacte o administrador.',
                redirectUrl: '/login.html?error=account_disabled'
            });
        }
        
        // Criar sessão server-side
        const sessionManager = req.app.get('sessionManager');
        const sessionId = sessionManager.createSession(user.id, profile, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            loginAt: Date.now(),
            provider: 'google'
        });
        
        // Configurar cookie
        res.cookie('sid', sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: sessionManager.MAX_SESSION_LIFETIME,
            path: '/'
        });
        
        // Audit log
        const auditLogger = req.app.get('auditLogger');
        await auditLogger.log('LOGIN_SUCCESS', user.id, {
            email: user.email,
            provider: 'google',
            role: profile.role,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Atualizar último login
        await supabaseAdmin
            .from('user_profiles')
            .update({
                last_login: new Date().toISOString(),
                login_count: (profile.login_count || 0) + 1
            })
            .eq('user_id', user.id);
        
        // Retornar URL de redirecionamento
        const redirectUrl = profile.status === 'pending_verification' 
            ? '/verify-contact.html'
            : '/index-kromi.html';
        
        res.json({
            success: true,
            redirectUrl: redirectUrl
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar tokens OAuth:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Função helper para verificar duplicados
async function checkDuplicateContact(email = null, phone = null) {
    try {
        if (!supabaseAdmin) {
            return { exists: false, type: null };
        }
        
        const checks = [];
        
        // Verificar email no auth.users e user_profiles
        if (email) {
            // Verificar em auth.users
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const emailExistsAuth = authUsers.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
            
            // Verificar em user_profiles
            const { data: emailProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('id, email')
                .eq('email', email)
                .maybeSingle();
            
            if (emailExistsAuth || emailProfile) {
                return { exists: true, type: 'email', value: email };
            }
        }
        
        // Verificar telefone no auth.users e user_profiles
        if (phone) {
            // Normalizar telefone (remover espaços, hífens, parênteses, pontos)
            // Também remover + no início para comparação (guardamos original)
            const normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
            
            // Verificar em auth.users
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const phoneExistsAuth = authUsers.users.some(u => {
                if (!u.phone) return false;
                const userPhone = u.phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
                return userPhone === normalizedPhone || userPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(userPhone);
            });
            
            // Verificar em user_profiles (mais eficiente - buscar apenas telefones não nulos)
            const { data: phoneProfiles } = await supabaseAdmin
                .from('user_profiles')
                .select('id, phone')
                .not('phone', 'is', null);
            
            const phoneExistsProfile = phoneProfiles?.some(p => {
                if (!p.phone) return false;
                const profilePhone = p.phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
                return profilePhone === normalizedPhone || profilePhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(profilePhone);
            });
            
            if (phoneExistsAuth || phoneExistsProfile) {
                return { exists: true, type: 'phone', value: phone };
            }
        }
        
        return { exists: false, type: null };
    } catch (error) {
        console.error('❌ Erro ao verificar duplicados:', error);
        // Em caso de erro, permitir o registo (melhor evitar bloqueios por erro técnico)
        return { exists: false, type: null };
    }
}

// Endpoint: Registro apenas com telefone (sem email)
app.post('/api/auth/signup-phone', express.json(), async (req, res) => {
    try {
        const { phone, password, full_name } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                error: 'Telefone e palavra-passe são obrigatórios'
            });
        }
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Verificar se telefone já existe
        const duplicateCheck = await checkDuplicateContact(null, phone);
        if (duplicateCheck.exists) {
            return res.status(400).json({
                success: false,
                error: 'Este telefone já está registado. Por favor, faça login.',
                code: 'PHONE_EXISTS',
                suggestion: 'login'
            });
        }
        
        console.log('📱 Criando conta apenas com telefone:', phone);
        
        // Para telefone apenas, Supabase requer um email temporário ou usar Admin API
        // Estratégia: criar email temporário baseado no telefone ou usar Admin API diretamente
        // Vamos usar Admin API para criar o utilizador
        
        // Criar utilizador via Admin API com telefone
        // Nota: Supabase pode não aceitar phone sem email, então criamos com email temporário
        const tempEmail = `phone_${phone.replace(/[^0-9]/g, '')}@kromi.online`;
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            phone: phone,
            email: tempEmail, // Email temporário necessário para Supabase
            password: password,
            email_confirm: false,
            phone_confirm: false,
            user_metadata: {
                full_name: full_name || 'Utilizador',
                registration_method: 'phone_only',
                temp_email: true
            }
        });
        
        if (authError) {
            console.error('❌ Erro ao criar utilizador:', authError);
            
            // Se o telefone já existe, tentar fazer login em vez de criar
            if (authError.message.includes('already exists') || authError.message.includes('already registered') || authError.message.includes('User already registered')) {
                return res.status(400).json({
                    success: false,
                    error: 'Este telefone já está registado. Por favor, faça login.',
                    code: 'PHONE_EXISTS',
                    suggestion: 'login'
                });
            }
            
            return res.status(400).json({
                success: false,
                error: authError.message
            });
        }
        
        const userId = authData.user.id;
        console.log('✅ Utilizador criado no auth:', userId);
        
        // Criar perfil
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: userId,
                email: null, // Sem email, apenas telefone
                phone: phone,
                name: full_name || 'Utilizador',
                full_name: full_name || 'Utilizador',
                profile_type: 'participant',
                role: 'user',
                status: 'pending_verification',
                is_active: false
            })
            .select()
            .single();
        
        if (profileError) {
            console.warn('⚠️ Erro ao criar perfil:', profileError);
            // Não falhar o registro
        }
        
        // Enviar SMS de verificação via Twilio direto
        try {
            // Gerar código OTP
            const otpCode = generateOTPCode();
            
            // Armazenar código OTP
            await storeOTPCode(userId, phone, otpCode, 10);
            
            // Renderizar template
            const templateVars = {
                code: otpCode,
                user_name: full_name || 'Utilizador',
                expires_minutes: '10'
            };
            
            const renderedMessage = await renderSMSTemplate('phone_verification', templateVars);
            
            // Enviar via Twilio
            const smsResult = await sendSMSViaTwilioDirect(phone, renderedMessage);
            
            if (smsResult.success) {
                console.log('📱 SMS de verificação enviado via Twilio direto');
                
                // Log
                await logSMS('phone_verification', phone, renderedMessage, 'sent', {
                    provider: 'twilio_direct',
                    user_id: userId,
                    message_sid: smsResult.sid
                });
            }
        } catch (smsError) {
            console.warn('⚠️ Erro ao enviar SMS:', smsError);
        }
        
        // Audit log
        await auditLogger.log('USER_REGISTERED_PHONE', userId, {
            phone: phone,
            method: 'phone_only',
            registration_method: 'phone_only'
        });
        
        res.json({
            success: true,
            message: 'Conta criada com sucesso! Verifique o seu telefone para receber o código de confirmação.',
            user: {
                id: userId,
                phone: phone,
                name: full_name || 'Utilizador'
            },
            requires_verification: true
        });
        
    } catch (error) {
        console.error('❌ Erro no registo com telefone:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para verificar duplicados antes do registo
app.post('/api/auth/check-duplicate', express.json(), async (req, res) => {
    try {
        const { email, phone } = req.body;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        const duplicateCheck = await checkDuplicateContact(email, phone);
        
        res.json({
            success: true,
            exists: duplicateCheck.exists,
            type: duplicateCheck.type,
            value: duplicateCheck.value,
            message: duplicateCheck.exists 
                ? (duplicateCheck.type === 'email' 
                    ? 'Este email já está registado. Por favor, faça login.'
                    : 'Este telefone já está registado. Por favor, faça login.')
                : 'Email/telefone disponível'
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar duplicados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint: Login apenas com telefone (via Supabase Auth OTP)
app.post('/api/auth/login-with-phone', express.json(), async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Telefone é obrigatório'
            });
        }
        
        // Verificar se telefone existe antes de enviar SMS
        const duplicateCheck = await checkDuplicateContact(null, phone);
        if (!duplicateCheck.exists) {
            console.log(`ℹ️ Telefone não encontrado para login: ${phone} - Sugerindo registo`);
            
            return res.status(404).json({
                success: false,
                error: 'Este telefone não está registado. Por favor, registe-se primeiro.',
                code: 'PHONE_NOT_FOUND',
                suggestion: 'register'
            });
        }
        
        // Buscar user_id do telefone
        let userId = null;
        try {
            // Buscar em user_profiles
            const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('phone', phone)
                .maybeSingle();
            
            if (profile) {
                userId = profile.user_id;
            } else {
                // Buscar em auth.users
                const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
                const authUser = authUsers.users.find(u => u.phone === phone);
                if (authUser) {
                    userId = authUser.id;
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao buscar user_id:', e);
        }
        
        // Gerar código OTP localmente
        const otpCode = generateOTPCode();
        console.log(`📱 Gerando código OTP para login: ${phone} (código: ${otpCode})`);
        
        // Armazenar código OTP
        await storeOTPCode(userId, phone, otpCode, 10);
        
        // Renderizar template SMS
        const templateVars = {
            code: otpCode,
            expires_minutes: '10'
        };
        
        const renderedMessage = await renderSMSTemplate('login_code', templateVars);
        
        // Enviar SMS via Twilio direto
        try {
            const smsResult = await sendSMSViaTwilioDirect(phone, renderedMessage);
            
            // Log
            await logSMS('login_code', phone, renderedMessage, 'sent', {
                provider: 'twilio_direct',
                user_id: userId,
                message_sid: smsResult.sid
            });
            
            console.log(`📱 SMS de login enviado para ${phone} via Twilio direto (template: login_code, SID: ${smsResult.sid})`);
        } catch (error) {
            console.error('❌ Erro ao enviar SMS:', error);
            
            // Log erro
            await logSMS('login_code', phone, renderedMessage, 'failed', {
                error: error.message,
                provider: 'twilio_direct',
                user_id: userId
            });
            
            return res.status(500).json({
                success: false,
                error: 'Erro ao enviar SMS: ' + error.message,
                code: 'SMS_SEND_ERROR'
            });
        }
        
        res.json({
            success: true,
            message: 'Código SMS enviado. Use /api/auth/verify-phone para confirmar.',
            expires_in: 600 // 10 minutos (padrão Supabase)
        });
        
    } catch (error) {
        console.error('❌ Erro no login com telefone:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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

// Rota para listar todos os utilizadores (usa Service Role Key para bypass RLS)
app.get('/api/users/list', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        if (!supabaseAdmin) {
            console.error('❌ Service Role Key não configurada');
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada no servidor'
            });
        }
        
        console.log('📋 Carregando todos os utilizadores (bypass RLS)...');
        
        // Buscar todos os utilizadores de auth.users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
            console.error('❌ Erro ao carregar utilizadores do auth:', authError);
            return res.status(500).json({
                success: false,
                error: authError.message
            });
        }
        
        // Buscar todos os perfis
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*');
        
        if (profileError) {
            console.warn('⚠️ Erro ao carregar perfis:', profileError);
        }
        
        // Criar mapa de perfis por user_id
        const profilesMap = new Map();
        if (profiles) {
            profiles.forEach(profile => {
                profilesMap.set(profile.user_id, profile);
            });
        }
        
        // Criar array de utilizadores combinando auth.users com user_profiles
        const normalizedUsers = (authUsers.users || []).map(authUser => {
            const profile = profilesMap.get(authUser.id);
            
            // Se não tem perfil, criar um básico
            if (!profile) {
                console.log(`⚠️ Utilizador ${authUser.email} sem perfil, criando perfil básico...`);
                
                // Criar perfil automaticamente (em background, não bloquear resposta)
                supabaseAdmin
                    .from('user_profiles')
                    .insert({
                        user_id: authUser.id,
                        email: authUser.email,
                        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Utilizador',
                        role: 'user',
                        status: 'active',
                        created_at: authUser.created_at,
                        updated_at: authUser.updated_at
                    })
                    .then(() => {
                        console.log(`✅ Perfil criado para ${authUser.email}`);
                    })
                    .catch(err => {
                        console.error(`❌ Erro ao criar perfil para ${authUser.email}:`, err);
                    });
            }
            
            // Normalizar dados do perfil se existir
            const name = profile?.name || profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'N/A';
            const role = profile?.role || profile?.profile_type || 'user';
            let status = profile?.status;
            if (!status) {
                if (profile?.is_active !== undefined) {
                    status = profile.is_active ? 'active' : 'inactive';
                } else {
                    status = 'active'; // Default
                }
            }
            
            return {
                id: profile?.id || null,
                user_id: authUser.id,
                name: name,
                email: authUser.email || 'N/A',
                phone: profile?.phone || authUser.phone || null,
                organization: profile?.organization || null,
                role: role,
                status: status,
                created_at: profile?.created_at || authUser.created_at,
                updated_at: profile?.updated_at || authUser.updated_at,
                last_login: profile?.last_login || authUser.last_sign_in_at || null,
                login_count: profile?.login_count || 0
            };
        });
        
        // Ordenar por data de criação (mais recente primeiro)
        normalizedUsers.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });
        
        console.log(`✅ ${normalizedUsers.length} utilizadores carregados`);
        
        res.json({
            success: true,
            users: normalizedUsers,
            count: normalizedUsers.length
        });
        
    } catch (error) {
        console.error('❌ Erro inesperado ao carregar utilizadores:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para obter dados de um utilizador específico (usa Service Role Key)
app.get('/api/users/get', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { user_id, id } = req.query;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        let authUser = null;
        let profile = null;
        
        // Estratégia: tentar ambos os métodos (id de perfil e user_id)
        // Se id é fornecido, tentar primeiro como id de perfil
        if (id && id !== 'null') {
            try {
                const { data: profileData, error: profileError } = await supabaseAdmin
                    .from('user_profiles')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (!profileError && profileData) {
                    profile = profileData;
                    
                    // Buscar dados do auth
                    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
                    if (!authError && authData) {
                        authUser = authData.user;
                    }
                }
            } catch (e) {
                console.log('⚠️ Erro ao buscar por id de perfil, tentando como user_id:', e.message);
            }
        }
        
        // Se ainda não temos authUser, tentar como user_id (pode ser que o id passado seja na verdade um user_id)
        if (!authUser) {
            // Se temos id mas não encontramos perfil, pode ser que id seja na verdade user_id
            const userIdToTry = user_id && user_id !== 'null' ? user_id : (id && id !== 'null' ? id : null);
            
            if (userIdToTry) {
                try {
                    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userIdToTry);
                    if (!authError && authData) {
                        authUser = authData.user;
                        
                        // Buscar perfil por user_id
                        const { data: profileData, error: profileError } = await supabaseAdmin
                            .from('user_profiles')
                            .select('*')
                            .eq('user_id', userIdToTry)
                            .maybeSingle(); // maybeSingle retorna null se não encontrar, em vez de erro
                        
                        if (!profileError && profileData) {
                            profile = profileData;
                        }
                    }
                } catch (e) {
                    console.error('❌ Erro ao buscar por user_id:', e);
                }
            }
        }
        
        if (!authUser) {
            return res.status(404).json({
                success: false,
                error: 'Utilizador não encontrado'
            });
        }
        
        // Normalizar dados
        const name = profile?.name || profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'N/A';
        const role = profile?.role || profile?.profile_type || 'user';
        let status = profile?.status;
        if (!status) {
            if (profile?.is_active !== undefined) {
                status = profile.is_active ? 'active' : 'inactive';
            } else {
                status = 'active';
            }
        }
        
        const normalizedUser = {
            id: profile?.id || null,
            user_id: authUser.id,
            name: name,
            email: authUser.email || 'N/A',
            phone: profile?.phone || authUser.phone || null,
            organization: profile?.organization || null,
            role: role,
            status: status,
            created_at: profile?.created_at || authUser.created_at,
            updated_at: profile?.updated_at || authUser.updated_at,
            last_login: profile?.last_login || authUser.last_sign_in_at || null,
            login_count: profile?.login_count || 0,
            // Incluir todos os campos adicionais do perfil
            ...profile
        };
        
        res.json({
            success: true,
            user: normalizedUser
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar utilizador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para atualizar utilizador (apenas admin pode alterar role/status)
app.put('/api/users/update', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { id, user_id, ...userData } = req.body;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        // Determinar qual ID usar (perfil ou user_id)
        let targetUserId = user_id;
        let profileId = id;
        
        if (!targetUserId && profileId && profileId !== 'null') {
            const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('id', profileId)
                .single();
            
            if (profile) {
                targetUserId = profile.user_id;
            }
        }
        
        if (!targetUserId && targetUserId !== 'null') {
            return res.status(400).json({
                success: false,
                error: 'ID de utilizador não fornecido'
            });
        }
        
        // Verificar se quem está editando é admin (já verificado pelo middleware)
        // E garantir que apenas admins podem alterar role/status
        const isAdmin = req.session.role === 'admin';
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Apenas administradores podem editar utilizadores'
            });
        }
        
        // Buscar perfil atual
        const { data: currentProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', targetUserId)
            .single();
        
        // Preparar dados de atualização
        const updateData = {
            name: userData.name,
            full_name: userData.name, // Compatibilidade
            phone: userData.phone,
            organization: userData.organization,
            updated_at: new Date().toISOString()
        };
        
        // Apenas admin pode alterar role e status
        if (userData.role !== undefined && isAdmin) {
            updateData.role = userData.role;
            updateData.profile_type = userData.role; // Compatibilidade
        }
        
        if (userData.status !== undefined && isAdmin) {
            updateData.status = userData.status;
            if (userData.status === 'active') {
                updateData.is_active = true;
            } else if (userData.status === 'inactive' || userData.status === 'suspended') {
                updateData.is_active = false;
            }
        }
        
        // Campos opcionais adicionais (sem restrições)
        if (userData.birth_date !== undefined) updateData.birth_date = userData.birth_date || null;
        if (userData.gender !== undefined) updateData.gender = userData.gender || null;
        if (userData.nationality !== undefined) updateData.nationality = userData.nationality || null;
        if (userData.tax_id !== undefined) updateData.tax_id = userData.tax_id || null;
        if (userData.biography !== undefined) updateData.biography = userData.biography || null;
        if (userData.phone_alt !== undefined) updateData.phone_alt = userData.phone_alt || null;
        if (userData.email_alt !== undefined) updateData.email_alt = userData.email_alt || null;
        if (userData.website !== undefined) updateData.website = userData.website || null;
        if (userData.social_media !== undefined) updateData.social_media = userData.social_media || null;
        if (userData.address_line1 !== undefined) updateData.address_line1 = userData.address_line1 || null;
        if (userData.address_line2 !== undefined) updateData.address_line2 = userData.address_line2 || null;
        if (userData.city !== undefined) updateData.city = userData.city || null;
        if (userData.state_province !== undefined) updateData.state_province = userData.state_province || null;
        if (userData.postal_code !== undefined) updateData.postal_code = userData.postal_code || null;
        if (userData.country !== undefined) updateData.country = userData.country || null;
        if (userData.job_title !== undefined) updateData.job_title = userData.job_title || null;
        if (userData.department !== undefined) updateData.department = userData.department || null;
        if (userData.hire_date !== undefined) updateData.hire_date = userData.hire_date || null;
        if (userData.emergency_contact_name !== undefined) updateData.emergency_contact_name = userData.emergency_contact_name || null;
        if (userData.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = userData.emergency_contact_phone || null;
        if (userData.emergency_contact_relation !== undefined) updateData.emergency_contact_relation = userData.emergency_contact_relation || null;
        if (userData.timezone !== undefined) updateData.timezone = userData.timezone || null;
        if (userData.language !== undefined) updateData.language = userData.language || null;
        
        // Equipa/Clube
        if (userData.team_club_name !== undefined) updateData.team_club_name = userData.team_club_name || null;
        if (userData.team_club_category !== undefined) updateData.team_club_category = userData.team_club_category || null;
        if (userData.team_position !== undefined) updateData.team_position = userData.team_position || null;
        if (userData.team_athlete_number !== undefined) updateData.team_athlete_number = userData.team_athlete_number || null;
        if (userData.team_join_date !== undefined) updateData.team_join_date = userData.team_join_date || null;
        if (userData.team_notes !== undefined) updateData.team_notes = userData.team_notes || null;
        
        // Dimensões de Roupa (armazenar como JSONB)
        if (userData.clothing_tshirt !== undefined || userData.clothing_casaco !== undefined || 
            userData.clothing_calcoes !== undefined || userData.clothing_jersey !== undefined || 
            userData.clothing_calcas !== undefined || userData.clothing_sapatos !== undefined) {
            
            // Obter dimensões existentes ou criar novo objeto
            const currentSizes = currentProfile?.clothing_sizes || {};
            const newSizes = { ...currentSizes };
            
            if (userData.clothing_tshirt !== undefined) newSizes.tshirt = userData.clothing_tshirt || null;
            if (userData.clothing_casaco !== undefined) newSizes.casaco = userData.clothing_casaco || null;
            if (userData.clothing_calcoes !== undefined) newSizes.calcoes = userData.clothing_calcoes || null;
            if (userData.clothing_jersey !== undefined) newSizes.jersey = userData.clothing_jersey || null;
            if (userData.clothing_calcas !== undefined) newSizes.calcas = userData.clothing_calcas || null;
            if (userData.clothing_sapatos !== undefined) newSizes.sapatos = userData.clothing_sapatos || null;
            
            // Remover chaves com valores null/vazios
            Object.keys(newSizes).forEach(key => {
                if (!newSizes[key]) delete newSizes[key];
            });
            
            updateData.clothing_sizes = Object.keys(newSizes).length > 0 ? newSizes : null;
        }
        
        // Atualizar perfil
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', targetUserId)
            .select()
            .single();
        
        if (updateError) {
            console.error('❌ Erro ao atualizar perfil:', updateError);
            return res.status(500).json({
                success: false,
                error: updateError.message
            });
        }
        
        // Se password foi fornecida, atualizar no Supabase Auth (apenas admin)
        if (userData.password && isAdmin) {
            try {
                const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                    targetUserId,
                    { password: userData.password }
                );
                
                if (passwordError) {
                    console.warn('⚠️ Erro ao atualizar password:', passwordError);
                } else {
                    console.log('✅ Password atualizada');
                }
            } catch (passwordError) {
                console.warn('⚠️ Erro ao atualizar password:', passwordError);
            }
        }
        
        // Audit log
        await auditLogger.log('USER_UPDATED', req.session.userId, {
            target_user_id: targetUserId,
            changes: Object.keys(updateData),
            role_changed: userData.role !== undefined && currentProfile?.role !== userData.role,
            status_changed: userData.status !== undefined && currentProfile?.status !== userData.status
        });
        
        console.log(`✅ Utilizador atualizado: ${targetUserId}`);
        
        res.json({
            success: true,
            user: updatedProfile,
            message: 'Utilizador atualizado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar utilizador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para eliminar utilizador (usa Service Role Key)
app.delete('/api/users/delete', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { id, user_id } = req.body;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        let targetUserId = null;
        
        // Se tiver id (perfil), buscar user_id
        if (id && id !== 'null') {
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('id', id)
                .single();
            
            if (!profileError && profile) {
                targetUserId = profile.user_id;
            }
        }
        
        // Se ainda não tem, usar user_id diretamente
        if (!targetUserId && user_id && user_id !== 'null') {
            targetUserId = user_id;
        }
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'ID de utilizador não fornecido'
            });
        }
        
        console.log(`🗑️ Eliminando utilizador completamente: ${targetUserId}`);
        
        // 1. Eliminar todos os registros relacionados primeiro (evita problemas de foreign key)
        // Audit logs (manter histórico, mas remover referência pessoal)
        await supabaseAdmin
            .from('audit_logs')
            .delete()
            .eq('user_id', targetUserId);
        
        // User sessions
        await supabaseAdmin
            .from('user_sessions')
            .delete()
            .eq('user_id', targetUserId);
        
        // Verification rate limits
        await supabaseAdmin
            .from('verification_rate_limits')
            .delete()
            .eq('user_id', targetUserId);
        
        // Event participants (se houver)
        await supabaseAdmin
            .from('event_participants')
            .delete()
            .eq('participant_id', targetUserId);
        
        // User permissions
        await supabaseAdmin
            .from('user_permissions')
            .delete()
            .eq('user_id', targetUserId);
        
        // 2. Eliminar perfil
        await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('user_id', targetUserId);
        
        // 3. Eliminar do Supabase Auth (último passo)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        
        if (authError) {
            console.error('❌ Erro ao eliminar do auth:', authError);
            return res.status(500).json({
                success: false,
                error: authError.message
            });
        }
        
        // Audit log (antes de eliminar)
        try {
            await auditLogger.log('USER_DELETED', req.session.userId, {
                deleted_user_id: targetUserId
            });
        } catch (auditError) {
            console.warn('⚠️ Erro ao criar audit log (pode ser que audit_logs já tenha sido eliminado):', auditError);
        }
        
        console.log(`✅ Utilizador eliminado completamente: ${targetUserId}`);
        
        res.json({
            success: true,
            message: 'Utilizador eliminado completamente'
        });
        
        return;
        
    } catch (error) {
        console.error('❌ Erro ao eliminar utilizador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para ativar utilizador (status = active, permite login)
app.post('/api/users/activate', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { id, user_id } = req.body;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        let targetUserId = null;
        
        // Determinar user_id
        if (id && id !== 'null') {
            const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('id', id)
                .single();
            
            if (profile) {
                targetUserId = profile.user_id;
            }
        }
        
        if (!targetUserId && user_id && user_id !== 'null') {
            targetUserId = user_id;
        }
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'ID de utilizador não fornecido'
            });
        }
        
        // Atualizar status para active
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                status: 'active',
                is_active: true,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', targetUserId)
            .select()
            .single();
        
        if (updateError) {
            // Se não existe perfil, criar um básico
            if (updateError.code === 'PGRST116') {
                const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
                if (authUser) {
                    await supabaseAdmin
                        .from('user_profiles')
                        .insert({
                            user_id: targetUserId,
                            email: authUser.user.email,
                            status: 'active',
                            is_active: true,
                            role: 'user'
                        });
                }
            } else {
                return res.status(500).json({
                    success: false,
                    error: updateError.message
                });
            }
        }
        
        // Audit log
        await auditLogger.log('USER_ACTIVATED', req.session.userId, {
            activated_user_id: targetUserId
        });
        
        console.log(`✅ Utilizador ativado: ${targetUserId}`);
        
        res.json({
            success: true,
            message: 'Utilizador ativado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao ativar utilizador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para desativar utilizador (status = inactive, bloqueia login)
app.post('/api/users/deactivate', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { id, user_id } = req.body;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        let targetUserId = null;
        
        // Determinar user_id
        if (id && id !== 'null') {
            const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('user_id')
                .eq('id', id)
                .single();
            
            if (profile) {
                targetUserId = profile.user_id;
            }
        }
        
        if (!targetUserId && user_id && user_id !== 'null') {
            targetUserId = user_id;
        }
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'ID de utilizador não fornecido'
            });
        }
        
        // Não permitir desativar a si mesmo
        if (targetUserId === req.session.userId) {
            return res.status(400).json({
                success: false,
                error: 'Não pode desativar a si mesmo'
            });
        }
        
        // Atualizar status para inactive
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                status: 'inactive',
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', targetUserId)
            .select()
            .single();
        
        if (updateError) {
            return res.status(500).json({
                success: false,
                error: updateError.message
            });
        }
        
        // Invalidar todas as sessões do utilizador
        await supabaseAdmin
            .from('user_sessions')
            .update({ is_active: false })
            .eq('user_id', targetUserId);
        
        // Audit log
        await auditLogger.log('USER_DEACTIVATED', req.session.userId, {
            deactivated_user_id: targetUserId
        });
        
        console.log(`✅ Utilizador desativado: ${targetUserId}`);
        
        res.json({
            success: true,
            message: 'Utilizador desativado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao desativar utilizador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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
        // Admin pode especificar role ao criar, mas por padrão é 'user'
        const defaultRole = role || 'user';
        
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: authData.user.id,
                name: name,
                email: email,
                phone: phone || null,
                organization: organization || null,
                role: defaultRole, // Apenas admin pode criar com outro role
                profile_type: defaultRole === 'admin' ? 'admin' : (defaultRole === 'moderator' ? 'event_manager' : 'participant'),
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
// ROTAS DE PERFIL DO PRÓPRIO UTILIZADOR
// ==========================================

// Atualizar perfil do próprio utilizador (qualquer utilizador autenticado)
app.put('/api/profile/update', requireAuth, express.json(), async (req, res) => {
    try {
        const sessionId = req.cookies?.sid;
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado'
            });
        }

        const session = sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Sessão inválida'
            });
        }

        const userId = session.userId;
        const { name, phone, organization } = req.body;

        // Preparar dados para atualizar
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone || null;
        if (organization !== undefined) updateData.organization = organization || null;
        
        updateData.updated_at = new Date().toISOString();

        // Atualizar perfil usando Service Role Key para bypass RLS
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Erro ao atualizar perfil:', updateError);
            return res.status(500).json({
                success: false,
                error: updateError.message
            });
        }

        // Atualizar sessão com novos dados
        if (updatedProfile) {
            session.userProfile = {
                ...session.userProfile,
                name: updatedProfile.name,
                phone: updatedProfile.phone,
                organization: updatedProfile.organization
            };
        }

        // Audit log
        await auditLogger.log('PROFILE_UPDATED', userId, {
            changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
            ip: req.ip
        });

        console.log(`✅ Perfil atualizado para utilizador: ${userId}`);

        res.json({
            success: true,
            user: updatedProfile,
            message: 'Perfil atualizado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Alterar password do próprio utilizador
app.post('/api/auth/password/change', requireAuth, express.json(), async (req, res) => {
    try {
        const sessionId = req.cookies?.sid;
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado'
            });
        }

        const session = sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Sessão inválida'
            });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validações
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'A nova palavra-passe deve ter pelo menos 8 caracteres'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'As palavras-passe não coincidem'
            });
        }

        // Verificar password atual usando Supabase Auth
        const { data: authData, error: verifyError } = await supabase.auth.signInWithPassword({
            email: session.userProfile.email,
            password: currentPassword
        });

        if (verifyError) {
            console.error('❌ Password atual incorreta:', verifyError);
            return res.status(401).json({
                success: false,
                error: 'Palavra-passe atual incorreta'
            });
        }

        // Atualizar password usando Service Role Key
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            session.userId,
            { password: newPassword }
        );

        if (updateError) {
            console.error('❌ Erro ao atualizar password:', updateError);
            return res.status(500).json({
                success: false,
                error: updateError.message || 'Erro ao atualizar palavra-passe'
            });
        }

        // Audit log
        await auditLogger.log('PASSWORD_CHANGED', session.userId, {
            email: session.userProfile.email,
            ip: req.ip
        });

        console.log(`✅ Password alterada para utilizador: ${session.userId}`);

        res.json({
            success: true,
            message: 'Palavra-passe alterada com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao alterar password:', error);
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

// ==========================================
// ENDPOINTS PARA TEMPLATES SMS
// ==========================================

// Rota para testar envio de SMS de template
app.post('/api/sms/test-template', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { template_key, phone, variables } = req.body;
        
        if (!template_key || !phone) {
            return res.status(400).json({
                success: false,
                error: 'template_key e phone são obrigatórios'
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
            .from('sms_templates')
            .select('*')
            .eq('template_key', template_key)
            .single();
        
        if (templateError || !template) {
            return res.status(404).json({
                success: false,
                error: 'Template SMS não encontrado'
            });
        }
        
        // Renderizar template com variáveis
        const { data: renderedTemplate, error: renderError } = await supabaseAdmin
            .rpc('render_sms_template', {
                template_key_param: template_key,
                variables_param: variables || {}
            });
        
        if (renderError || !renderedTemplate || renderedTemplate.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao renderizar template: ' + (renderError?.message || 'Template vazio')
            });
        }
        
        const { message } = renderedTemplate[0];
        
        // Enviar SMS de teste via Supabase Auth (usando signInWithOtp para gerar código)
        // Nota: Para teste real, você precisaria de um provider SMS customizado
        // Por agora, apenas registramos no log que seria enviado
        try {
            const { data: smsData, error: smsError } = await supabase.auth.signInWithOtp({
                phone: phone,
                options: {
                    channel: 'sms'
                }
            });
            
            if (smsError) {
                console.warn('⚠️ Erro ao enviar SMS de teste:', smsError);
                // Ainda assim, registrar no log que o teste foi solicitado
            }
            
            // Registrar no log de SMS
            await logSMS(template_key, phone, message, 'sent', {
                is_test: true,
                provider: 'supabase_auth'
            });
            
            console.log(`📱 SMS de teste solicitado para ${phone} (template: ${template_key})`);
            
            res.json({
                success: true,
                message: `SMS de teste solicitado para ${phone}. Nota: O Supabase Auth gerencia a mensagem automaticamente, mas o template foi registado nos logs.`,
                rendered_message: message
            });
            
        } catch (smsError) {
            console.error('❌ Erro ao enviar SMS de teste:', smsError);
            
            // Registrar falha no log
            await logSMS(template_key, phone, message, 'failed', {
                is_test: true,
                error: smsError.message,
                provider: 'supabase_auth'
            });
            
            res.json({
                success: false,
                error: 'Erro ao enviar SMS: ' + smsError.message,
                rendered_message: message
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao testar template SMS:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para obter logs de SMS
app.get('/api/sms/logs', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const template_key = req.query.template_key;
        
        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                error: 'Service Role Key não configurada'
            });
        }
        
        let query = supabaseAdmin
            .from('sms_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (template_key) {
            query = query.eq('template_key', template_key);
        }
        
        const { data: logs, error, count } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            logs: logs || [],
            total: count || 0,
            limit,
            offset
        });
        
    } catch (error) {
        console.error('❌ Erro ao obter logs SMS:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
// ROTA DE ENVIO DE EMAIL DE CONFIRMAÇÃO DE REGISTRO
// ==========================================
app.post('/api/auth/send-confirmation-email', express.json(), async (req, res) => {
    try {
        const { email, user_name, user_id, type = 'signup' } = req.body;
        
        if (!email || !user_id) {
            return res.status(400).json({
                success: false,
                error: 'Email e user_id são obrigatórios'
            });
        }
        
        // Gerar link de confirmação usando Supabase Admin API
        let confirmationUrl;
        try {
            // Gerar token de confirmação usando Admin API
            const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'signup',
                email: email,
                options: {
                    redirectTo: null // Será definido depois
                }
            });
            
            if (tokenError || !tokenData) {
                throw new Error('Erro ao gerar link de confirmação: ' + (tokenError?.message || 'Token não gerado'));
            }
            
            // Extrair token da URL gerada
            const urlObj = new URL(tokenData.properties.action_link);
            const token = urlObj.searchParams.get('token');
            
            if (!token) {
                throw new Error('Token não encontrado na URL gerada');
            }
            
            // Obter URL da aplicação
            // PRIORIDADE 1: Variável de ambiente (.env) - RECOMENDADO
            let appUrl = process.env.APP_URL;
            
            // PRIORIDADE 2: Base de dados (fallback)
            if (!appUrl) {
                try {
                    const { data: urlConfig } = await supabaseAdmin
                        .from('platform_configurations')
                        .select('config_value')
                        .eq('config_key', 'APP_URL')
                        .single();
                    
                    if (urlConfig && urlConfig.config_value) {
                        appUrl = urlConfig.config_value;
                    }
                } catch (e) {
                    // Ignorar erro e continuar
                }
            }
            
            // PRIORIDADE 3: Hostname da requisição (último recurso)
            if (!appUrl) {
                const host = req.get('host') || req.hostname;
                const protocol = req.protocol || (req.secure ? 'https' : 'http');
                appUrl = `${protocol}://${host}`;
            }
            
            // Construir URL de confirmação - usar callback do Supabase que redireciona para nossa API
            // O Supabase vai processar o token e redirecionar para /api/auth/verify-email-callback
            confirmationUrl = `${appUrl}/api/auth/verify-email-callback?token=${token}&type=${type}`;
            
        } catch (tokenGenError) {
            console.error('❌ Erro ao gerar token:', tokenGenError);
            return res.status(500).json({
                success: false,
                error: 'Erro ao gerar link de confirmação: ' + tokenGenError.message
            });
        }
        
        console.log(`📧 Enviando email de confirmação para: ${email}`);
        
        // Carregar template de confirmação
        const { data: template, error: templateError } = await supabaseAdmin
            .from('email_templates')
            .select('*')
            .eq('template_key', 'signup_confirmation')
            .eq('is_active', true)
            .eq('event_id', null)
            .single();
        
        if (templateError || !template) {
            console.warn('⚠️ Template de confirmação não encontrado, usando template padrão');
            // Usar template inline se não encontrar na BD
            const subject = '✅ Confirme o seu registo no VisionKrono';
            const html = createDefaultConfirmationEmail(user_name || email, confirmationUrl);
            await sendConfirmationEmailDirectly(email, subject, html);
            
            return res.json({
                success: true,
                message: 'Email de confirmação enviado (template padrão)'
            });
        }
        
        // Renderizar template com variáveis
        const variables = {
            user_name: user_name || email.split('@')[0],
            confirmation_url: confirmationUrl,
            expiry_time: '24'
        };
        
        const { data: rendered, error: renderError } = await supabaseAdmin
            .rpc('render_email_template', {
                template_key_param: 'signup_confirmation',
                variables_param: variables
            });
        
        if (renderError || !rendered || rendered.length === 0) {
            throw new Error('Erro ao renderizar template: ' + (renderError?.message || 'Template vazio'));
        }
        
        const { subject, body_html } = rendered[0];
        
        // Enviar email
        await sendConfirmationEmailDirectly(email, subject, body_html);
        
        console.log(`✅ Email de confirmação enviado para: ${email}`);
        
        res.json({
            success: true,
            message: 'Email de confirmação enviado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao enviar email de confirmação:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Função helper para enviar email de confirmação
async function sendConfirmationEmailDirectly(to, subject, html) {
    // Carregar configurações de email
    let emailUser, emailPassword;
    
    try {
        const { data: emailConfig } = await supabaseAdmin
            .from('platform_configurations')
            .select('*')
            .in('config_key', ['EMAIL_USER', 'EMAIL_PASSWORD']);
        
        if (emailConfig && emailConfig.length > 0) {
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
        throw new Error('EMAIL_PASSWORD não configurado');
    }
    
    // Configurar transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPassword
        }
    });
    
    // Enviar email
    await transporter.sendMail({
        from: `"Kromi.online System" <${emailUser}>`,
        to: to,
        subject: subject,
        html: html
    });
}

// Função para criar email padrão se template não existir
function createDefaultConfirmationEmail(userName, confirmationUrl) {
    return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Registro</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .btn { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #FC6B03 0%, #FF8800 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Confirme o seu Registo</h1>
        </div>
        <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Para ativar a tua conta, por favor confirma o teu endereço de email clicando no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" class="btn">✅ Confirmar Email</a>
            </div>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${confirmationUrl}</p>
        </div>
        <div class="footer">
            <p>© 2025 VisionKrono. Todos os direitos reservados.</p>
            <p>Enviado por: system@kromi.online</p>
        </div>
    </div>
</body>
</html>
    `;
}

// ==========================================
// ROTAS DE EVENTOS (REST API)
// ==========================================
const setupEventsRoutes = require('./src/events-routes');
setupEventsRoutes(app, sessionManager, supabaseAdmin, auditLogger);

// ==========================================
// ROTAS DE FORM BUILDER
// ==========================================
const setupFormBuilderRoutes = require('./src/form-builder-routes');
setupFormBuilderRoutes(app, sessionManager, supabaseAdmin, auditLogger);

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

app.get('/sms-templates-platform', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'sms-templates-platform.html'));
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

// ==========================================
// ENDPOINT PARA LISTAR NÚMEROS TWILIO DA CONTA
// ==========================================
app.get('/api/twilio/phone-numbers', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!twilioAuthToken) {
            return res.status(500).json({
                success: false,
                error: 'TWILIO_AUTH_TOKEN não configurado nas variáveis de ambiente'
            });
        }
        
        // Listar números via API Twilio
        const https = require('https');
        
        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            const phoneNumbers = (response.incoming_phone_numbers || []).map(p => ({
                                phone_number: p.phone_number,
                                friendly_name: p.friendly_name,
                                sid: p.sid,
                                capabilities: p.capabilities
                            }));
                            
                            res.json({
                                success: true,
                                phone_numbers: phoneNumbers,
                                account_sid: twilioAccountSid,
                                message: phoneNumbers.length > 0 
                                    ? `Encontrados ${phoneNumbers.length} número(s). Use um deles como TWILIO_FROM_NUMBER.`
                                    : 'Nenhum número encontrado nesta conta. Compre um número no Console Twilio.'
                            });
                            resolve();
                        } else {
                            reject(new Error(response.message || `Erro HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (parseError) {
                        reject(new Error('Erro ao processar resposta: ' + parseError.message));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.end();
        }).catch((error) => {
            console.error('❌ Erro ao listar números Twilio:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erro ao listar números Twilio',
                details: error.message
            });
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar números Twilio:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao listar números Twilio',
            details: error.message
        });
    }
});

// ==========================================
// ENDPOINT DE TESTE TWILIO (Apenas para desenvolvimento)
// ==========================================
app.post('/api/twilio/test-sms', requireAuth, requireRole('admin'), express.json(), async (req, res) => {
    try {
        const { to, from, message } = req.body;
        
        if (!to || !from || !message) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros obrigatórios: to, from, message'
            });
        }
        
        // Usar variáveis de ambiente ou configuração do Supabase
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!twilioAuthToken) {
            return res.status(500).json({
                success: false,
                error: 'TWILIO_AUTH_TOKEN não configurado nas variáveis de ambiente'
            });
        }
        
        // Usar biblioteca Twilio se disponível, senão usar fetch
        let twilio;
        try {
            twilio = require('twilio');
        } catch (e) {
            // Se não tiver a biblioteca, usar fetch
            const https = require('https');
            const querystring = require('querystring');
            
            const postData = querystring.stringify({
                To: to,
                From: from,
                Body: message
            });
            
            const options = {
                hostname: 'api.twilio.com',
                port: 443,
                path: `/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
                }
            };
            
            return new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                console.log(`✅ SMS enviado via Twilio: ${response.sid}`);
                                resolve(response);
                            } else {
                                console.error(`❌ Erro ao enviar SMS: ${response.message || data}`);
                                reject(new Error(response.message || 'Erro ao enviar SMS'));
                            }
                        } catch (parseError) {
                            reject(new Error('Erro ao processar resposta: ' + parseError.message));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.write(postData);
                req.end();
            }).then((result) => {
                res.json({
                    success: true,
                    message: 'SMS enviado com sucesso',
                    sid: result.sid,
                    status: result.status
                });
            }).catch((error) => {
                console.error('❌ Erro ao enviar SMS via Twilio:', error);
                res.status(400).json({
                    success: false,
                    error: error.message || 'Erro ao enviar SMS',
                    details: error.message
                });
            });
        }
        
        // Se tiver biblioteca Twilio instalada, usar ela
        const client = twilio(twilioAccountSid, twilioAuthToken);
        
        const result = await client.messages.create({
            to: to,
            from: from,
            body: message
        });
        
        console.log(`✅ SMS enviado via Twilio: ${result.sid}`);
        
        res.json({
            success: true,
            message: 'SMS enviado com sucesso',
            sid: result.sid,
            status: result.status
        });
        
    } catch (error) {
        console.error('❌ Erro ao testar SMS via Twilio:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar SMS',
            details: error.message
        });
    }
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
    
    // Iniciar processador de device detections (app nativa)
    console.log('📱 Iniciando processador de device detections (app nativa)...');
    deviceDetectionProcessor.init().then(success => {
        if (success) {
            console.log('✅ Processador de device detections ativo');
            deviceDetectionProcessor.startAutoProcessor();
        } else {
            console.log('⚠️ Falha ao iniciar processador de device detections (pode ser normal se SQL não foi executado)');
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
    
    console.log('🛑 Parando processador de device detections...');
    deviceDetectionProcessor.stop();
    
    if (global.emailAutomation) {
        console.log('🛑 Parando automação de emails...');
        await global.emailAutomation.stop();
    }
    
    server.close(() => {
        console.log('✅ Servidor parado com sucesso!');
        process.exit(0);
    });
});
