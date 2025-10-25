class VisionKronoClassifications {
    constructor() {
        this.supabaseClient = new SupabaseClient();
        this.selectedEvent = null;
        this.classifications = [];
        this.updateInterval = null;
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        await this.initSupabase();
        await this.loadEvents();
        this.startRealTimeUpdates();
    }
    
    setupElements() {
        // Seletores
        this.eventSelector = document.getElementById('eventSelector');
        
        // Informações do evento
        this.eventInfo = document.getElementById('eventInfo');
        this.eventName = document.getElementById('eventName');
        this.eventStatus = document.getElementById('eventStatus');
        this.eventStartTime = document.getElementById('eventStartTime');
        this.eventDuration = document.getElementById('eventDuration');
        
        // Controles
        this.refreshBtn = document.getElementById('refreshBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Lista de classificações
        this.classificationsList = document.getElementById('classificationsList');
        
        // Estatísticas
        this.totalAthletes = document.getElementById('totalAthletes');
        this.completedAthletes = document.getElementById('completedAthletes');
        this.bestTime = document.getElementById('bestTime');
        this.avgTime = document.getElementById('avgTime');
    }
    
    setupEventListeners() {
        this.eventSelector.addEventListener('change', (e) => this.selectEvent(e.target.value));
        this.refreshBtn.addEventListener('click', () => this.refreshClassifications());
        this.exportBtn.addEventListener('click', () => this.exportClassifications());
        this.clearBtn.addEventListener('click', () => this.clearClassifications());
    }
    
    async initSupabase() {
        try {
            console.log('🔍 Inicializando Supabase...');
            
            // Aguardar a inicialização do supabase global
            if (window.supabaseClient && window.supabaseClient.isConnected) {
                this.supabaseClient = window.supabaseClient.supabase;
            } else {
                // Aguardar um pouco e tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (window.supabaseClient && window.supabaseClient.isConnected) {
                    this.supabaseClient = window.supabaseClient.supabase;
                } else {
                    throw new Error('Supabase não está conectado');
                }
            }
            
            console.log('✅ Supabase conectado');
        } catch (error) {
            console.error('❌ Erro ao conectar Supabase:', error);
        }
    }
    
    async loadEvents() {
        try {
            // Aguardar até que o Supabase esteja conectado
            while (!this.supabaseClient) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const { data: events, error } = await this.supabaseClient
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Erro ao carregar eventos:', error);
                return;
            }
            
            this.eventSelector.innerHTML = '<option value="">-- Selecionar Evento --</option>';
            
            if (events && events.length > 0) {
                events.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = `${event.name || 'Sem nome'} (${event.status || 'Sem status'})`;
                    this.eventSelector.appendChild(option);
                });
                console.log(`📅 ${events.length} eventos carregados`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar eventos:', error);
        }
    }
    
    async selectEvent(eventId) {
        if (!eventId) {
            this.selectedEvent = null;
            this.eventInfo.style.display = 'none';
            this.classificationsList.innerHTML = '<div class="empty-message"><h3>Selecione um evento</h3><p>Escolha um evento para ver as classificações</p></div>';
            return;
        }
        
        try {
            // Aguardar até que o Supabase esteja conectado
            while (!this.supabaseClient) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Buscar evento
            const { data: event, error } = await this.supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            
            if (error) {
                throw new Error(`Erro ao carregar evento: ${error.message}`);
            }
            
            this.selectedEvent = event;
            this.updateEventInfo();
            await this.loadClassifications();
            
        } catch (error) {
            console.error('❌ Erro ao selecionar evento:', error);
            alert('❌ Erro ao carregar evento: ' + error.message);
        }
    }
    
    updateEventInfo() {
        if (!this.selectedEvent) return;
        
        this.eventName.textContent = this.selectedEvent.name || 'Sem nome';
        this.eventStatus.textContent = this.getStatusLabel(this.selectedEvent.status);
        
        if (this.selectedEvent.event_started_at) {
            const startTime = new Date(this.selectedEvent.event_started_at);
            this.eventStartTime.textContent = startTime.toLocaleTimeString('pt-BR');
        } else {
            this.eventStartTime.textContent = '--:--';
        }
        
        // Calcular duração
        if (this.selectedEvent.event_started_at) {
            const startTime = new Date(this.selectedEvent.event_started_at);
            const endTime = this.selectedEvent.event_ended_at ? 
                new Date(this.selectedEvent.event_ended_at) : 
                new Date();
            
            const duration = endTime - startTime;
            const hours = Math.floor(duration / 3600000);
            const minutes = Math.floor((duration % 3600000) / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            
            this.eventDuration.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            this.eventDuration.textContent = '00:00:00';
        }
        
        this.eventInfo.style.display = 'block';
    }
    
    async loadClassifications() {
        if (!this.selectedEvent) return;
        
        try {
            console.log(`📊 Carregando classificações do evento ${this.selectedEvent.id}...`);
            
            // Aguardar até que o Supabase esteja conectado
            while (!this.supabaseClient) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Buscar classificações usando a view corrigida
            const { data: classifications, error } = await this.supabaseClient
                .from('event_classifications')
                .select('*')
                .eq('event_id', this.selectedEvent.id)
                .order('position', { ascending: true })
                .abortSignal(AbortSignal.timeout(10000)); // Timeout de 10s
            
            if (error) {
                console.error('❌ Erro ao carregar classificações:', error);
                this.classificationsList.innerHTML = '<div class="empty-message"><h3>Erro ao carregar</h3><p>Tente novamente em alguns instantes</p></div>';
                return;
            }
            
            this.classifications = classifications || [];
            
            // Agrupar dados para estatísticas corretas
            const groupedByDorsal = {};
            this.classifications.forEach(classification => {
                const dorsalNumber = classification.dorsal_number;
                if (!groupedByDorsal[dorsalNumber]) {
                    groupedByDorsal[dorsalNumber] = {
                        dorsal_number: dorsalNumber,
                        total_time: classification.total_time,
                        is_penalty: classification.is_penalty,
                        classifications: []
                    };
                }
                groupedByDorsal[dorsalNumber].classifications.push(classification);
            });
            
            this.renderClassifications();
            this.updateStatistics(groupedByDorsal);
            
            console.log(`✅ ${this.classifications.length} classificações carregadas`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar classificações:', error);
            this.classificationsList.innerHTML = '<div class="empty-message"><h3>Erro na conexão</h3><p>Verifique sua conexão e tente novamente</p></div>';
        }
    }
    
    renderClassifications() {
        if (!this.classifications || this.classifications.length === 0) {
            this.classificationsList.innerHTML = `
                <div class="empty-message">
                    <h3>Nenhuma classificação encontrada</h3>
                    <p>As classificações aparecerão aqui quando os atletas começarem a passar pelos checkpoints</p>
                </div>
            `;
            return;
        }
        
        // Agrupar por dorsal para mostrar apenas uma linha por dorsal
        const groupedByDorsal = {};
        this.classifications.forEach(classification => {
            const dorsalNumber = classification.dorsal_number;
            if (!groupedByDorsal[dorsalNumber]) {
                groupedByDorsal[dorsalNumber] = {
                    dorsal_number: dorsalNumber,
                    position: classification.position,
                    total_time: classification.total_time,
                    full_name: classification.full_name,
                    team_name: classification.team_name,
                    category: classification.category,
                    gap_to_leader: classification.gap_to_leader,
                    avg_speed_kmh: classification.avg_speed_kmh,
                    pace_per_km_seconds: classification.pace_per_km_seconds,
                    event_type: classification.event_type,
                    classifications: []
                };
            }
            groupedByDorsal[dorsalNumber].classifications.push(classification);
        });
        
        // Ordenar por melhor tempo total
        const sortedDorsals = Object.values(groupedByDorsal).sort((a, b) => {
            if (!a.total_time) return 1;
            if (!b.total_time) return -1;
            return this.parseInterval(a.total_time) - this.parseInterval(b.total_time);
        });
        
        this.classificationsList.innerHTML = sortedDorsals.map((dorsalData, index) => {
            const dorsalNumber = dorsalData.dorsal_number;
            const position = index + 1;
            const totalTime = this.formatTime(dorsalData.total_time);
            const gapTime = this.formatGapTime(dorsalData.gap_to_leader, position);
            const avgSpeed = this.formatSpeed(dorsalData.avg_speed_kmh);
            const pace = this.formatPace(dorsalData.pace_per_km_seconds, dorsalData.event_type);
            const status = this.getClassificationStatus(dorsalData);
            
            return `
                <div class="classification-row">
                    <div class="position ${this.getPositionClass(position)}">${position}</div>
                    <div class="dorsal-number">${dorsalNumber}</div>
                    <div class="participant-name">${dorsalData.full_name || 'N/A'}</div>
                    <div class="team-name">${dorsalData.team_name || 'N/A'}</div>
                    <div class="category-badge">${dorsalData.category || 'Open'}</div>
                    <div class="time-display">${totalTime}</div>
                    <div class="gap-time ${position === 1 ? 'leader' : ''}">${gapTime}</div>
                    <div class="pace-display">${pace}</div>
                    <div class="avg-speed">${avgSpeed}</div>
                    <div class="splits-display">${this.renderSplits(dorsalData)}</div>
                    <div class="status-badge ${status.class}">${status.text}</div>
                    <div class="actions">
                        <button class="action-btn view" onclick="window.classificationsApp.viewAthlete(${dorsalNumber})" title="Ver detalhes">
                            👁️
                        </button>
                        <button class="action-btn photo" onclick="window.classificationsApp.viewPhoto('${dorsalData.classifications[0].detection_id}')" title="Ver foto">
                            📷
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    formatTime(timeInterval) {
        console.log(`🕐 formatTime recebido: "${timeInterval}" (type: ${typeof timeInterval})`);
        
        if (!timeInterval) {
            console.log('❌ timeInterval é null/undefined');
            return '--:--:--';
        }
        
        // Converter interval para milissegundos
        const totalMs = this.parseInterval(timeInterval);
        console.log(`🕐 totalMs calculado: ${totalMs}`);
        
        if (totalMs <= 0) {
            console.log('❌ totalMs é 0 ou negativo');
            return '--:--:--';
        }
        
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        console.log(`✅ Tempo formatado: ${formatted}`);
        
        return formatted;
    }
    
    formatGapTime(gapInterval, position) {
        if (position === 1) {
            return '--:--'; // Líder não tem gap
        }
        
        if (!gapInterval) {
            return '--:--';
        }
        
        const gapMs = this.parseInterval(gapInterval);
        if (gapMs <= 0) {
            return '--:--';
        }
        
        const minutes = Math.floor(gapMs / 60000);
        const seconds = Math.floor((gapMs % 60000) / 1000);
        
        return `+${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    formatSpeed(speedKmh) {
        if (!speedKmh || speedKmh <= 0) {
            return '--';
        }
        
        return speedKmh.toFixed(1);
    }
    
    formatPace(paceSeconds, eventType) {
        if (!paceSeconds || paceSeconds <= 0 || eventType !== 'running') {
            return '--';
        }
        
        const minutes = Math.floor(paceSeconds / 60);
        const seconds = Math.floor(paceSeconds % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    parseInterval(interval) {
        console.log(`🔍 Parsing interval: "${interval}" (type: ${typeof interval})`);
        
        if (!interval) {
            console.log('❌ Interval é null/undefined');
            return 0;
        }
        
        // Se já é um número (milissegundos)
        if (typeof interval === 'number') {
            console.log(`✅ Já é número: ${interval}ms`);
            return interval;
        }
        
        // Se é string, tentar diferentes formatos
        if (typeof interval === 'string') {
            // Formato HH:MM:SS ou HH:MM:SS.mmm
            const timeMatch = interval.match(/(\d+):(\d+):(\d+\.?\d*)/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]) || 0;
                const minutes = parseInt(timeMatch[2]) || 0;
                const seconds = parseFloat(timeMatch[3]) || 0;
                const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                console.log(`✅ Parseado: ${hours}h ${minutes}m ${seconds}s = ${totalMs}ms`);
                return totalMs;
            }
            
            // Formato PostgreSQL interval (ex: "00:15:46")
            const pgMatch = interval.match(/^(\d+):(\d+):(\d+\.?\d*)$/);
            if (pgMatch) {
                const hours = parseInt(pgMatch[1]) || 0;
                const minutes = parseInt(pgMatch[2]) || 0;
                const seconds = parseFloat(pgMatch[3]) || 0;
                const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                console.log(`✅ PostgreSQL format: ${hours}h ${minutes}m ${seconds}s = ${totalMs}ms`);
                return totalMs;
            }
            
            // Tentar extrair números
            const numbers = interval.match(/\d+/g);
            if (numbers && numbers.length >= 2) {
                const hours = parseInt(numbers[0]) || 0;
                const minutes = parseInt(numbers[1]) || 0;
                const seconds = parseFloat(numbers[2]) || 0;
                const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                console.log(`✅ Extraído números: ${hours}h ${minutes}m ${seconds}s = ${totalMs}ms`);
                return totalMs;
            }
        }
        
        console.log(`❌ Não conseguiu parsear: "${interval}"`);
        return 0;
    }
    
    renderSplits(classification) {
        // Se há múltiplos checkpoints para este dorsal, mostrar todos
        if (classification.classifications && classification.classifications.length > 1) {
            let splitsHtml = '';
            classification.classifications.forEach(split => {
                const splitTime = split.split_time ? this.formatTime(split.split_time) : this.formatTime(split.total_time);
                const checkpointNumber = split.device_order || 1;
                
                if (split.detection_id && split.detection_id !== 'undefined' && split.detection_id !== 'null') {
                    splitsHtml += `
                        <div class="split-item" onclick="window.classificationsApp.viewSplitPhoto('${split.detection_id}', ${checkpointNumber})" title="Ver foto do checkpoint ${checkpointNumber}">
                            <span class="split-time">${splitTime}</span>
                            <span class="split-icon">📷</span>
                            <span class="split-checkpoint">CP${checkpointNumber}</span>
                        </div>
                    `;
                } else {
                    splitsHtml += `
                        <div class="split-item">
                            <span class="split-time">${splitTime}</span>
                            <span class="split-checkpoint">CP${checkpointNumber}</span>
                        </div>
                    `;
                }
            });
            return `<div class="splits-container">${splitsHtml}</div>`;
        }
        
        // Se há apenas um checkpoint, SEMPRE mostrar com foto se disponível
        const totalTime = this.formatTime(classification.total_time);
        const checkpointNumber = classification.device_order || 1;
        
        // Usar o detection_id do primeiro checkpoint se disponível
        const detectionId = classification.classifications && classification.classifications[0] 
            ? classification.classifications[0].detection_id 
            : classification.detection_id;
        
        if (!detectionId || detectionId === 'undefined' || detectionId === 'null') {
            return `<span class="split-time-only">${totalTime}</span>`;
        }
        
        return `
            <div class="split-item" onclick="window.classificationsApp.viewSplitPhoto('${detectionId}', ${checkpointNumber})" title="Ver foto do checkpoint ${checkpointNumber}">
                <span class="split-time">${totalTime}</span>
                <span class="split-icon">📷</span>
                <span class="split-checkpoint">CP${checkpointNumber}</span>
            </div>
        `;
    }
    
    async viewAllSplits(dorsalNumber) {
        console.log(`📊 Ver todos os splits do dorsal ${dorsalNumber}`);
        
        try {
            const { data: splits, error } = await this.supabaseClient
                .from('classifications')
                .select('*')
                .eq('event_id', this.selectedEvent.id)
                .eq('dorsal_number', dorsalNumber)
                .order('device_order', { ascending: true });
            
            if (error) {
                console.error('Erro ao buscar splits:', error);
                alert('Erro ao carregar splits');
                return;
            }
            
            if (!splits || splits.length === 0) {
                alert('Nenhum split encontrado');
                return;
            }
            
            // Criar modal com todos os splits
            let splitsHtml = `<h3>Splits do Dorsal ${dorsalNumber}</h3>`;
            splits.forEach(split => {
                const splitTime = split.split_time ? this.formatTime(split.split_time) : '--:--:--';
                const totalTime = this.formatTime(split.total_time);
                const checkpointNumber = split.device_order || 1;
                
                splitsHtml += `
                    <div class="split-detail">
                        <strong>CP${checkpointNumber}:</strong> 
                        Split: ${splitTime} | Total: ${totalTime}
                        ${split.detection_id ? `<button onclick="window.classificationsApp.viewSplitPhoto('${split.detection_id}', ${checkpointNumber})">📷 Ver Foto</button>` : ''}
                    </div>
                `;
            });
            
            // Abrir em nova janela
            const newWindow = window.open('', '_blank', 'width=600,height=400');
            newWindow.document.write(`
                <html>
                    <head><title>Splits - Dorsal ${dorsalNumber}</title></head>
                    <body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: white;">
                        ${splitsHtml}
                    </body>
                </html>
            `);
            
        } catch (error) {
            console.error('Erro ao mostrar splits:', error);
            alert('Erro ao mostrar splits');
        }
    }
    
    async viewSplitPhoto(detectionId, checkpointNumber) {
        console.log(`📷 Ver foto do checkpoint ${checkpointNumber} - detecção ${detectionId}`);
        
        if (!detectionId || detectionId === 'undefined' || detectionId === 'null') {
            alert('ID da detecção não disponível para este checkpoint');
            return;
        }
        
        try {
            // Buscar a imagem da detecção
            const { data: detection, error } = await this.supabaseClient
                .from('detections')
                .select('proof_image')
                .eq('id', detectionId)
                .single();
            
            if (error) {
                console.error('Erro ao buscar foto:', error);
                alert('Erro ao carregar foto da detecção');
                return;
            }
            
            if (!detection.proof_image) {
                alert('Foto não disponível para este checkpoint');
                return;
            }
            
            // Abrir foto em nova janela com título específico
            this.openImageInNewWindow(detection.proof_image, `Checkpoint ${checkpointNumber}`);
            
        } catch (error) {
            console.error('Erro ao buscar foto:', error);
            alert('Erro ao carregar foto da detecção');
        }
    }
    
    getClassificationStatus(classification) {
        if (classification.is_penalty) {
            return {
                class: 'status-penalty',
                text: 'PENALIDADE'
            };
        }
        
        if (classification.total_time) {
            return {
                class: 'status-completed',
                text: 'COMPLETO'
            };
        }
        
        return {
            class: 'status-pending',
            text: 'EM ANDAMENTO'
        };
    }
    
    getPositionClass(position) {
        if (position === 1) return 'position-1';
        if (position === 2) return 'position-2';
        if (position === 3) return 'position-3';
        return 'position-other';
    }
    
    updateStatistics(groupedData) {
        console.log('📊 Atualizando estatísticas...', groupedData);
        
        if (!groupedData || Object.keys(groupedData).length === 0) {
            this.totalAthletes.textContent = '0';
            this.completedAthletes.textContent = '0';
            this.bestTime.textContent = '--:--:--';
            this.avgTime.textContent = '--:--:--';
            return;
        }
        
        // Contar dorsais únicos
        const total = Object.keys(groupedData).length;
        
        // Contar dorsais únicos que completaram (têm total_time válido)
        const completed = Object.values(groupedData).filter(dorsal => 
            dorsal.total_time && !dorsal.is_penalty
        ).length;
        
        console.log(`📊 Total dorsais únicos: ${total}, Completados únicos: ${completed}`);
        console.log(`📊 Dorsais únicos:`, Object.keys(groupedData));
        console.log(`📊 Dorsais completados:`, Object.values(groupedData).filter(d => d.total_time && !d.is_penalty).map(d => d.dorsal_number));
        
        this.totalAthletes.textContent = total;
        this.completedAthletes.textContent = completed;
        
        // Melhor tempo - usar dados agrupados
        const validTimes = Object.values(groupedData)
            .filter(dorsal => dorsal.total_time && !dorsal.is_penalty)
            .map(dorsal => this.parseInterval(dorsal.total_time))
            .filter(timeMs => timeMs > 0);
        
        console.log('⏱️ Tempos válidos por dorsal:', validTimes);
        console.log('⏱️ Dorsais com tempos:', Object.values(groupedData).filter(d => d.total_time && !d.is_penalty).map(d => d.dorsal_number));
        
        if (validTimes.length > 0) {
            const bestTimeMs = Math.min(...validTimes);
            const avgTimeMs = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
            
            console.log(`🏆 Melhor tempo: ${bestTimeMs}ms, Média: ${avgTimeMs}ms`);
            
            this.bestTime.textContent = this.formatTime(bestTimeMs);
            this.avgTime.textContent = this.formatTime(avgTimeMs);
        } else {
            console.log('❌ Nenhum tempo válido encontrado');
            this.bestTime.textContent = '--:--:--';
            this.avgTime.textContent = '--:--:--';
        }
    }
    
    getStatusLabel(status) {
        const statusLabels = {
            'draft': 'Rascunho',
            'active': 'Ativo',
            'paused': 'Pausado',
            'completed': 'Finalizado',
            'cancelled': 'Cancelado'
        };
        return statusLabels[status] || status || 'Desconhecido';
    }
    
    async refreshClassifications() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        console.log('🔄 Atualizando classificações...');
        await this.loadClassifications();
    }
    
    async exportClassifications() {
        if (!this.selectedEvent || !this.classifications.length) {
            alert('⚠️ Nenhuma classificação para exportar');
            return;
        }
        
        try {
            // Criar CSV
            const headers = ['Posição', 'Dorsal', 'Tempo Total', 'Status', 'Penalidade'];
            const rows = this.classifications.map(c => [
                c.position || '',
                c.dorsal_number || '',
                this.formatTime(c.total_time),
                c.is_penalty ? 'Penalidade' : 'Completo',
                c.penalty_reason || ''
            ]);
            
            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');
            
            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `classificacoes_${this.selectedEvent.name}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Classificações exportadas');
            
        } catch (error) {
            console.error('❌ Erro ao exportar:', error);
            alert('❌ Erro ao exportar classificações');
        }
    }
    
    async clearClassifications() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        if (!confirm(`🗑️ Limpar todas as classificações do evento "${this.selectedEvent.name}"?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }
        
        try {
            const { error } = await this.supabaseClient
                .from('classifications')
                .delete()
                .eq('event_id', this.selectedEvent.id);
            
            if (error) {
                throw new Error(`Erro ao limpar classificações: ${error.message}`);
            }
            
            console.log('✅ Classificações limpas');
            alert('✅ Classificações limpas com sucesso!');
            
            await this.loadClassifications();
            
        } catch (error) {
            console.error('❌ Erro ao limpar classificações:', error);
            alert('❌ Erro ao limpar classificações: ' + error.message);
        }
    }
    
    startRealTimeUpdates() {
        // Atualizar a cada 5 segundos se houver evento selecionado
        this.updateInterval = setInterval(() => {
            if (this.selectedEvent) {
                this.loadClassifications();
            }
        }, 5000);
    }
    
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // Método para forçar recarregamento
    async forceRefresh() {
        console.log('🔄 Forçando recarregamento das classificações...');
        
        // Limpar cache local
        this.classifications = [];
        this.classificationsList.innerHTML = '<div class="loading">🔄 Carregando...</div>';
        
        // Recarregar dados
        await this.loadClassifications();
        
        console.log('✅ Recarregamento concluído');
    }
    
    // Métodos auxiliares para ações
    viewAthlete(dorsalNumber) {
        console.log(`👁️ Ver detalhes do atleta ${dorsalNumber}`);
        
        // Buscar todas as classificações deste dorsal
        const athleteClassifications = this.classifications.filter(c => c.dorsal_number === dorsalNumber);
        
        if (athleteClassifications.length === 0) {
            alert(`Nenhuma classificação encontrada para o dorsal ${dorsalNumber}`);
            return;
        }
        
        const classification = athleteClassifications[0];
        const details = `
🏃 Detalhes do Atleta ${dorsalNumber}

📊 Classificação:
• Posição: ${classification.position}º lugar
• Tempo Total: ${this.formatTime(classification.total_time)}
• Status: ${classification.is_penalty ? 'PENALIDADE' : 'COMPLETO'}

⏱️ Checkpoints:
• Checkpoint ${classification.device_order}: ${new Date(classification.checkpoint_time).toLocaleTimeString('pt-BR')}
• Split Time: ${classification.split_time ? this.formatTime(classification.split_time) : '--:--:--'}

📅 Evento: ${classification.event_name}
🕐 Início: ${new Date(classification.event_started_at).toLocaleString('pt-BR')}
        `;
        
        alert(details);
    }
    
    async viewPhoto(detectionId) {
        console.log(`📷 Ver foto da detecção ${detectionId}`);
        
        if (!detectionId || detectionId === 'undefined' || detectionId === 'null') {
            alert('ID da detecção não disponível');
            return;
        }
        
        try {
            // Buscar a imagem da detecção
            const { data: detection, error } = await this.supabaseClient
                .from('detections')
                .select('proof_image')
                .eq('id', detectionId)
                .single();
            
            if (error) {
                console.error('Erro ao buscar foto:', error);
                alert('Erro ao carregar foto da detecção');
                return;
            }
            
            if (!detection.proof_image) {
                alert('Foto não disponível para esta detecção');
                return;
            }
            
            // Abrir foto em nova janela
            this.openImageInNewWindow(detection.proof_image);
            
        } catch (error) {
            console.error('Erro ao buscar foto:', error);
            alert('Erro ao carregar foto da detecção');
        }
    }
    
    openImageInNewWindow(imageData, title = 'Foto da Detecção') {
        // Remover prefixo data: se existir
        let cleanImageData = imageData;
        if (imageData.startsWith('data:image/')) {
            cleanImageData = imageData;
        } else {
            cleanImageData = `data:image/jpeg;base64,${imageData}`;
        }
        
        // Abrir nova janela com a imagem
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        newWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 20px; 
                            background: #000; 
                            display: flex; 
                            flex-direction: column;
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh;
                            color: #00ff88;
                            font-family: Arial, sans-serif;
                        }
                        h1 {
                            margin-bottom: 20px;
                            text-align: center;
                        }
                        img { 
                            max-width: 100%; 
                            max-height: 80vh; 
                            border: 2px solid #00ff88;
                            border-radius: 8px;
                        }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <img src="${cleanImageData}" alt="${title}" />
                </body>
            </html>
        `);
        newWindow.document.close();
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.classificationsApp = new VisionKronoClassifications();
});
