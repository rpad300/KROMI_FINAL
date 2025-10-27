/**
 * ==========================================
 * SESSION MANAGER - VisionKrono
 * ==========================================
 * 
 * Sistema profissional de gestão de sessões server-side
 * Conforme best practices de segurança
 * 
 * Features:
 * - Sessões server-side com TTL
 * - Cookies HttpOnly, Secure, SameSite
 * - Inatividade: 45 minutos
 * - Vida máxima: 12 horas
 * - Rotação de ID em login
 * - Revogação centralizada
 * - Auditoria completa
 * 
 * Versão: 1.0
 * Data: 2025-10-26
 * ==========================================
 */

const crypto = require('crypto');

class SessionManager {
    constructor() {
        // Store de sessões em memória (usar Redis em produção)
        this.sessions = new Map();
        
        // Configurações de tempo
        this.INACTIVITY_TIMEOUT = 45 * 60 * 1000; // 45 minutos
        this.MAX_SESSION_LIFETIME = 12 * 60 * 60 * 1000; // 12 horas
        this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
        
        // Iniciar limpeza automática de sessões expiradas
        this.startCleanupTask();
        
        console.log('🔐 SessionManager inicializado');
        console.log(`⏱️  Timeout inatividade: ${this.INACTIVITY_TIMEOUT / 60000} minutos`);
        console.log(`⏱️  Vida máxima sessão: ${this.MAX_SESSION_LIFETIME / 3600000} horas`);
    }

    /**
     * Gerar ID de sessão seguro
     */
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Criar nova sessão
     */
    createSession(userId, userProfile, metadata = {}) {
        const sessionId = this.generateSessionId();
        const now = Date.now();
        
        const session = {
            id: sessionId,
            userId: userId,
            userProfile: userProfile,
            createdAt: now,
            lastActivity: now,
            expiresAt: now + this.MAX_SESSION_LIFETIME,
            metadata: {
                ...metadata,
                rotationCount: 0
            }
        };
        
        this.sessions.set(sessionId, session);
        
        console.log(`✅ Sessão criada: ${sessionId.substring(0, 8)}... para ${userProfile.email}`);
        console.log(`📊 Sessões ativas: ${this.sessions.size}`);
        
        return sessionId;
    }

    /**
     * Validar e obter sessão
     */
    getSession(sessionId) {
        if (!sessionId) {
            return null;
        }

        const session = this.sessions.get(sessionId);
        
        if (!session) {
            console.warn(`⚠️  Sessão não encontrada: ${sessionId.substring(0, 8)}...`);
            return null;
        }

        const now = Date.now();
        
        // Verificar se expirou por inatividade
        if (now - session.lastActivity > this.INACTIVITY_TIMEOUT) {
            console.warn(`⏱️  Sessão expirada por inatividade: ${sessionId.substring(0, 8)}...`);
            this.revokeSession(sessionId);
            return null;
        }
        
        // Verificar se expirou por tempo máximo
        if (now > session.expiresAt) {
            console.warn(`⏱️  Sessão expirada por tempo máximo: ${sessionId.substring(0, 8)}...`);
            this.revokeSession(sessionId);
            return null;
        }
        
        // Atualizar última atividade
        session.lastActivity = now;
        this.sessions.set(sessionId, session);
        
        return session;
    }

    /**
     * Renovar sessão (deslizante dentro do limite máximo)
     */
    refreshSession(sessionId) {
        const session = this.getSession(sessionId);
        
        if (!session) {
            return null;
        }
        
        const now = Date.now();
        
        // Verificar se ainda não atingiu vida máxima
        if (now < session.expiresAt) {
            session.lastActivity = now;
            this.sessions.set(sessionId, session);
            
            console.log(`🔄 Sessão renovada: ${sessionId.substring(0, 8)}...`);
            return session;
        } else {
            console.warn(`⏱️  Sessão atingiu vida máxima, não pode ser renovada: ${sessionId.substring(0, 8)}...`);
            this.revokeSession(sessionId);
            return null;
        }
    }

