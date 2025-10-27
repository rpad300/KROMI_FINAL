// Sistema de Debug para Terminal
// Este script envia logs para o terminal através do servidor

class TerminalDebugger {
    constructor() {
        this.isEnabled = true;
        this.logCount = 0;
    }

    async log(level, message, data = null) {
        if (!this.isEnabled) return;
        
        this.logCount++;
        
        try {
            await fetch('/api/debug', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level: level,
                    message: `[${this.logCount}] ${message}`,
                    data: data
                })
            });
        } catch (error) {
            // Se não conseguir enviar para o servidor, usar console normal
            console.log(`[TERMINAL DEBUG] ${level.toUpperCase()}: ${message}`, data);
        }
    }

    async info(message, data = null) {
        await this.log('info', message, data);
    }

    async success(message, data = null) {
        await this.log('success', message, data);
    }

    async warn(message, data = null) {
        await this.log('warn', message, data);
    }

    async error(message, data = null) {
        await this.log('error', message, data);
    }
}

// Criar instância global
window.terminalDebug = new TerminalDebugger();

// Interceptar console.log e enviar para terminal
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    window.terminalDebug?.info(args.join(' '));
};

console.error = function(...args) {
    originalConsoleError.apply(console, args);
    window.terminalDebug?.error(args.join(' '));
};

console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    window.terminalDebug?.warn(args.join(' '));
};

// Debug específico para autenticação
window.debugAuth = {
    async logAuthEvent(event, data = null) {
        await window.terminalDebug?.info(`AUTH EVENT: ${event}`, data);
    },
    
    async logSessionEvent(event, data = null) {
        await window.terminalDebug?.warn(`SESSION EVENT: ${event}`, data);
    },
    
    async logRedirectEvent(event, data = null) {
        await window.terminalDebug?.success(`REDIRECT EVENT: ${event}`, data);
    },
    
    async logError(event, error = null) {
        await window.terminalDebug?.error(`ERROR: ${event}`, error);
    },
    
    async logWarn(event, data = null) {
        await window.terminalDebug?.warn(`WARN: ${event}`, data);
    },
    
    async logInfo(event, data = null) {
        await window.terminalDebug?.info(`INFO: ${event}`, data);
    },
    
    async logSuccess(event, data = null) {
        await window.terminalDebug?.success(`SUCCESS: ${event}`, data);
    }
};

console.log('=== TERMINAL DEBUG ATIVO ===');
console.log('Os logs serão enviados para o terminal do servidor');
console.log('Verifique o terminal onde o servidor está a correr');
