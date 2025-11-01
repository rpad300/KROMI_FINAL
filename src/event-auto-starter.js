/**
 * Sistema de Início Automático de Eventos
 * Verifica periodicamente eventos com auto_start_enabled e scheduled_start_time
 */

class EventAutoStarter {
    constructor(supabaseAdmin) {
        this.supabase = supabaseAdmin;
        this.checkInterval = null;
        this.checkIntervalMs = 10000; // Verificar a cada 10 segundos
        this.isRunning = false;
    }

    /**
     * Iniciar monitoramento de eventos para início automático
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [EVENT-AUTO-START] Monitoramento já está em execução');
            return;
        }

        if (!this.supabase) {
            console.warn('⚠️ [EVENT-AUTO-START] Supabase Admin não disponível - início automático desabilitado');
            return;
        }

        console.log('🚀 [EVENT-AUTO-START] Iniciando monitoramento de eventos...');
        this.isRunning = true;

        // Verificar imediatamente
        this.checkAndStartEvents();

        // Verificar periodicamente
        this.checkInterval = setInterval(() => {
            this.checkAndStartEvents();
        }, this.checkIntervalMs);

        console.log(`✅ [EVENT-AUTO-START] Monitoramento ativo (verificando a cada ${this.checkIntervalMs / 1000}s)`);
    }

    /**
     * Parar monitoramento
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('⏹️ [EVENT-AUTO-START] Monitoramento parado');
    }

    /**
     * Verificar e iniciar eventos que chegaram à hora programada
     */
    async checkAndStartEvents() {
        try {
            const now = new Date();
            
            // Buscar eventos que devem iniciar automaticamente:
            // - auto_start_enabled = true
            // - scheduled_start_time <= agora
            // - event_started_at IS NULL (ainda não iniciou)
            // - is_active = false (não está ativo)
            const { data: eventsToStart, error } = await this.supabase
                .from('events')
                .select('id, name, scheduled_start_time')
                .eq('auto_start_enabled', true)
                .is('event_started_at', null)
                .eq('is_active', false)
                .lte('scheduled_start_time', now.toISOString())
                .not('scheduled_start_time', 'is', null);

            if (error) {
                console.error('❌ [EVENT-AUTO-START] Erro ao buscar eventos:', error);
                return;
            }

            if (!eventsToStart || eventsToStart.length === 0) {
                // Nenhum evento para iniciar - não logar para não poluir
                return;
            }

            console.log(`🔍 [EVENT-AUTO-START] Encontrados ${eventsToStart.length} evento(s) para iniciar automaticamente`);

            // Iniciar cada evento
            for (const event of eventsToStart) {
                await this.startEvent(event);
            }

        } catch (error) {
            console.error('❌ [EVENT-AUTO-START] Erro ao verificar eventos:', error);
        }
    }

    /**
     * Iniciar um evento automaticamente
     */
    async startEvent(event) {
        try {
            const now = new Date().toISOString();
            const scheduledTime = new Date(event.scheduled_start_time);
            const timeDiff = Math.abs(new Date() - scheduledTime) / 1000; // diferença em segundos

            console.log(`🚀 [EVENT-AUTO-START] Iniciando evento automaticamente:`, {
                id: event.id,
                name: event.name,
                scheduled_start_time: event.scheduled_start_time,
                iniciando_agora: now,
                diferenca_segundos: Math.round(timeDiff)
            });

            // Atualizar evento: marcar como iniciado
            const { data, error } = await this.supabase
                .from('events')
                .update({
                    event_started_at: now,
                    is_active: true,
                    status: 'active',
                    updated_at: now
                })
                .eq('id', event.id)
                .select()
                .single();

            if (error) {
                console.error(`❌ [EVENT-AUTO-START] Erro ao iniciar evento ${event.id}:`, error);
                return;
            }

            console.log(`✅ [EVENT-AUTO-START] Evento "${event.name}" iniciado automaticamente às ${now}`);

        } catch (error) {
            console.error(`❌ [EVENT-AUTO-START] Erro ao iniciar evento ${event.id}:`, error);
        }
    }
}

module.exports = EventAutoStarter;