    /**
     * Rotar ID de sessão (mitiga session fixation)
     */
    rotateSessionId(oldSessionId) {
        const session = this.getSession(oldSessionId);
        
        if (!session) {
            return null;
        }
        
        // Criar novo ID
        const newSessionId = this.generateSessionId();
        
        // Copiar dados para novo ID
        const newSession = {
            ...session,
            id: newSessionId,
            lastActivity: Date.now(),
            metadata: {
                ...session.metadata,
                rotationCount: (session.metadata.rotationCount || 0) + 1,
                previousId: oldSessionId
            }
        };
        
        // Remover sessão antiga
        this.sessions.delete(oldSessionId);
        
        // Adicionar nova sessão
        this.sessions.set(newSessionId, newSession);
        
        console.log(`🔄 ID de sessão rotado: ${oldSessionId.substring(0, 8)}... → ${newSessionId.substring(0, 8)}...`);
        
        return newSessionId;
    }

    /**
     * Revogar sessão específica
     */
    revokeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (session) {
            this.sessions.delete(sessionId);
            console.log(`🗑️  Sessão revogada: ${sessionId.substring(0, 8)}... (${session.userProfile.email})`);
            console.log(`📊 Sessões ativas: ${this.sessions.size}`);
            return true;
        }
        
        return false;
    }

    /**
     * Revogar todas as sessões de um utilizador
     */
    revokeAllUserSessions(userId) {
        let revokedCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                this.sessions.delete(sessionId);
                revokedCount++;
            }
        }
        
        console.log(`🗑️  ${revokedCount} sessões revogadas para utilizador ${userId}`);
        console.log(`📊 Sessões ativas: ${this.sessions.size}`);
        
        return revokedCount;
    }

    /**
     * Revogar todas as sessões EXCETO a atual
     */
    revokeOtherSessions(userId, currentSessionId) {
        let revokedCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId && sessionId !== currentSessionId) {
                this.sessions.delete(sessionId);
                revokedCount++;
            }
        }
        
        console.log(`🗑️  ${revokedCount} outras sessões revogadas para utilizador ${userId}`);
        console.log(`📊 Sessões ativas: ${this.sessions.size}`);
        
        return revokedCount;
    }

    /**
     * Listar sessões de um utilizador
     */
    getUserSessions(userId) {
        const userSessions = [];
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                userSessions.push({
                    id: sessionId.substring(0, 8) + '...',
                    createdAt: new Date(session.createdAt).toISOString(),
                    lastActivity: new Date(session.lastActivity).toISOString(),
                    expiresAt: new Date(session.expiresAt).toISOString(),
                    metadata: session.metadata
                });
            }
        }
        
        return userSessions;
    }

    /**
     * Obter estatísticas de sessões
     */
    getStats() {
        const now = Date.now();
        let activeCount = 0;
        let expiredCount = 0;
        
        for (const session of this.sessions.values()) {
            if (now - session.lastActivity <= this.INACTIVITY_TIMEOUT && now <= session.expiresAt) {
                activeCount++;
            } else {
                expiredCount++;
            }
        }
        
        return {
            total: this.sessions.size,
            active: activeCount,
            expired: expiredCount,
            inactivityTimeout: this.INACTIVITY_TIMEOUT / 60000,
            maxLifetime: this.MAX_SESSION_LIFETIME / 3600000
        };
    }

    /**
     * Limpar sessões expiradas
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            // Expirou por inatividade OU tempo máximo
            if (now - session.lastActivity > this.INACTIVITY_TIMEOUT || now > session.expiresAt) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 ${cleanedCount} sessões expiradas removidas`);
            console.log(`📊 Sessões ativas: ${this.sessions.size}`);
        }
        
        return cleanedCount;
    }

    /**
     * Tarefa de limpeza automática
     */
    startCleanupTask() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.CLEANUP_INTERVAL);
        
        console.log(`🧹 Limpeza automática iniciada (a cada ${this.CLEANUP_INTERVAL / 60000} minutos)`);
    }

    /**
     * Obter tempo restante de sessão
     */
    getSessionTimeRemaining(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            return null;
        }
        
        const now = Date.now();
        const inactivityRemaining = this.INACTIVITY_TIMEOUT - (now - session.lastActivity);
        const lifetimeRemaining = session.expiresAt - now;
        
        return {
            inactivityRemaining: Math.max(0, Math.floor(inactivityRemaining / 1000)),
            lifetimeRemaining: Math.max(0, Math.floor(lifetimeRemaining / 1000)),
            willExpireBy: inactivityRemaining < lifetimeRemaining ? 'inactivity' : 'lifetime'
        };
    }
}

module.exports = SessionManager;

