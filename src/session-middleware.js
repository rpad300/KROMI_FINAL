/**
 * ==========================================
 * SESSION MIDDLEWARE - VisionKrono
 * ==========================================
 * 
 * Middleware para validação de sessões em todas as rotas
 * Integra com SessionManager
 * 
 * Versão: 1.0
 * Data: 2025-10-26
 * ==========================================
 */

/**
 * Criar middleware de sessão
 */
function createSessionMiddleware(sessionManager) {
    return function sessionMiddleware(req, res, next) {
        // Extrair session ID do cookie
        const sessionId = req.cookies?.sid;
        
        // Adicionar helpers ao request
        req.session = null;
        req.user = null;
        req.isAuthenticated = false;
        
        if (sessionId) {
            // Validar sessão
            const session = sessionManager.getSession(sessionId);
            
            if (session) {
                req.session = session;
                req.user = session.userProfile;
                req.isAuthenticated = true;
                
                // Log de atividade
                console.log(`✅ Sessão válida: ${session.userProfile.email} (${sessionId.substring(0, 8)}...)`);
            } else {
                console.warn(`⚠️  Sessão inválida ou expirada: ${sessionId.substring(0, 8)}...`);
                // Limpar cookie inválido
                res.clearCookie('sid');
            }
        }
        
        next();
    };
}

/**
 * Middleware para rotas protegidas
 */
function requireAuth(req, res, next) {
    if (!req.isAuthenticated) {
        console.warn(`🚫 Acesso negado: ${req.path} - não autenticado`);
        return res.status(401).json({
            error: 'Não autenticado',
            message: 'Por favor faça login para aceder a este recurso'
        });
    }
    
    next();
}

/**
 * Middleware para verificar role/perfil específico
 */
function requireRole(...allowedRoles) {
    return function(req, res, next) {
        if (!req.isAuthenticated) {
            return res.status(401).json({
                error: 'Não autenticado',
                message: 'Por favor faça login'
            });
        }
        
        const userRole = req.user?.role || req.user?.profile_type;
        
        if (!allowedRoles.includes(userRole)) {
            console.warn(`🚫 Acesso negado: ${req.path} - role ${userRole} não autorizado (requer: ${allowedRoles.join(', ')})`);
            return res.status(403).json({
                error: 'Sem permissão',
                message: 'Não tem permissão para aceder a este recurso',
                required: allowedRoles,
                current: userRole
            });
        }
        
        next();
    };
}

/**
 * Middleware para verificar permissão específica
 */
function requirePermission(permission) {
    return function(req, res, next) {
        if (!req.isAuthenticated) {
            return res.status(401).json({
                error: 'Não autenticado'
            });
        }
        
        const userPermissions = req.session?.metadata?.permissions || [];
        
        if (!userPermissions.includes(permission)) {
            console.warn(`🚫 Acesso negado: ${req.path} - sem permissão ${permission}`);
            return res.status(403).json({
                error: 'Sem permissão',
                message: `Requer permissão: ${permission}`
            });
        }
        
        next();
    };
}

module.exports = {
    createSessionMiddleware,
    requireAuth,
    requireRole,
    requirePermission
};

