/**
 * ==========================================
 * Sistema de Automação de Emails
 * ==========================================
 * Gerencia envio automático de emails baseado em:
 * - Triggers (quando enviar)
 * - Recipients (para quem enviar)
 * ==========================================
 */

const nodemailer = require('nodemailer');

class EmailAutomation {
    constructor(supabaseAdmin) {
        this.supabase = supabaseAdmin;
        this.isRunning = false;
        this.checkInterval = 60000; // Verificar a cada 1 minuto
        this.intervalId = null;
        this.realtimeChannel = null;
    }

    /**
     * Iniciar processamento automático
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️  [EMAIL-AUTO] Automação já está em execução');
            return;
        }

        console.log('🚀 [EMAIL-AUTO] Iniciando automação de emails...');
        this.isRunning = true;

        // Processar imediatamente
        this.processScheduledEmails();

        // Processar periodicamente
        this.intervalId = setInterval(() => {
            this.processScheduledEmails();
        }, this.checkInterval);

        // Subscrever a eventos em tempo real
        this.setupRealtimeListeners();

        console.log(`✅ [EMAIL-AUTO] Automação ativa (verificando a cada ${this.checkInterval / 1000}s)`);
    }
    
    /**
     * Configurar listeners para eventos em tempo real
     */
    setupRealtimeListeners() {
        try {
            // Listener para inserção de participantes (trigger: registration)
            this.supabase
                .channel('participant_registrations')
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'participants' },
                    async (payload) => {
                        console.log('📋 [EMAIL-AUTO] Novo participante registado:', payload.new);
                        const participant = payload.new;
                        await this.triggerRealtimeEmail('registration', participant.event_id, {
                            participant_name: participant.full_name,
                            participant_email: participant.email,
                            participant_bib: participant.bib_number,
                            participant_category: participant.category
                        });
                    }
                )
                .subscribe();

