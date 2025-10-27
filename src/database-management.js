class DatabaseManagement {
    constructor() {
        this.supabaseClient = new SupabaseClient();
        this.selectedEvent = null;
        this.pendingAction = null;
        
        this.setupElements();
        this.setupEventListeners();
        this.initSupabase();
    }
    
    setupElements() {
        // Seletor de evento
        this.eventSelector = document.getElementById('eventSelector');
        this.loadEventDataBtn = document.getElementById('loadEventDataBtn');
        this.loadAllDataBtn = document.getElementById('loadAllDataBtn');
        
        // Botões de gestão
        this.clearDetectionsBtn = document.getElementById('clearDetectionsBtn');
        this.clearBufferBtn = document.getElementById('clearBufferBtn');
        this.clearProcessedBtn = document.getElementById('clearProcessedBtn');
        this.clearEventsBtn = document.getElementById('clearEventsBtn');
        this.clearDevicesBtn = document.getElementById('clearDevicesBtn');
        this.clearImagesBtn = document.getElementById('clearImagesBtn');
        this.clearConfigsBtn = document.getElementById('clearConfigsBtn');
        
        // Botões de exportação
        this.exportDetectionsBtn = document.getElementById('exportDetectionsBtn');
        this.exportEventsBtn = document.getElementById('exportEventsBtn');
        this.exportDevicesBtn = document.getElementById('exportDevicesBtn');
        this.exportConfigsBtn = document.getElementById('exportConfigsBtn');
        
        // Botões de limpeza específica
        this.clearOldImagesBtn = document.getElementById('clearOldImagesBtn');
        
        // Ações globais
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.clearOldDataBtn = document.getElementById('clearOldDataBtn');
        this.exportAllBtn = document.getElementById('exportAllBtn');
        this.refreshStatsBtn = document.getElementById('refreshStatsBtn');
        
        // Log
        this.logArea = document.getElementById('logArea');
        this.clearLogBtn = document.getElementById('clearLogBtn');
        
        // Modal
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmationMessage = document.getElementById('confirmationMessage');
        this.confirmBtn = document.getElementById('confirmBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        
        // Elementos de estatísticas
        this.detectionsTotal = document.getElementById('detectionsTotal');
        this.detectionsToday = document.getElementById('detectionsToday');
        this.bufferTotal = document.getElementById('bufferTotal');
        this.bufferPending = document.getElementById('bufferPending');
        this.eventsTotal = document.getElementById('eventsTotal');
        this.eventsActive = document.getElementById('eventsActive');
        this.devicesTotal = document.getElementById('devicesTotal');
        this.devicesActive = document.getElementById('devicesActive');
        this.imagesTotal = document.getElementById('imagesTotal');
        this.imagesProof = document.getElementById('imagesProof');
        this.configsTotal = document.getElementById('configsTotal');
        this.configsEvent = document.getElementById('configsEvent');
    }
    
    setupEventListeners() {
        // Seletor de evento
        this.eventSelector.addEventListener('change', () => this.onEventSelect());
        this.loadEventDataBtn.addEventListener('click', () => this.loadEventData());
        this.loadAllDataBtn.addEventListener('click', () => this.loadAllData());
        
        // Botões de limpeza
        this.clearDetectionsBtn.addEventListener('click', () => this.confirmAction('clearDetections'));
        this.clearBufferBtn.addEventListener('click', () => this.confirmAction('clearBuffer'));
        this.clearProcessedBtn.addEventListener('click', () => this.confirmAction('clearProcessed'));
        this.clearEventsBtn.addEventListener('click', () => this.confirmAction('clearEvents'));
        this.clearDevicesBtn.addEventListener('click', () => this.confirmAction('clearDevices'));
        this.clearImagesBtn.addEventListener('click', () => this.confirmAction('clearImages'));
        this.clearConfigsBtn.addEventListener('click', () => this.confirmAction('clearConfigs'));
        
        // Botões de exportação
        this.exportDetectionsBtn.addEventListener('click', () => this.exportData('detections'));
        this.exportEventsBtn.addEventListener('click', () => this.exportData('events'));
        this.exportDevicesBtn.addEventListener('click', () => this.exportData('devices'));
        this.exportConfigsBtn.addEventListener('click', () => this.exportData('configurations'));
        
        // Botões específicos
        this.clearOldImagesBtn.addEventListener('click', () => this.confirmAction('clearOldImages'));
        
        // Ações globais
        this.clearAllBtn.addEventListener('click', () => this.confirmAction('clearAll'));
        this.clearOldDataBtn.addEventListener('click', () => this.confirmAction('clearOldData'));
        this.exportAllBtn.addEventListener('click', () => this.exportAllData());
        this.refreshStatsBtn.addEventListener('click', () => this.loadAllData());
        
        // Log
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Modal
        this.confirmBtn.addEventListener('click', () => this.executePendingAction());
        this.cancelBtn.addEventListener('click', () => this.cancelAction());
    }
    
    async initSupabase() {
        try {
            this.log('🔍 Inicializando Supabase...', 'info');
            
            // Verificar se o SupabaseClient existe
            if (!this.supabaseClient) {
                throw new Error('SupabaseClient não foi inicializado');
            }
            
            this.log('🔍 SupabaseClient encontrado, inicializando...', 'info');
            await this.supabaseClient.init();
            this.log('✅ Supabase conectado', 'success');
            
            // Verificar se a conexão está funcionando
            if (!this.supabaseClient.isConnected) {
                throw new Error('Supabase não está conectado após inicialização');
            }
            
            this.log('📅 Carregando eventos...', 'info');
            await this.loadEvents();
            
            this.log('📊 Carregando estatísticas...', 'info');
            await this.loadAllData();
            
            this.log('🎉 Sistema inicializado com sucesso', 'success');
        } catch (error) {
            this.log('❌ Erro ao conectar Supabase: ' + error.message, 'error');
            console.error('Erro detalhado:', error);
        }
    }
    
    async loadEvents() {
        try {
            this.log('🔍 Consultando tabela events...', 'info');
            
            // Primeiro, vamos tentar uma consulta simples
            const { data: events, error } = await this.supabaseClient.supabase
                .from('events')
                .select('*')
                .limit(10);
            
            if (error) {
                this.log('❌ Erro na consulta: ' + error.message, 'error');
                this.log('❌ Código do erro: ' + error.code, 'error');
                this.log('❌ Detalhes: ' + JSON.stringify(error), 'error');
                throw error;
            }
            
            this.log(`📊 Consulta executada. Resultado: ${events ? events.length : 'null'} eventos`, 'info');
            
            this.eventSelector.innerHTML = '<option value="">-- Selecionar Evento --</option>';
            
            if (events && events.length > 0) {
                events.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = `${event.name || 'Sem nome'} (${event.status || 'Sem status'})`;
                    this.eventSelector.appendChild(option);
                });
                this.log(`📅 ${events.length} eventos carregados no dropdown`, 'success');
            } else {
                this.log('⚠️ Nenhum evento encontrado na base de dados', 'info');
            }
            
        } catch (error) {
            this.log('❌ Erro ao carregar eventos: ' + error.message, 'error');
            console.error('Erro detalhado no loadEvents:', error);
        }
    }
    
    onEventSelect() {
        const eventId = this.eventSelector.value;
        this.selectedEvent = eventId ? { id: eventId } : null;
        this.log(`📅 Evento selecionado: ${eventId || 'Nenhum'}`, 'info');
    }
    
    async loadEventData() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        try {
            this.log(`📊 Carregando dados do evento ${this.selectedEvent.id}...`, 'info');
            await this.loadTableStats('event');
            this.log('✅ Dados do evento carregados', 'success');
        } catch (error) {
            this.log('❌ Erro ao carregar dados do evento: ' + error.message, 'error');
        }
    }
    
    async loadAllData() {
        try {
            this.log('📊 Carregando todas as estatísticas...', 'info');
            await this.loadTableStats('all');
            this.log('✅ Todas as estatísticas carregadas', 'success');
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas: ' + error.message, 'error');
        }
    }
    
    async loadTableStats(scope) {
        const promises = [];
        
        // Detecções
        promises.push(this.loadDetectionsStats(scope));
        
        // Buffer de imagens
        promises.push(this.loadBufferStats(scope));
        
        // Eventos
        promises.push(this.loadEventsStats());
        
        // Dispositivos
        promises.push(this.loadDevicesStats());
        
        // Imagens
        promises.push(this.loadImagesStats(scope));
        
        // Configurações
        promises.push(this.loadConfigsStats(scope));
        
        await Promise.all(promises);
    }
    
    async loadDetectionsStats(scope) {
        try {
            let query = this.supabaseClient.supabase
                .from('detections')
                .select('id, timestamp', { count: 'exact' });
            
            if (scope === 'event' && this.selectedEvent) {
                query = query.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: total, error: totalError } = await query;
            if (totalError) throw totalError;
            
            // Detecções de hoje
            const today = new Date().toISOString().split('T')[0];
            let todayQuery = this.supabaseClient.supabase
                .from('detections')
                .select('id', { count: 'exact' })
                .gte('timestamp', today);
            
            if (scope === 'event' && this.selectedEvent) {
                todayQuery = todayQuery.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: todayCount, error: todayError } = await todayQuery;
            if (todayError) throw todayError;
            
            this.detectionsTotal.textContent = total || 0;
            this.detectionsToday.textContent = todayCount || 0;
            
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas de detecções: ' + error.message, 'error');
        }
    }
    
    async loadBufferStats(scope) {
        try {
            let query = this.supabaseClient.supabase
                .from('image_buffer')
                .select('id, status', { count: 'exact' });
            
            if (scope === 'event' && this.selectedEvent) {
                query = query.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: total, error: totalError } = await query;
            if (totalError) throw totalError;
            
            // Imagens pendentes
            let pendingQuery = this.supabaseClient.supabase
                .from('image_buffer')
                .select('id', { count: 'exact' })
                .eq('status', 'pending');
            
            if (scope === 'event' && this.selectedEvent) {
                pendingQuery = pendingQuery.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: pendingCount, error: pendingError } = await pendingQuery;
            if (pendingError) throw pendingError;
            
            this.bufferTotal.textContent = total || 0;
            this.bufferPending.textContent = pendingCount || 0;
            
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas do buffer: ' + error.message, 'error');
        }
    }
    
    async loadEventsStats() {
        try {
            const { count: total, error: totalError } = await this.supabaseClient.supabase
                .from('events')
                .select('id', { count: 'exact' });
            if (totalError) throw totalError;
            
            const { count: active, error: activeError } = await this.supabaseClient.supabase
                .from('events')
                .select('id', { count: 'exact' })
                .eq('status', 'active');
            if (activeError) throw activeError;
            
            this.eventsTotal.textContent = total || 0;
            this.eventsActive.textContent = active || 0;
            
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas de eventos: ' + error.message, 'error');
        }
    }
    
    async loadDevicesStats() {
        try {
            const { count: total, error: totalError } = await this.supabaseClient.supabase
                .from('devices')
                .select('id', { count: 'exact' });
            if (totalError) throw totalError;
            
            const { count: active, error: activeError } = await this.supabaseClient.supabase
                .from('devices')
                .select('id', { count: 'exact' })
                .eq('status', 'active');
            if (activeError) throw activeError;
            
            this.devicesTotal.textContent = total || 0;
            this.devicesActive.textContent = active || 0;
            
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas de dispositivos: ' + error.message, 'error');
        }
    }
    
    async loadImagesStats(scope) {
        try {
            let query = this.supabaseClient.supabase
                .from('images')
                .select('id, image_type', { count: 'exact' });
            
            if (scope === 'event' && this.selectedEvent) {
                query = query.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: total, error: totalError } = await query;
            if (totalError) throw totalError;
            
            // Imagens de prova
            let proofQuery = this.supabaseClient.supabase
                .from('images')
                .select('id', { count: 'exact' })
                .eq('image_type', 'proof');
            
            if (scope === 'event' && this.selectedEvent) {
                proofQuery = proofQuery.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: proofCount, error: proofError } = await proofQuery;
            if (proofError) throw proofError;
            
            this.imagesTotal.textContent = total || 0;
            this.imagesProof.textContent = proofCount || 0;
            
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas de imagens: ' + error.message, 'error');
        }
    }
    
    async loadConfigsStats(scope) {
        try {
            let query = this.supabaseClient.supabase
                .from('event_configurations')
                .select('id', { count: 'exact' });
            
            if (scope === 'event' && this.selectedEvent) {
                query = query.eq('event_id', this.selectedEvent.id);
            }
            
            const { count: total, error: totalError } = await query;
            if (totalError) throw totalError;
            
            this.configsTotal.textContent = total || 0;
            this.configsEvent.textContent = scope === 'event' ? total || 0 : '--';
            
        } catch (error) {
            this.log('❌ Erro ao carregar estatísticas de configurações: ' + error.message, 'error');
        }
    }
    
    confirmAction(action) {
        this.pendingAction = action;
        
        const messages = {
            clearDetections: 'Tem certeza que deseja limpar TODAS as detecções? Esta ação não pode ser desfeita!',
            clearBuffer: 'Tem certeza que deseja limpar TODO o buffer de imagens? Esta ação não pode ser desfeita!',
            clearProcessed: 'Tem certeza que deseja limpar todas as imagens processadas do buffer?',
            clearEvents: 'Tem certeza que deseja limpar TODOS os eventos? Esta ação não pode ser desfeita!',
            clearDevices: 'Tem certeza que deseja limpar TODOS os dispositivos? Esta ação não pode ser desfeita!',
            clearImages: 'Tem certeza que deseja limpar TODAS as imagens? Esta ação não pode ser desfeita!',
            clearConfigs: 'Tem certeza que deseja limpar TODAS as configurações? Esta ação não pode ser desfeita!',
            clearOldImages: 'Tem certeza que deseja limpar imagens antigas (mais de 30 dias)?',
            clearAll: '⚠️ ATENÇÃO! Tem certeza que deseja limpar TODA a base de dados?\n\nIsso irá remover:\n• Todas as detecções\n• Todo o buffer de imagens\n• Todos os eventos\n• Todos os dispositivos\n• Todas as imagens\n• Todas as configurações\n\nEsta ação é IRREVERSÍVEL!',
            clearOldData: 'Tem certeza que deseja limpar dados antigos (mais de 30 dias)?'
        };
        
        this.confirmationMessage.textContent = messages[action] || 'Tem certeza?';
        this.confirmationModal.style.display = 'flex';
    }
    
    cancelAction() {
        this.pendingAction = null;
        this.confirmationModal.style.display = 'none';
    }
    
    async executePendingAction() {
        if (!this.pendingAction) return;
        
        const action = this.pendingAction;
        this.pendingAction = null;
        this.confirmationModal.style.display = 'none';
        
        try {
            this.log(`🔄 Executando ação: ${action}`, 'info');
            
            switch (action) {
                case 'clearDetections':
                    await this.clearDetections();
                    break;
                case 'clearBuffer':
                    await this.clearBuffer();
                    break;
                case 'clearProcessed':
                    await this.clearProcessedImages();
                    break;
                case 'clearEvents':
                    await this.clearEvents();
                    break;
                case 'clearDevices':
                    await this.clearDevices();
                    break;
                case 'clearImages':
                    await this.clearImages();
                    break;
                case 'clearConfigs':
                    await this.clearConfigs();
                    break;
                case 'clearOldImages':
                    await this.clearOldImages();
                    break;
                case 'clearAll':
                    await this.clearAll();
                    break;
                case 'clearOldData':
                    await this.clearOldData();
                    break;
            }
            
            // Recarregar estatísticas
            await this.loadAllData();
            
        } catch (error) {
            this.log(`❌ Erro ao executar ${action}: ` + error.message, 'error');
        }
    }
    
    async clearDetections() {
        let query = this.supabaseClient.supabase
            .from('detections')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (this.selectedEvent) {
            query = query.eq('event_id', this.selectedEvent.id);
        }
        
        const { error } = await query;
        if (error) throw error;
        
        this.log('✅ Detecções limpas com sucesso', 'success');
    }
    
    async clearBuffer() {
        // Deletar em lotes para evitar timeout
        const batchSize = 100;
        let deletedTotal = 0;
        let hasMore = true;
        
        this.log('🗑️ Iniciando limpeza do buffer em lotes...', 'info');
        
        while (hasMore) {
            // Buscar IDs em lote
            let selectQuery = this.supabaseClient.supabase
                .from('image_buffer')
                .select('id')
                .limit(batchSize);
            
            if (this.selectedEvent) {
                selectQuery = selectQuery.eq('event_id', this.selectedEvent.id);
            }
            
            const { data: records, error: selectError } = await selectQuery;
            
            if (selectError) throw selectError;
            
            if (!records || records.length === 0) {
                hasMore = false;
                break;
            }
            
            // Deletar o lote
            const ids = records.map(r => r.id);
            const { error: deleteError } = await this.supabaseClient.supabase
                .from('image_buffer')
                .delete()
                .in('id', ids);
            
            if (deleteError) throw deleteError;
            
            deletedTotal += records.length;
            this.log(`🗑️ Deletados ${deletedTotal} registros...`, 'info');
            
            // Se deletou menos que o lote, não há mais registros
            if (records.length < batchSize) {
                hasMore = false;
            }
        }
        
        this.log(`✅ Buffer limpo com sucesso! Total: ${deletedTotal} registros`, 'success');
    }
    
    async clearProcessedImages() {
        // Deletar em lotes para evitar timeout
        const batchSize = 100;
        let deletedTotal = 0;
        let hasMore = true;
        
        this.log('🗑️ Iniciando limpeza de imagens processadas em lotes...', 'info');
        
        while (hasMore) {
            // Buscar IDs em lote
            let selectQuery = this.supabaseClient.supabase
                .from('image_buffer')
                .select('id')
                .in('status', ['processed', 'discarded'])
                .limit(batchSize);
            
            if (this.selectedEvent) {
                selectQuery = selectQuery.eq('event_id', this.selectedEvent.id);
            }
            
            const { data: records, error: selectError } = await selectQuery;
            
            if (selectError) throw selectError;
            
            if (!records || records.length === 0) {
                hasMore = false;
                break;
            }
            
            // Deletar o lote
            const ids = records.map(r => r.id);
            const { error: deleteError } = await this.supabaseClient.supabase
                .from('image_buffer')
                .delete()
                .in('id', ids);
            
            if (deleteError) throw deleteError;
            
            deletedTotal += records.length;
            this.log(`🗑️ Deletados ${deletedTotal} registros...`, 'info');
            
            // Se deletou menos que o lote, não há mais registros
            if (records.length < batchSize) {
                hasMore = false;
            }
        }
        
        this.log(`✅ Imagens processadas limpas! Total: ${deletedTotal} registros`, 'success');
    }
    
    async clearEvents() {
        const { error } = await this.supabaseClient.supabase
            .from('events')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) throw error;
        
        this.log('✅ Eventos limpos com sucesso', 'success');
    }
    
    async clearDevices() {
        const { error } = await this.supabaseClient.supabase
            .from('devices')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) throw error;
        
        this.log('✅ Dispositivos limpos com sucesso', 'success');
    }
    
    async clearImages() {
        let query = this.supabaseClient.supabase
            .from('images')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (this.selectedEvent) {
            query = query.eq('event_id', this.selectedEvent.id);
        }
        
        const { error } = await query;
        if (error) throw error;
        
        this.log('✅ Imagens limpas com sucesso', 'success');
    }
    
    async clearConfigs() {
        let query = this.supabaseClient.supabase
            .from('event_configurations')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (this.selectedEvent) {
            query = query.eq('event_id', this.selectedEvent.id);
        }
        
        const { error } = await query;
        if (error) throw error;
        
        this.log('✅ Configurações limpas com sucesso', 'success');
    }
    
    async clearOldImages() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let query = this.supabaseClient.supabase
            .from('images')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString());
        
        if (this.selectedEvent) {
            query = query.eq('event_id', this.selectedEvent.id);
        }
        
        const { error } = await query;
        if (error) throw error;
        
        this.log('✅ Imagens antigas limpas com sucesso', 'success');
    }
    
    async clearAll() {
        // Limpar em ordem para respeitar foreign keys
        await this.clearDetections();
        await this.clearBuffer();
        await this.clearImages();
        await this.clearConfigs();
        await this.clearDevices();
        await this.clearEvents();
        
        this.log('✅ TODA a base de dados foi limpa', 'success');
    }
    
    async clearOldData() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Limpar detecções antigas
        const { error: detectionsError } = await this.supabaseClient.supabase
            .from('detections')
            .delete()
            .lt('timestamp', thirtyDaysAgo.toISOString());
        if (detectionsError) throw detectionsError;
        
        // Limpar buffer antigo
        const { error: bufferError } = await this.supabaseClient.supabase
            .from('image_buffer')
            .delete()
            .lt('captured_at', thirtyDaysAgo.toISOString());
        if (bufferError) throw bufferError;
        
        // Limpar imagens antigas
        const { error: imagesError } = await this.supabaseClient.supabase
            .from('images')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString());
        if (imagesError) throw imagesError;
        
        this.log('✅ Dados antigos limpos com sucesso', 'success');
    }
    
    async exportData(table) {
        try {
            this.log(`📄 Exportando dados da tabela ${table}...`, 'info');
            
            let query = this.supabaseClient.supabase
                .from(table)
                .select('*');
            
            if (this.selectedEvent && ['detections', 'image_buffer', 'images', 'event_configurations'].includes(table)) {
                query = query.eq('event_id', this.selectedEvent.id);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${table}_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.log(`✅ Dados da tabela ${table} exportados (${data.length} registros)`, 'success');
            
        } catch (error) {
            this.log(`❌ Erro ao exportar ${table}: ` + error.message, 'error');
        }
    }
    
    async exportAllData() {
        try {
            this.log('📦 Exportando todos os dados...', 'info');
            
            const tables = ['events', 'devices', 'detections', 'image_buffer', 'images', 'event_configurations'];
            const allData = {};
            
            for (const table of tables) {
                let query = this.supabaseClient.supabase
                    .from(table)
                    .select('*');
                
                if (this.selectedEvent && ['detections', 'image_buffer', 'images', 'event_configurations'].includes(table)) {
                    query = query.eq('event_id', this.selectedEvent.id);
                }
                
                const { data, error } = await query;
                if (error) throw error;
                
                allData[table] = data;
            }
            
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `visionkrono_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.log('✅ Todos os dados exportados com sucesso', 'success');
            
        } catch (error) {
            this.log('❌ Erro ao exportar todos os dados: ' + error.message, 'error');
        }
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.logArea.appendChild(logEntry);
        this.logArea.scrollTop = this.logArea.scrollHeight;
        
        // Manter apenas os últimos 100 logs
        while (this.logArea.children.length > 100) {
            this.logArea.removeChild(this.logArea.firstChild);
        }
    }
    
    clearLog() {
        this.logArea.innerHTML = '';
        this.log('📝 Log limpo', 'info');
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que tudo está carregado
    setTimeout(() => {
        window.databaseManagement = new DatabaseManagement();
    }, 1000);
});
