/**
 * ==========================================
 * AUTH ROUTES - Kromi.online
 * ==========================================
 * 
 * Rotas de autenticação server-side
 * Integra com Supabase Auth + SessionManager
 * 
 * Versão: 1.0
 * Data: 2025-10-26
 * ==========================================
 */

const express = require('express');
const router = express.Router();

/**
 * Configurar rotas de autenticação
 */
function setupAuthRoutes(app, sessionManager, supabase, auditLogger, supabaseAdmin) {
    
    // ==========================================
    // POST /api/auth/login
    // ==========================================
    app.post('/api/auth/login', express.json(), async (req, res) => {
        try {
            const { email, password } = req.body;
            
            console.log(`🔐 Tentativa de login: ${email}`);
            
            // Verificar se o email existe antes de tentar login
            if (!supabaseAdmin) {
                return res.status(500).json({
                    success: false,
                    error: 'Service Role Key não configurada',
                    message: 'Erro de configuração do servidor'
                });
            }
            
            // Buscar utilizador no auth.users
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const userExists = authUsers.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
            
            // Também verificar em user_profiles
            const { data: profileCheck } = await supabaseAdmin
                .from('user_profiles')
                .select('id, email')
                .eq('email', email)
                .maybeSingle();
            
            const emailExistsInProfile = !!profileCheck;
            
            // Se não existe em nenhum lugar, informar que precisa registar
            if (!userExists && !emailExistsInProfile) {
                console.log(`ℹ️ Email não encontrado: ${email} - Sugerindo registo`);
                
                // Auditar tentativa de login com email não existente
                auditLogger.log('LOGIN_USER_NOT_FOUND', null, {
                    email,
                    reason: 'Email não registado',
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                });
                
                return res.status(404).json({
                    success: false,
                    error: 'Utilizador não encontrado',
                    message: 'Este email não está registado. Por favor, registe-se primeiro.',
                    code: 'USER_NOT_FOUND',
                    suggestion: 'register'
                });
            }
            
            // Validar com Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                console.error(`❌ Login falhou: ${email} - ${error.message}`);
                
                // Melhorar mensagens de erro
                let errorMessage = error.message;
                let errorCode = 'INVALID_CREDENTIALS';
                
                // Se é erro de password, manter mensagem genérica por segurança
                if (error.message.includes('Invalid login credentials') || error.message.includes('Wrong password')) {
                    errorMessage = 'Email ou palavra-passe incorretos';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Email não confirmado. Verifique a sua caixa de correio.';
                    errorCode = 'EMAIL_NOT_CONFIRMED';
                }
                
                // Auditar falha
                auditLogger.log('LOGIN_FAILED', userExists ? authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id : null, {
                    email,
                    reason: error.message,
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                });
                
                return res.status(401).json({
                    success: false,
                    error: errorMessage,
                    message: errorMessage,
                    code: errorCode
                });
            }
            
            // Carregar perfil do utilizador (usar admin para bypass RLS)
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('user_id', data.user.id)
                .maybeSingle();
            
            // Verificar status do utilizador (bloquear se inactive ou suspended)
            if (profile) {
                if (profile.status === 'inactive' || profile.status === 'suspended') {
                    console.log(`🚫 Login bloqueado: ${email} - Status: ${profile.status}`);
                    
                    // Audit log
                    auditLogger.log('LOGIN_BLOCKED', data.user.id, {
                        email,
                        reason: `Status: ${profile.status}`,
                        ip: req.ip,
                        userAgent: req.get('user-agent')
                    });
                    
                    return res.status(403).json({
                        error: 'Conta desativada',
                        message: `Esta conta está ${profile.status === 'inactive' ? 'desativada' : 'suspensa'}. Contacte o administrador.`
                    });
                }
            }
            
            // Se não existe perfil, criar um básico
            if (!profile) {
                profile = {
                    user_id: data.user.id,
                    email: data.user.email,
                    name: data.user.email?.split('@')[0] || 'Utilizador',
                    role: 'user',
                    status: 'pending_verification'
                };
            }
            
            if (profileError && profileError.code !== 'PGRST116') {
                console.error(`❌ Erro ao carregar perfil: ${profileError.message}`);
            }
            
            // Atualizar último login e contador de logins
            try {
                // Usar supabaseAdmin (Service Role Key) para bypass RLS
                const clientToUse = supabaseAdmin || supabase;
                
                const { error: updateError } = await clientToUse
                    .from('user_profiles')
                    .update({
                        last_login: new Date().toISOString(),
                        login_count: (profile.login_count || 0) + 1
                    })
                    .eq('user_id', data.user.id);
                
                if (updateError) {
                    console.error(`⚠️ Erro ao atualizar último login: ${updateError.message}`);
                } else {
                    console.log(`📊 Último login atualizado para: ${email}`);
                }
            } catch (updateError) {
                console.error(`⚠️ Erro ao atualizar último login: ${updateError.message}`);
                // Não bloquear login - apenas logar o erro
            }
            
            // Criar sessão
            const sessionId = sessionManager.createSession(data.user.id, profile, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                loginAt: Date.now()
            });
            
            // Configurar cookie seguro
            res.cookie('sid', sessionId, {
                httpOnly: true,
                secure: true, // HTTPS only
                sameSite: 'lax',
                maxAge: sessionManager.MAX_SESSION_LIFETIME,
                path: '/'
            });
            
            // Auditar sucesso
            auditLogger.log('LOGIN_SUCCESS', data.user.id, {
                email,
                role: profile.role,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            
            console.log(`✅ Login bem-sucedido: ${email} (role: ${profile.role})`);
            
            // Retornar dados do utilizador (SEM tokens sensíveis)
            res.json({
                success: true,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: profile.name,
                    role: profile.role,
                    status: profile.status
                },
                session: {
                    expiresIn: sessionManager.INACTIVITY_TIMEOUT / 1000,
                    maxLifetime: sessionManager.MAX_SESSION_LIFETIME / 1000
                }
            });
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            res.status(500).json({
                error: 'Erro interno',
                message: 'Erro ao processar login'
            });
        }
    });

    // ==========================================
    // POST /api/auth/logout
    // ==========================================
    app.post('/api/auth/logout', (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (sessionId) {
            const session = sessionManager.getSession(sessionId);
            
            if (session) {
                // Auditar logout
                auditLogger.log('LOGOUT', session.userId, {
                    email: session.userProfile.email,
                    ip: req.ip
                });
            }
            
            // Revogar sessão
            sessionManager.revokeSession(sessionId);
            
            console.log(`👋 Logout: ${sessionId.substring(0, 8)}...`);
        }
        
        // Limpar cookie
        res.clearCookie('sid');
        
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    });

    // ==========================================
    // POST /api/auth/logout-all
    // ==========================================
    app.post('/api/auth/logout-all', (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Não autenticado'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                error: 'Sessão inválida'
            });
        }
        
        // Revogar TODAS as sessões do utilizador
        const count = sessionManager.revokeAllUserSessions(session.userId);
        
        // Auditar
        auditLogger.log('LOGOUT_ALL', session.userId, {
            email: session.userProfile.email,
            sessionsRevoked: count,
            ip: req.ip
        });
        
        // Limpar cookie
        res.clearCookie('sid');
        
        res.json({
            success: true,
            message: `${count} sessões terminadas com sucesso`
        });
    });

    // ==========================================
    // POST /api/auth/logout-others
    // ==========================================
    app.post('/api/auth/logout-others', (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Não autenticado'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                error: 'Sessão inválida'
            });
        }
        
        // Revogar outras sessões (manter apenas a atual)
        const count = sessionManager.revokeOtherSessions(session.userId, sessionId);
        
        // Auditar
        auditLogger.log('LOGOUT_OTHERS', session.userId, {
            email: session.userProfile.email,
            sessionsRevoked: count,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: `${count} outras sessões terminadas com sucesso`
        });
    });

    // ==========================================
    // GET /api/auth/session
    // ==========================================
    app.get('/api/auth/session', async (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                authenticated: false,
                message: 'Sem sessão'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            res.clearCookie('sid');
            return res.status(401).json({
                authenticated: false,
                message: 'Sessão inválida ou expirada'
            });
        }
        
        // Verificar status do utilizador (bloquear se inactive ou suspended)
        if (supabaseAdmin && session.userProfile) {
            try {
                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('status')
                    .eq('user_id', session.userId)
                    .maybeSingle();
                
                if (profile && (profile.status === 'inactive' || profile.status === 'suspended')) {
                    // Invalidar sessão
                    sessionManager.revokeSession(sessionId);
                    res.clearCookie('sid');
                    
                    // Audit log
                    auditLogger.log('SESSION_TERMINATED_STATUS', session.userId, {
                        reason: `Status: ${profile.status}`,
                        ip: req.ip
                    });
                    
                    return res.status(403).json({
                        authenticated: false,
                        message: `Conta ${profile.status === 'inactive' ? 'desativada' : 'suspensa'}. Contacte o administrador.`,
                        status: profile.status
                    });
                }
            } catch (statusError) {
                console.error('⚠️ Erro ao verificar status do utilizador:', statusError);
                // Continuar mesmo com erro na verificação de status
            }
        }
        
        // Obter tempo restante
        const timeRemaining = sessionManager.getSessionTimeRemaining(sessionId);
        
        res.json({
            authenticated: true,
            user: {
                id: session.userId,
                email: session.userProfile.email,
                name: session.userProfile.name,
                role: session.userProfile.role,
                status: session.userProfile.status
            },
            session: {
                id: sessionId.substring(0, 8) + '...',
                createdAt: new Date(session.createdAt).toISOString(),
                lastActivity: new Date(session.lastActivity).toISOString(),
                expiresAt: new Date(session.expiresAt).toISOString(),
                timeRemaining: timeRemaining
            }
        });
    });

    // ==========================================
    // POST /api/auth/refresh
    // ==========================================
    app.post('/api/auth/refresh', (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Sem sessão'
            });
        }
        
        const session = sessionManager.refreshSession(sessionId);
        
        if (!session) {
            res.clearCookie('sid');
            return res.status(401).json({
                error: 'Sessão expirada'
            });
        }
        
        res.json({
            success: true,
            message: 'Sessão renovada',
            expiresIn: sessionManager.INACTIVITY_TIMEOUT / 1000
        });
    });

    // ==========================================
    // POST /api/auth/rotate-session
    // ==========================================
    app.post('/api/auth/rotate-session', (req, res) => {
        const oldSessionId = req.cookies?.sid;
        
        if (!oldSessionId) {
            return res.status(401).json({
                error: 'Sem sessão'
            });
        }
        
        // Rotar ID de sessão
        const newSessionId = sessionManager.rotateSessionId(oldSessionId);
        
        if (!newSessionId) {
            res.clearCookie('sid');
            return res.status(401).json({
                error: 'Sessão inválida'
            });
        }
        
        // Configurar novo cookie
        res.cookie('sid', newSessionId, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: sessionManager.MAX_SESSION_LIFETIME,
            path: '/'
        });
        
        res.json({
            success: true,
            message: 'ID de sessão rotado com sucesso'
        });
    });

    // ==========================================
    // GET /api/auth/sessions
    // ==========================================
    app.get('/api/auth/sessions', (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Não autenticado'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            res.clearCookie('sid');
            return res.status(401).json({
                error: 'Sessão inválida'
            });
        }
        
        // Listar todas as sessões do utilizador
        const sessions = sessionManager.getUserSessions(session.userId);
        
        res.json({
            success: true,
            sessions: sessions,
            currentSession: sessionId.substring(0, 8) + '...'
        });
    });

    // ==========================================
    // GET /api/auth/stats (apenas admin)
    // ==========================================
    app.get('/api/auth/stats', (req, res) => {
        const sessionId = req.cookies?.sid;
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Não autenticado'
            });
        }
        
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
            return res.status(401).json({
                error: 'Sessão inválida'
            });
        }
        
        // Apenas admin pode ver estatísticas
        if (session.userProfile.role !== 'admin') {
            return res.status(403).json({
                error: 'Sem permissão'
            });
        }
        
        const stats = sessionManager.getStats();
        
        res.json({
            success: true,
            stats: stats
        });
    });
}

module.exports = setupAuthRoutes;