            // Listener para deteções (trigger: checkpoint, finish)
            this.supabase
                .channel('detections_realtime')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'detections' },
                    async (payload) => {
                        console.log('🏃 [EMAIL-AUTO] Nova deteção:', payload.new);
                        const detection = payload.new;
                        
                        // Buscar dados do participante
                        const { data: participant } = await this.supabase
                            .from('participants')
                            .select('*')
                            .eq('id', detection.participant_id)
                            .single();
                        
                        if (participant) {
                            const isFinish = detection.is_finish || 
                                           (detection.checkpoint && 
                                            (detection.checkpoint.toLowerCase().includes('meta') || 
                                             detection.checkpoint.toLowerCase().includes('finish')));
                            
                            const trigger = isFinish ? 'finish' : 'checkpoint';
                            
                            await this.triggerRealtimeEmail(trigger, detection.event_id, {
                                participant_name: participant.full_name,
                                participant_email: participant.email,
                                participant_bib: participant.bib_number,
                                participant_category: participant.category,
                                checkpoint_name: detection.checkpoint,
                                detection_time: detection.timestamp,
                                lap_number: detection.lap_count
                            });
                        }
                    }
                )
                .subscribe();

            // Listener para classificações (trigger: classification)
            this.supabase
                .channel('classifications_realtime')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'classifications' },
                    async (payload) => {
                        console.log('🏆 [EMAIL-AUTO] Classificação atualizada:', payload.new);
                        const classification = payload.new;
                        
                        // Buscar dados do participante
                        const { data: participant } = await this.supabase
                            .from('participants')
                            .select('*')
                            .eq('id', classification.participant_id)
                            .single();
                        
                        if (participant) {
                            await this.triggerRealtimeEmail('classification', classification.event_id, {
                                participant_name: participant.full_name,
                                participant_email: participant.email,
                                participant_bib: participant.bib_number,
                                participant_category: participant.category,
                                total_time: classification.final_time,
                                overall_position: classification.overall_position,
                                category_position: classification.category_position
                            });
                        }
                    }
                )
                .subscribe();

            console.log('✅ [EMAIL-AUTO] Listeners em tempo real configurados');
        } catch (error) {
            console.error('❌ [EMAIL-AUTO] Erro ao configurar listeners:', error);
        }
    }

    /**
     * Parar processamento automático
     */
    async stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Desinscrever de canais realtime
        if (this.supabase && this.supabase.removeAllChannels) {
            await this.supabase.removeAllChannels();
        }
        
        this.isRunning = false;
        console.log('🛑 [EMAIL-AUTO] Automação de emails parada');
    }

    /**
     * Processar emails agendados
     */
    async processScheduledEmails() {
        try {
            const now = new Date();
            
            // Buscar emails agendados pendentes
            const { data: scheduled, error } = await this.supabase
                .from('email_schedule')
                .select(`
                    *,
                    template:email_templates(*)
                `)
                .eq('status', 'pending')
                .lte('scheduled_for', now.toISOString());

            if (error) {
                console.error('❌ [EMAIL-AUTO] Erro ao buscar emails agendados:', error);
                return;
            }

            if (!scheduled || scheduled.length === 0) {
                return; // Nenhum email para processar
            }

            console.log(`📋 [EMAIL-AUTO] ${scheduled.length} email(s) agendado(s) para processar`);

            for (const item of scheduled) {
                await this.processScheduledEmail(item);
            }
        } catch (error) {
            console.error('❌ [EMAIL-AUTO] Erro ao processar emails agendados:', error);
        }
    }

    /**
     * Processar um email agendado individual
     */
    async processScheduledEmail(scheduleItem) {
        try {
            const template = scheduleItem.template;
            if (!template) {
                console.error('❌ [EMAIL-AUTO] Template não encontrado:', scheduleItem.template_id);
                await this.markAsFailed(scheduleItem.id, 'Template não encontrado');
                return;
            }

            // Obter destinatários
            const recipients = await this.getRecipients(
                scheduleItem.event_id,
                template.recipient_type,
                template.recipient_config,
                scheduleItem.recipient_filters
            );

            if (!recipients || recipients.length === 0) {
                console.warn('⚠️  [EMAIL-AUTO] Nenhum destinatário encontrado');
                await this.markAsFailed(scheduleItem.id, 'Nenhum destinatário encontrado');
                return;
            }

            console.log(`📧 [EMAIL-AUTO] Enviando para ${recipients.length} destinatário(s)...`);

            // Enviar para cada destinatário
            let successCount = 0;
            let failCount = 0;

            for (const recipient of recipients) {
                const result = await this.sendTemplateEmail(template, recipient, scheduleItem.event_id);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            // Marcar como enviado
            await this.markAsSent(scheduleItem.id, successCount, failCount);

            console.log(`✅ [EMAIL-AUTO] Processado: ${successCount} enviados, ${failCount} falhas`);
        } catch (error) {
            console.error('❌ [EMAIL-AUTO] Erro ao processar email agendado:', error);
            await this.markAsFailed(scheduleItem.id, error.message);
        }
    }

    /**
     * Obter destinatários baseado nas configurações
     */
    async getRecipients(eventId, recipientType, recipientConfig = {}, additionalFilters = {}) {
        try {
            let recipients = [];

            switch (recipientType) {
                case 'all_participants':
                    recipients = await this.getAllParticipants(eventId);
                    break;

                case 'specific_category':
                    recipients = await this.getParticipantsByCategory(eventId, recipientConfig.category);
                    break;

                case 'specific_participants':
                    recipients = await this.getParticipantsByBibs(eventId, recipientConfig.bibs);
                    break;

                case 'specific_emails':
                    recipients = recipientConfig.emails.map(email => ({ email, name: email }));
                    break;

                case 'checkpoint_participants':
                    recipients = await this.getCheckpointParticipants(eventId, recipientConfig.checkpoint);
                    break;

                case 'organizer':
                    recipients = await this.getOrganizer(eventId);
                    break;

                default:
                    console.warn('⚠️  [EMAIL-AUTO] Tipo de destinatário desconhecido:', recipientType);
            }

            return recipients;
        } catch (error) {
            console.error('❌ [EMAIL-AUTO] Erro ao obter destinatários:', error);
            return [];
        }
    }

    /**
     * Obter todos os participantes de um evento
     */
    async getAllParticipants(eventId) {
        const { data, error } = await this.supabase
            .from('participants')
            .select('name, email, bib_number, category')
            .eq('event_id', eventId)
            .not('email', 'is', null);

        if (error) {
            console.error('❌ Erro ao buscar participantes:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Obter participantes por categoria
     */
    async getParticipantsByCategory(eventId, category) {
        const { data, error } = await this.supabase
            .from('participants')
            .select('name, email, bib_number, category')
            .eq('event_id', eventId)
            .eq('category', category)
            .not('email', 'is', null);

        if (error) {
            console.error('❌ Erro ao buscar participantes por categoria:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Obter participantes por números de dorsal
     */
    async getParticipantsByBibs(eventId, bibs) {
        if (!bibs || bibs.length === 0) return [];

        const { data, error } = await this.supabase
            .from('participants')
            .select('name, email, bib_number, category')
            .eq('event_id', eventId)
            .in('bib_number', bibs)
            .not('email', 'is', null);

        if (error) {
            console.error('❌ Erro ao buscar participantes por dorsais:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Obter participantes que passaram por checkpoint
     */
    async getCheckpointParticipants(eventId, checkpointName) {
        const { data, error } = await this.supabase
            .from('detections')
            .select(`
                participant:participants(name, email, bib_number, category)
            `)
            .eq('event_id', eventId)
            .eq('checkpoint', checkpointName);

        if (error) {
            console.error('❌ Erro ao buscar participantes de checkpoint:', error);
            return [];
        }

        // Extrair participantes únicos
        const uniqueParticipants = [];
        const seen = new Set();

        data?.forEach(item => {
            if (item.participant && item.participant.email && !seen.has(item.participant.email)) {
                seen.add(item.participant.email);
                uniqueParticipants.push(item.participant);
            }
        });

        return uniqueParticipants;
    }

    /**
     * Obter organizador do evento
     */
    async getOrganizer(eventId) {
        const { data: event, error } = await this.supabase
            .from('events')
            .select(`
                organizer:user_profiles(name, email)
            `)
            .eq('id', eventId)
            .single();

        if (error || !event || !event.organizer) {
            console.error('❌ Erro ao buscar organizador:', error);
            return [];
        }

        return [event.organizer];
    }

    /**
     * Enviar email usando template
     */
    async sendTemplateEmail(template, recipient, eventId = null) {
        try {
            // Renderizar template com variáveis
            const variables = this.buildVariables(recipient, eventId);
            
            const { data: rendered, error: renderError } = await this.supabase
                .rpc('render_email_template', {
                    template_key_param: template.template_key,
                    variables_param: variables,
                    event_id_param: eventId
                });

            if (renderError) {
                console.error('❌ Erro ao renderizar template:', renderError);
                return { success: false, error: renderError.message };
            }

            if (!rendered || rendered.length === 0) {
                return { success: false, error: 'Template vazio após renderização' };
            }

            const { subject, body_html } = rendered[0];

            // Carregar configurações de email
            const emailConfig = await this.getEmailConfig();
            if (!emailConfig.password) {
                console.warn('⚠️  EMAIL_PASSWORD não configurado');
                return { success: false, error: 'EMAIL_PASSWORD não configurado' };
            }

            // Criar transporter
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailConfig.user,
                    pass: emailConfig.password
                }
            });

            // Enviar email
            const info = await transporter.sendMail({
                from: `"VisionKrono System" <${emailConfig.user}>`,
                to: recipient.email,
                subject: subject,
                html: body_html
            });

            // Registrar no log
            await this.logEmail({
                template_key: template.template_key,
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                subject: subject,
                status: 'sent',
                sent_at: new Date().toISOString()
            });

            console.log(`✅ [EMAIL-AUTO] Email enviado para ${recipient.email}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ [EMAIL-AUTO] Erro ao enviar email para ${recipient.email}:`, error);
            
            // Registrar erro no log
            await this.logEmail({
                template_key: template.template_key,
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                subject: template.subject,
                status: 'failed',
                error_message: error.message
            });

            return { success: false, error: error.message };
        }
    }

    /**
     * Construir objeto de variáveis para renderização
     */
    buildVariables(recipient, eventId = null) {
        const variables = {
            participant_name: recipient.name || 'Participante',
            participant_email: recipient.email || '',
            participant_bib: recipient.bib_number || '',
            participant_category: recipient.category || ''
        };

        // Adicionar outras variáveis se disponíveis
        if (recipient.detection_time) variables.detection_time = recipient.detection_time;
        if (recipient.checkpoint_name) variables.checkpoint_name = recipient.checkpoint_name;
        if (recipient.total_time) variables.total_time = recipient.total_time;
        if (recipient.overall_position) variables.overall_position = recipient.overall_position;

        return variables;
    }

    /**
     * Obter configurações de email
     */
    async getEmailConfig() {
        try {
            const { data: configs, error } = await this.supabase
                .from('platform_configurations')
                .select('*')
                .in('config_key', ['EMAIL_USER', 'EMAIL_PASSWORD', 'APP_URL']);

            let emailUser, emailPassword, appUrl;

            if (!error && configs) {
                configs.forEach(config => {
                    if (config.config_key === 'EMAIL_USER') emailUser = config.config_value;
                    if (config.config_key === 'EMAIL_PASSWORD') emailPassword = config.config_value;
                    if (config.config_key === 'APP_URL') appUrl = config.config_value;
                });
            }

            return {
                user: emailUser || process.env.EMAIL_USER || 'system@kromi.online',
                password: emailPassword || process.env.EMAIL_PASSWORD || '',
                appUrl: appUrl || process.env.APP_URL || 'https://kromi.online'
            };
        } catch (error) {
            console.error('❌ Erro ao carregar config de email:', error);
            return {
                user: process.env.EMAIL_USER || 'system@kromi.online',
                password: process.env.EMAIL_PASSWORD || '',
                appUrl: process.env.APP_URL || 'https://kromi.online'
            };
        }
    }

    /**
     * Registrar email enviado
     */
    async logEmail(logData) {
        try {
            await this.supabase
                .from('email_logs')
                .insert(logData);
        } catch (error) {
            console.error('❌ Erro ao registrar log de email:', error);
        }
    }

    /**
     * Marcar agendamento como enviado
     */
    async markAsSent(scheduleId, successCount, failCount) {
        try {
            await this.supabase
                .from('email_schedule')
                .update({
                    status: failCount > 0 ? 'partially_sent' : 'sent',
                    sent_at: new Date().toISOString(),
                    error_message: failCount > 0 ? `${failCount} falhas de ${successCount + failCount} envios` : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', scheduleId);
        } catch (error) {
            console.error('❌ Erro ao atualizar status de agendamento:', error);
        }
    }

    /**
     * Marcar agendamento como falho
     */
    async markAsFailed(scheduleId, errorMessage) {
        try {
            await this.supabase
                .from('email_schedule')
                .update({
                    status: 'failed',
                    error_message: errorMessage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', scheduleId);
        } catch (error) {
            console.error('❌ Erro ao atualizar status de agendamento:', error);
        }
    }

    /**
     * Criar agendamentos para triggers baseados em tempo
     */
    async scheduleTimeBasedEmails(eventId) {
        try {
            console.log(`📅 [EMAIL-AUTO] Criando agendamentos para evento ${eventId}...`);

            // Buscar evento
            const { data: event, error: eventError } = await this.supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (eventError || !event) {
                console.error('❌ Evento não encontrado');
                return;
            }

            // Buscar templates ativos do evento
            const { data: templates, error: templatesError } = await this.supabase
                .from('email_templates')
                .select('*')
                .eq('event_id', eventId)
                .eq('is_active', true)
                .in('send_trigger', ['day_before', 'days_before', 'day_after', 'days_after', 'event_start', 'event_end', 'scheduled']);

            if (templatesError || !templates) {
                console.warn('⚠️  Nenhum template com trigger temporal encontrado');
                return;
            }

            const eventDate = new Date(event.start_date || event.date);

            for (const template of templates) {
                let scheduledFor = null;
                const config = template.trigger_config || {};

                switch (template.send_trigger) {
                    case 'day_before':
                        scheduledFor = new Date(eventDate);
                        scheduledFor.setDate(scheduledFor.getDate() - 1);
                        scheduledFor.setHours(9, 0, 0, 0); // 09:00 padrão
                        if (config.time) {
                            const [h, m] = config.time.split(':');
                            scheduledFor.setHours(parseInt(h), parseInt(m), 0, 0);
                        }
                        break;

                    case 'days_before':
                        scheduledFor = new Date(eventDate);
                        scheduledFor.setDate(scheduledFor.getDate() - (config.days || 1));
                        const [hb, mb] = (config.time || '09:00').split(':');
                        scheduledFor.setHours(parseInt(hb), parseInt(mb), 0, 0);
                        break;

                    case 'day_after':
                        scheduledFor = new Date(eventDate);
                        scheduledFor.setDate(scheduledFor.getDate() + 1);
                        scheduledFor.setHours(9, 0, 0, 0);
                        if (config.time) {
                            const [h, m] = config.time.split(':');
                            scheduledFor.setHours(parseInt(h), parseInt(m), 0, 0);
                        }
                        break;

                    case 'days_after':
                        scheduledFor = new Date(eventDate);
                        scheduledFor.setDate(scheduledFor.getDate() + (config.days || 1));
                        const [ha, ma] = (config.time || '09:00').split(':');
                        scheduledFor.setHours(parseInt(ha), parseInt(ma), 0, 0);
                        break;

                    case 'event_start':
                        scheduledFor = new Date(eventDate);
                        if (config.time) {
                            const [h, m] = config.time.split(':');
                            scheduledFor.setHours(parseInt(h), parseInt(m), 0, 0);
                        }
                        break;

                    case 'event_end':
                        scheduledFor = new Date(event.end_date || eventDate);
                        if (config.time) {
                            const [h, m] = config.time.split(':');
                            scheduledFor.setHours(parseInt(h), parseInt(m), 0, 0);
                        }
                        break;

                    case 'scheduled':
                        if (config.datetime) {
                            scheduledFor = new Date(config.datetime);
                        }
                        break;
                }

                if (scheduledFor && scheduledFor > new Date()) {
                    // Criar agendamento
                    await this.supabase
                        .from('email_schedule')
                        .insert({
                            template_id: template.id,
                            event_id: eventId,
                            scheduled_for: scheduledFor.toISOString(),
                            status: 'pending',
                            recipient_filters: template.recipient_config || {}
                        });

                    console.log(`📅 Agendado: ${template.name} para ${scheduledFor.toLocaleString()}`);
                }
            }

            console.log('✅ [EMAIL-AUTO] Agendamentos criados com sucesso');
        } catch (error) {
            console.error('❌ [EMAIL-AUTO] Erro ao criar agendamentos:', error);
        }
    }

    /**
     * Disparar email baseado em trigger em tempo real
     */
    async triggerRealtimeEmail(trigger, eventId, participantData = {}) {
        try {
            console.log(`🔔 [EMAIL-AUTO] Trigger em tempo real: ${trigger} para evento ${eventId}`);

            // Buscar templates ativos com este trigger
            const { data: templates, error } = await this.supabase
                .from('email_templates')
                .select('*')
                .eq('event_id', eventId)
                .eq('send_trigger', trigger)
                .eq('is_active', true);

            if (error || !templates || templates.length === 0) {
                console.log(`ℹ️  Nenhum template ativo encontrado para trigger ${trigger}`);
                return;
            }

            for (const template of templates) {
                // Obter destinatários
                const recipients = await this.getRecipients(
                    eventId,
                    template.recipient_type,
                    template.recipient_config
                );

                // Enviar para cada destinatário
                for (const recipient of recipients) {
                    // Merge de dados do participante com dados do trigger
                    const mergedRecipient = { ...recipient, ...participantData };
                    await this.sendTemplateEmail(template, mergedRecipient, eventId);
                }
            }
        } catch (error) {
            console.error('❌ [EMAIL-AUTO] Erro ao disparar email em tempo real:', error);
        }
    }
}

module.exports = EmailAutomation;

