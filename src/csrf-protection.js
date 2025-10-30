/**
 * ==========================================
 * CSRF PROTECTION - Kromi.online
 * ==========================================
 * 
 * Proteção contra Cross-Site Request Forgery
 * 
 * Versão: 1.0
 * Data: 2025-10-26
 * ==========================================
 */

const crypto = require('crypto');

class CSRFProtection {
    constructor() {
        this.tokens = new Map(); // Tokens CSRF ativos
        this.TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hora
        
        // Limpeza automática de tokens expirados
        setInterval(() => this.cleanupExpiredTokens(), 5 * 60 * 1000);
        
        console.log('🛡️  CSRF Protection inicializado');
    }

    /**
     * Gerar token CSRF
     */
    generateToken(sessionId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + this.TOKEN_LIFETIME;
        
        this.tokens.set(token, {
            sessionId,
            expiresAt
        });
        
        console.log(`🛡️  CSRF token gerado para sessão ${sessionId?.substring(0, 8)}...`);
        
        return token;
    }

    /**
     * Validar token CSRF
     */
    validateToken(token, sessionId) {
        if (!token) {
            console.warn('⚠️  CSRF token ausente');
            return false;
        }
        
        const tokenData = this.tokens.get(token);
        
        if (!tokenData) {
            console.warn(`⚠️  CSRF token inválido: ${token.substring(0, 8)}...`);
            return false;
        }
        
        // Verificar expiração
        if (Date.now() > tokenData.expiresAt) {
            console.warn(`⏱️  CSRF token expirado: ${token.substring(0, 8)}...`);
            this.tokens.delete(token);
            return false;
        }
        
        // Verificar se pertence à sessão
        if (tokenData.sessionId !== sessionId) {
            console.warn(`🚫 CSRF token não pertence à sessão: ${token.substring(0, 8)}...`);
            return false;
        }
        
        // Token válido - remover para uso único
        this.tokens.delete(token);
        
        console.log(`✅ CSRF token validado: ${token.substring(0, 8)}...`);
        
        return true;
    }

    /**
     * Middleware de CSRF
     */
    middleware() {
        return (req, res, next) => {
            // Apenas validar em métodos state-changing
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                const token = req.headers['x-csrf-token'] || req.body?._csrf;
                const sessionId = req.cookies?.sid;
                
                if (!this.validateToken(token, sessionId)) {
                    console.error(`🚫 CSRF validation failed: ${req.method} ${req.path}`);
                    return res.status(403).json({
                        error: 'CSRF validation failed',
                        message: 'Token CSRF inválido ou ausente'
                    });
                }
            }
            
            next();
        };
    }

    /**
     * Limpar tokens expirados
     */
    cleanupExpiredTokens() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [token, data] of this.tokens.entries()) {
            if (now > data.expiresAt) {
                this.tokens.delete(token);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 ${cleanedCount} CSRF tokens expirados removidos`);
        }
    }
}

module.exports = CSRFProtection;

