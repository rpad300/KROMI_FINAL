/**
 * ==========================================
 * AUDIT LOGGER - Kromi.online
 * ==========================================
 * 
 * Sistema de auditoria e logs de segurança
 * Regista todas as ações críticas
 * 
 * Versão: 1.0
 * Data: 2025-10-26
 * ==========================================
 */

class AuditLogger {
    constructor(supabase) {
        this.supabase = supabase;
        this.logs = []; // Buffer para logs antes de enviar para BD
        this.flushInterval = 30000; // 30 segundos
        
        // Iniciar flush automático
        this.startAutoFlush();
        
        console.log('📋 AuditLogger inicializado');
    }

    /**
     * Validar se é um IP válido
     */
    isValidIP(ip) {
        if (!ip || ip === 'unknown' || ip === 'undefined') {
            return false;
        }
        // Regex para IPv4 e IPv6 básico
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        const ipv6CompressedRegex = /^::1$|^::$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ipv6CompressedRegex.test(ip);
    }

    /**
     * Registar evento de auditoria
     */
    async log(action, userId, details = {}) {
        // Validar e normalizar IP
        let ipAddress = details.ip;
        if (!ipAddress || !this.isValidIP(ipAddress)) {
            ipAddress = null; // Usar null em vez de 'unknown' para tipos INET
        }
        
        const logEntry = {
            action,
            user_id: userId,
            details: JSON.stringify(details),
            ip_address: ipAddress,
            user_agent: details.userAgent || null,
            created_at: new Date().toISOString()
        };
        
        // Adicionar ao buffer
        this.logs.push(logEntry);
        
        // Log no console
        const emoji = this.getActionEmoji(action);
        console.log(`${emoji} [AUDIT] ${action} - User: ${userId || 'N/A'} - ${JSON.stringify(details)}`);
        
        // Flush se buffer grande
        if (this.logs.length >= 10) {
            await this.flush();
        }
    }

    /**
     * Enviar logs para base de dados
     */
    async flush() {
        if (this.logs.length === 0) {
            return;
        }
        
        const logsToSend = [...this.logs];
        this.logs = [];
        
        try {
            const { error } = await this.supabase
                .from('audit_logs')
                .insert(logsToSend);
            
            if (error) {
                console.error('❌ Erro ao salvar logs de auditoria:', error);
                // Devolver ao buffer se falhar
                this.logs.unshift(...logsToSend);
            } else {
                console.log(`✅ ${logsToSend.length} logs de auditoria salvos`);
            }
        } catch (error) {
            console.error('❌ Erro ao fazer flush de logs:', error);
            // Devolver ao buffer
            this.logs.unshift(...logsToSend);
        }
    }

    /**
     * Flush automático periódico
     */
    startAutoFlush() {
        setInterval(() => {
            if (this.logs.length > 0) {
                this.flush();
            }
        }, this.flushInterval);
    }

    /**
     * Emoji para cada tipo de ação
     */
    getActionEmoji(action) {
        const emojis = {
            'LOGIN_SUCCESS': '✅',
            'LOGIN_FAILED': '❌',
            'LOGOUT': '👋',
            'LOGOUT_ALL': '🗑️',
            'LOGOUT_OTHERS': '🔄',
            'SESSION_EXPIRED': '⏱️',
            'SESSION_ROTATED': '🔄',
            'PASSWORD_CHANGED': '🔑',
            'PROFILE_UPDATED': '📝',
            'USER_CREATED': '➕',
            'USER_DELETED': '🗑️',
            'PERMISSION_DENIED': '🚫',
            'SUSPICIOUS_ACTIVITY': '⚠️'
        };
        return emojis[action] || '📋';
    }

    /**
     * Obter logs de um utilizador
     */
    async getUserLogs(userId, limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('❌ Erro ao carregar logs:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao obter logs do utilizador:', error);
            return [];
        }
    }

    /**
     * Obter logs recentes
     */
    async getRecentLogs(limit = 100) {
        try {
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('❌ Erro ao carregar logs:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao obter logs recentes:', error);
            return [];
        }
    }

    /**
     * Detectar atividade suspeita
     */
    async checkSuspiciousActivity(userId) {
        try {
            const now = Date.now();
            const last5Minutes = new Date(now - 5 * 60 * 1000).toISOString();
            
            // Verificar múltiplos logins falhos
            const { data: failedLogins, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .eq('action', 'LOGIN_FAILED')
                .gte('created_at', last5Minutes)
                .eq('user_id', userId);
            
            if (!error && failedLogins && failedLogins.length >= 5) {
                console.warn(`⚠️  ATIVIDADE SUSPEITA: ${failedLogins.length} logins falhos em 5 minutos para ${userId}`);
                
                await this.log('SUSPICIOUS_ACTIVITY', userId, {
                    reason: 'Multiple failed logins',
                    count: failedLogins.length,
                    timeWindow: '5 minutes'
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erro ao verificar atividade suspeita:', error);
            return false;
        }
    }
}

module.exports = AuditLogger;

