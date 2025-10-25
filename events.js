class VisionKronoEvents {
    constructor() {
        this.supabaseClient = new SupabaseClient();
        this.events = [];
        this.selectedEvent = null;
        this.subscription = null;
        
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
        // Botões principais
        this.newEventBtn = document.getElementById('newEventBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        
        // Grids e listas
        this.eventsGrid = document.getElementById('eventsGrid');
        this.totalEvents = document.getElementById('totalEvents');
        this.totalDevices = document.getElementById('totalDevices');
        this.totalDetections = document.getElementById('totalDetections');
        
        // Modal de evento
        this.eventModal = document.getElementById('eventModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.eventForm = document.getElementById('eventForm');
        this.cancelBtn = document.getElementById('cancelBtn');
        
        // Campos do formulário
        this.eventName = document.getElementById('eventName');
        this.eventDescription = document.getElementById('eventDescription');
        this.eventDate = document.getElementById('eventDate');
        this.eventLocation = document.getElementById('eventLocation');
        
        // Modal de detalhes
        this.eventDetailsModal = document.getElementById('eventDetailsModal');
        this.closeDetailsBtn = document.getElementById('closeDetailsBtn');
        this.eventDetailsTitle = document.getElementById('eventDetailsTitle');
        this.eventInfo = document.getElementById('eventInfo');
        this.devicesList = document.getElementById('devicesList');
        this.configStatus = document.getElementById('configStatus');
        this.eventDetectionsList = document.getElementById('eventDetectionsList');
        this.eventTotalDetections = document.getElementById('eventTotalDetections');
        this.eventLastDetection = document.getElementById('eventLastDetection');
        
        // Ações do evento
        this.addDeviceBtn = document.getElementById('addDeviceBtn');
        this.generateQRBtn = document.getElementById('generateQRBtn');
        this.configPatternBtn = document.getElementById('configPatternBtn');
        this.uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        this.configAreaBtn = document.getElementById('configAreaBtn');
        this.calibrateParamsBtn = document.getElementById('calibrateParamsBtn');
        this.configDetectionModeBtn = document.getElementById('configDetectionModeBtn');
        this.pauseEventBtn = document.getElementById('pauseEventBtn');
        this.completeEventBtn = document.getElementById('completeEventBtn');
        this.exportEventBtn = document.getElementById('exportEventBtn');
        
        // Novos elementos para gestão
        this.clearDetectionsBtn = document.getElementById('clearDetectionsBtn');
        this.clearBufferBtn = document.getElementById('clearBufferBtn');
        this.removeDeviceBtn = document.getElementById('removeDeviceBtn');
        this.clearQueueBtn = document.getElementById('clearQueueBtn');
        this.refreshStatusBtn = document.getElementById('refreshStatusBtn');
        
        // Timing controls
        this.eventTimingStatus = document.getElementById('eventTimingStatus');
        this.eventScheduledTime = document.getElementById('eventScheduledTime');
        this.eventStartTime = document.getElementById('eventStartTime');
        this.eventDuration = document.getElementById('eventDuration');
        this.nextStartTime = document.getElementById('nextStartTime');
        this.startEventBtn = document.getElementById('startEventBtn');
        this.stopEventBtn = document.getElementById('stopEventBtn');
        this.resetEventBtn = document.getElementById('resetEventBtn');
        
        // Timing configuration
        this.eventDate = document.getElementById('eventDate');
        this.eventTime = document.getElementById('eventTime');
        this.autoStartEnabled = document.getElementById('autoStartEnabled');
        this.saveTimingConfigBtn = document.getElementById('saveTimingConfigBtn');
        
        // Device sequence
        this.deviceSequenceList = document.getElementById('deviceSequenceList');
        this.editSequenceBtn = document.getElementById('editSequenceBtn');
        
        // Elementos de status
        this.queueLength = document.getElementById('queueLength');
        this.processingCount = document.getElementById('processingCount');
        this.completedCount = document.getElementById('completedCount');
        this.errorCount = document.getElementById('errorCount');
        
        // Elementos de links de dispositivos
        this.deviceLinksList = document.getElementById('deviceLinksList');
    }
    
    setupEventListeners() {
        this.newEventBtn.addEventListener('click', () => this.openNewEventModal());
        this.refreshBtn.addEventListener('click', () => this.loadEvents());
        
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.closeDetailsBtn.addEventListener('click', () => this.closeDetailsModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        
        this.eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        
        // Event details actions
        this.addDeviceBtn.addEventListener('click', () => this.addDevice());
        this.generateQRBtn.addEventListener('click', () => this.generateQRCode());
        this.configPatternBtn.addEventListener('click', () => this.configurePattern());
        this.uploadPhotoBtn.addEventListener('click', () => this.uploadReferencePhoto());
        this.configAreaBtn.addEventListener('click', () => this.configureArea());
        this.calibrateParamsBtn.addEventListener('click', () => this.calibrateParams());
        this.configDetectionModeBtn.addEventListener('click', () => this.configureDetectionMode());
        this.pauseEventBtn.addEventListener('click', () => this.pauseEvent());
        this.completeEventBtn.addEventListener('click', () => this.completeEvent());
        this.exportEventBtn.addEventListener('click', () => this.exportEventData());
        
        // Novos event listeners para gestão
        this.clearDetectionsBtn.addEventListener('click', () => this.clearEventDetections());
        this.clearBufferBtn.addEventListener('click', () => this.clearEventBuffer());
        this.removeDeviceBtn.addEventListener('click', () => this.removeSelectedDevice());
        this.clearQueueBtn.addEventListener('click', () => this.clearGeminiQueue());
        this.refreshStatusBtn.addEventListener('click', () => this.updateRequestStatus());
        
        // Timing controls
        this.startEventBtn.addEventListener('click', () => this.startEvent());
        this.stopEventBtn.addEventListener('click', () => this.stopEvent());
        this.resetEventBtn.addEventListener('click', () => this.resetEvent());
        this.saveTimingConfigBtn.addEventListener('click', () => this.saveTimingConfig());
        this.editSequenceBtn.addEventListener('click', () => this.editDeviceSequence());
    }
    
    async initSupabase() {
        try {
            console.log('🔍 Inicializando Supabase...');
            const connected = await this.supabaseClient.init();
            console.log('📊 Supabase conectado:', connected);
            console.log('📊 isConnected:', this.supabaseClient.isConnected);
            
            if (!connected) {
                console.warn('⚠️ Supabase não conectado - usando localStorage');
            }
        } catch (error) {
            alert('❌ Erro ao conectar Supabase. Verifique a configuração.');
            console.error('Erro Supabase:', error);
        }
    }
    
    async loadEvents() {
        try {
            console.log('📋 Carregando eventos...');
            this.eventsGrid.innerHTML = '<div class="loading">Carregando eventos...</div>';
            
            console.log('🔍 Verificando conexão Supabase...');
            console.log('isConnected:', this.supabaseClient.isConnected);
            
            if (!this.supabaseClient.isConnected) {
                console.warn('⚠️ Supabase não conectado - mostrando mensagem');
                this.eventsGrid.innerHTML = '<div class="loading">❌ Supabase não conectado</div>';
                return;
            }
            
            console.log('📡 Fazendo query na tabela events...');
            const { data: events, error } = await this.supabaseClient.supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Erro ao carregar eventos:', error);
                this.eventsGrid.innerHTML = '<div class="loading">❌ Erro ao carregar eventos</div>';
                return;
            }
            
            console.log('✅ Eventos carregados:', events?.length || 0);
            this.events = events || [];
            this.renderEvents();
            this.updateGeneralStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar eventos:', error);
            this.eventsGrid.innerHTML = '<div class="loading">❌ Erro na conexão</div>';
        }
    }
    
    renderEvents() {
        if (this.events.length === 0) {
            this.eventsGrid.innerHTML = `
                <div class="loading">
                    📅 Nenhum evento criado ainda<br>
                    <small>Clique em "Novo Evento" para começar</small>
                </div>
            `;
            return;
        }
        
        this.eventsGrid.innerHTML = this.events.map(event => `
            <div class="event-card ${event.status}" onclick="window.eventsManager.openEventDetails('${event.id}')">
                <div class="event-header">
                    <div class="event-title">${event.name}</div>
                    <div class="event-status ${event.status}">${this.getStatusLabel(event.status)}</div>
                </div>
                
                <div class="event-meta">
                    <div>📅 ${event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : 'Data não definida'}</div>
                    <div>📍 ${event.location || 'Local não definido'}</div>
                </div>
                
                <div class="event-stats">
                    <span><span class="event-stat">0</span> dispositivos</span>
                    <span><span class="event-stat">0</span> ativos</span>
                    <span><span class="event-stat">0</span> detecções</span>
                </div>
            </div>
        `).join('');
    }
    
    updateGeneralStats() {
        const activeEvents = this.events.filter(e => e.status === 'active').length;
        
        this.totalEvents.textContent = activeEvents;
        this.totalDevices.textContent = '0'; // Simplificado por enquanto
        this.totalDetections.textContent = '0'; // Simplificado por enquanto
    }
    
    getStatusLabel(status) {
        const labels = {
            active: 'Ativo',
            paused: 'Pausado', 
            completed: 'Finalizado',
            cancelled: 'Cancelado'
        };
        return labels[status] || status;
    }
    
    openNewEventModal() {
        this.modalTitle.textContent = 'Novo Evento';
        this.eventForm.reset();
        this.eventModal.style.display = 'flex';
        this.eventName.focus();
    }
    
    closeModal() {
        this.eventModal.style.display = 'none';
    }
    
    closeDetailsModal() {
        this.eventDetailsModal.style.display = 'none';
    }
    
    async handleEventSubmit(e) {
        e.preventDefault();
        
        const eventData = {
            name: this.eventName.value,
            description: this.eventDescription.value || null,
            event_date: this.eventDate.value || null,
            location: this.eventLocation.value || null,
            status: 'active'
        };
        
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('events')
                .insert([eventData])
                .select()
                .single();
            
            if (error) {
                alert('Erro ao criar evento: ' + error.message);
                return;
            }
            
            alert('✅ Evento criado com sucesso!');
            this.closeModal();
            await this.loadEvents();
            
        } catch (error) {
            alert('Erro ao criar evento: ' + error.message);
            console.error('Erro:', error);
        }
    }
    
    async openEventDetails(eventId) {
        this.selectedEvent = this.events.find(e => e.id === eventId);
        if (!this.selectedEvent) return;
        
        this.eventDetailsTitle.textContent = this.selectedEvent.name;
        this.eventDetailsModal.style.display = 'flex';
        
        await this.loadEventDetails();
    }
    
    async loadEventDetails() {
        // Carregar informações detalhadas do evento
        this.eventInfo.innerHTML = `
            <strong>Nome:</strong> ${this.selectedEvent.name}<br>
            <strong>Descrição:</strong> ${this.selectedEvent.description || 'Não definida'}<br>
            <strong>Data:</strong> ${this.selectedEvent.event_date ? new Date(this.selectedEvent.event_date).toLocaleDateString('pt-BR') : 'Não definida'}<br>
            <strong>Local:</strong> ${this.selectedEvent.location || 'Não definido'}<br>
            <strong>Status:</strong> ${this.getStatusLabel(this.selectedEvent.status)}<br>
            <strong>Criado:</strong> ${new Date(this.selectedEvent.created_at).toLocaleString('pt-BR')}
        `;
        
        // Carregar dispositivos do evento
        await this.loadEventDevices();
        
        // Carregar links de dispositivos
        await this.loadDeviceLinks();
        
        // Carregar configurações do evento
        await this.loadEventConfigurations();
        
        // Carregar detecções do evento
        await this.loadEventDetections();
        
        // Carregar sequência de dispositivos
        await this.loadDeviceSequence();
        
        // Carregar configuração de timing
        this.loadTimingConfig();
        
        // Atualizar display de timing
        this.updateTimingDisplay();
        this.updateTimingButtons();
        
        // Iniciar monitoramento automático se necessário
        if (this.selectedEvent.auto_start_enabled && !this.selectedEvent.event_started_at) {
            this.startAutoStartMonitoring();
        }
        
        // Iniciar updates em tempo real para este evento
        this.startEventRealTimeUpdates();
        
        // Iniciar atualizações de status
        this.startStatusUpdates();
    }
    
    async loadEventDevices() {
        try {
            const { data: devices, error } = await this.supabaseClient.supabase
                .from('event_devices')
                .select('*')
                .eq('event_id', this.selectedEvent.id);
            
            if (error) {
                this.devicesList.innerHTML = '❌ Erro ao carregar dispositivos';
                return;
            }
            
            if (!devices || devices.length === 0) {
                this.devicesList.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 20px;">
                        📱 Nenhum dispositivo associado<br>
                        <small>Clique em "Adicionar Dispositivo" ou gere QR Code</small>
                    </div>
                `;
                return;
            }
            
            this.devicesList.innerHTML = devices.map(device => {
                // Como removemos o JOIN, não temos dados do dispositivo
                const statusColor = '#00ff88';
                
                // Gerar link específico para este dispositivo
                const deviceUrl = `${window.location.origin}/detection?event=${this.selectedEvent.id}&device=${device.device_id}`;
                
                return `
                    <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <strong>Dispositivo ${device.device_id}</strong><br>
                                <small style="color: #ccc;">${device.role || 'Dispositivo'}</small>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: ${statusColor};">● Ativo</div>
                                <small style="color: #999;">Associado</small>
                            </div>
                        </div>
                        
                        <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 5px; margin-top: 8px;">
                            <small style="color: #ccc;">Link específico:</small><br>
                            <div style="font-family: monospace; font-size: 0.8rem; word-break: break-all;">
                                <a href="${deviceUrl}" target="_blank" style="color: #00ff88;">${deviceUrl}</a>
                            </div>
                            <button onclick="navigator.clipboard.writeText('${deviceUrl}'); alert('Link copiado!')" 
                                    style="background: rgba(0,255,136,0.2); color: #00ff88; border: none; padding: 4px 8px; border-radius: 4px; margin-top: 5px; cursor: pointer;">
                                📋 Copiar Link
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Erro ao carregar dispositivos:', error);
            this.devicesList.innerHTML = '❌ Erro na conexão';
        }
    }
    
    async loadEventConfigurations() {
        try {
            const { data: configs, error } = await this.supabaseClient.supabase
                .from('event_configurations')
                .select('*')
                .eq('event_id', this.selectedEvent.id);
            
            if (error && error.code !== 'PGRST116') {
                this.configStatus.innerHTML = '❌ Erro ao carregar configurações: ' + error.message;
                console.error('Erro ao carregar configurações:', error);
                return;
            }
            
            // Verificar cada tipo de configuração
            const configTypes = ['dorsal_pattern', 'number_area', 'calibration'];
            const configStatus = {};
            
            configs?.forEach(config => {
                configStatus[config.config_type] = {
                    configured: true,
                    data: config.config_data,
                    updated: config.updated_at
                };
            });
            
            // Carregar configuração do modo de detecção
            const detectionModeConfig = await this.supabaseClient.getConfiguration(`detection_mode_${this.selectedEvent.id}`);
            if (detectionModeConfig) {
                configStatus.detection_mode = {
                    configured: true,
                    data: detectionModeConfig,
                    updated: detectionModeConfig.updatedAt
                };
            }
            
            // Se não há configurações, mostrar estado inicial
            configTypes.forEach(type => {
                if (!configStatus[type]) {
                    configStatus[type] = { configured: false };
                }
            });
            
            if (!configStatus.detection_mode) {
                configStatus.detection_mode = { configured: false };
            }
            
            this.configStatus.innerHTML = `
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>🔢 Padrão dos Dorsais:</span>
                        <span style="color: ${configStatus.dorsal_pattern.configured ? '#00ff88' : '#ff6b35'};">
                            ${configStatus.dorsal_pattern.configured ? '✅ Configurado' : '❌ Não configurado'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>📏 Área do Número:</span>
                        <span style="color: ${configStatus.number_area.configured ? '#00ff88' : '#ff6b35'};">
                            ${configStatus.number_area.configured ? '✅ Configurada' : '❌ Não configurada'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>🔧 Calibração:</span>
                        <span style="color: ${configStatus.calibration.configured ? '#00ff88' : '#ff6b35'};">
                            ${configStatus.calibration.configured ? '✅ Configurada' : '❌ Não configurada'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>🤖 Modo Detecção:</span>
                        <span style="color: ${configStatus.detection_mode.configured ? '#00ff88' : '#ff6b35'};">
                            ${configStatus.detection_mode.configured ? 
                                `✅ ${configStatus.detection_mode.data.mode.toUpperCase()}${configStatus.detection_mode.data.bufferMode ? ' (Buffer)' : ''}` : 
                                '❌ Não configurado'
                            }
                        </span>
                    </div>
                </div>
                
                ${!configStatus.dorsal_pattern.configured || !configStatus.number_area.configured || !configStatus.calibration.configured ? 
                    '<div style="margin-top: 15px; padding: 10px; background: rgba(255,107,53,0.1); border-radius: 8px; border: 1px solid rgba(255,107,53,0.3);"><small style="color: #ff6b35;">⚠️ Clique em "Calibrar" ou "Definir Área" para configurar</small></div>' : 
                    '<div style="margin-top: 15px; padding: 10px; background: rgba(0,255,136,0.1); border-radius: 8px; border: 1px solid rgba(0,255,136,0.3);"><small style="color: #00ff88;">✅ Evento totalmente configurado</small></div>'
                }
            `;
            
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            this.configStatus.innerHTML = `
                <div style="color: #ff6b35;">❌ Erro na conexão</div>
                <div style="margin-top: 10px;">
                    <div>🔢 Padrão dos Dorsais: ❌ Não configurado</div>
                    <div>📏 Área do Número: ❌ Não configurada</div>
                    <div>🔧 Calibração: ❌ Não configurada</div>
                </div>
            `;
        }
    }
    
    async loadEventDetections() {
        if (!this.selectedEvent) {
            console.log('⚠️ Nenhum evento selecionado');
            return;
        }
        
        try {
            console.log(`📊 Carregando detecções do evento ${this.selectedEvent.id}...`);
            
            const { data: detections, error } = await this.supabaseClient.supabase
                .from('detections')
                .select('*')
                .eq('event_id', this.selectedEvent.id)
                .order('timestamp', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error('❌ Erro ao carregar detecções:', error);
                this.eventDetectionsList.innerHTML = '❌ Erro ao carregar detecções';
                return;
            }
            
            console.log(`✅ Detecções carregadas: ${detections?.length || 0}`);
            
            // Atualizar estatísticas
            this.eventTotalDetections.textContent = detections?.length || 0;
            if (detections && detections.length > 0) {
                const lastTime = new Date(detections[0].timestamp).toLocaleTimeString('pt-BR');
                this.eventLastDetection.textContent = lastTime;
            }
            
            if (!detections || detections.length === 0) {
                this.eventDetectionsList.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 20px;">
                        🎯 Aguardando detecções...<br>
                        <small>As detecções aparecerão aqui em tempo real</small>
                    </div>
                `;
                return;
            }
            
            this.eventDetectionsList.innerHTML = detections.map(detection => {
                const time = new Date(detection.timestamp).toLocaleTimeString('pt-BR');
                const location = detection.latitude ? 
                    `${detection.latitude.toFixed(4)}, ${detection.longitude.toFixed(4)}` : 
                    'GPS não disponível';
                
                // Formatar Base64 corretamente
                let imageUrl = '';
                if (detection.proof_image) {
                    // Se já começa com "data:", usar como está
                    if (detection.proof_image.startsWith('data:')) {
                        imageUrl = detection.proof_image;
                    } else {
                        // Senão, adicionar o prefixo
                        imageUrl = `data:image/jpeg;base64,${detection.proof_image}`;
                    }
                }
                
                return `
                    <div class="detection-item">
                        <div class="detection-header">
                            <div class="detection-number">${detection.number}</div>
                            <div class="detection-time">${time}</div>
                        </div>
                        <div class="detection-location" style="font-size: 0.8rem; color: #999;">${location}</div>
                        ${imageUrl ? `
                            <div class="detection-actions">
                                <button class="btn-photo" onclick="
                                    const img = new Image();
                                    img.src = '${imageUrl}';
                                    const w = window.open('');
                                    w.document.write(img.outerHTML);
                                    w.document.close();
                                " title="Ver foto">
                                    📷 Ver Foto
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Erro ao carregar detecções:', error);
            this.eventDetectionsList.innerHTML = '❌ Erro na conexão';
        }
    }
    
    startEventRealTimeUpdates() {
        // Limpar intervalo anterior se existir
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        console.log('🔄 Iniciando atualizações em tempo real...');
        
        // Carregar imediatamente
        this.loadEventDetections();
        
        // Atualizar detecções a cada 5 segundos
        this.updateInterval = setInterval(() => {
            console.log('⏰ Atualizando detecções...');
            this.loadEventDetections();
        }, 5000);
    }
    
    async addDevice() {
        const deviceName = prompt('Nome do dispositivo (ex: "iPhone João", "Samsung Maria"):');
        if (!deviceName) return;
        
        const deviceType = prompt('Tipo do dispositivo (mobile/tablet):', 'mobile');
        if (!deviceType) return;
        
        try {
            // Primeiro criar/atualizar o dispositivo
            const { data: device, error: deviceError } = await this.supabaseClient.supabase
                .from('devices')
                .upsert({
                    device_name: deviceName,
                    device_type: deviceType,
                    last_seen: new Date().toISOString()
                }, {
                    onConflict: 'device_name'
                })
                .select()
                .single();
            
            if (deviceError) {
                alert('Erro ao criar dispositivo: ' + deviceError.message);
                return;
            }
            
            // Depois associar ao evento
            const { data: association, error: assocError } = await this.supabaseClient.supabase
                .from('event_devices')
                .upsert({
                    event_id: this.selectedEvent.id,
                    device_id: device.id,
                    role: 'detector',
                    assigned_at: new Date().toISOString()
                }, {
                    onConflict: 'event_id,device_id'
                });
            
            if (assocError) {
                alert('Erro ao associar dispositivo: ' + assocError.message);
                return;
            }
            
            alert(`✅ Dispositivo "${deviceName}" adicionado ao evento!`);
            await this.loadEventDevices();
            
        } catch (error) {
            alert('Erro ao adicionar dispositivo: ' + error.message);
            console.error('Erro:', error);
        }
    }
    
    generateQRCode() {
        const eventUrl = `${window.location.origin}/detection?event=${this.selectedEvent.id}`;
        
        // Criar modal com QR Code
        const qrModal = document.createElement('div');
        qrModal.className = 'modal';
        qrModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📱 QR Code do Evento</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <p>Escaneie este QR Code no telemóvel para aceder diretamente ao evento:</p>
                    
                    <div id="qrCodeContainer" style="margin: 20px 0; padding: 20px; background: white; border-radius: 10px; display: inline-block;">
                        <canvas id="qrCanvas" width="200" height="200"></canvas>
                    </div>
                    
                    <p><strong>Link direto:</strong></p>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace;">
                        <a href="${eventUrl}" target="_blank" style="color: #00ff88;">${eventUrl}</a>
                    </div>
                    
                    <p style="margin-top: 15px; color: #ccc; font-size: 0.9rem;">
                        O dispositivo será automaticamente associado ao evento "${this.selectedEvent.name}"
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(qrModal);
        
        // Gerar QR Code simples (texto)
        const canvas = document.getElementById('qrCanvas');
        const ctx = canvas.getContext('2d');
        
        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 200);
        
        // Texto do QR (simulado)
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR CODE', 100, 50);
        ctx.fillText(this.selectedEvent.name, 100, 80);
        ctx.fillText('Evento ID:', 100, 110);
        ctx.fillText(this.selectedEvent.id.substring(0, 8) + '...', 100, 130);
        ctx.fillText('Escaneie para aceder', 100, 160);
        
        // Desenhar bordas simulando QR
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (Math.random() > 0.5) {
                    ctx.fillRect(i * 15 + 25, j * 15 + 25, 10, 10);
                }
            }
        }
    }
    
    configurePattern() {
        // Abrir modal para configurar padrão dos dorsais
        this.openPatternModal();
    }
    
    async uploadReferencePhoto() {
        // Criar input de arquivo
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                // Converter para base64
                const base64Data = await this.fileToBase64(file);
                
                // Solicitar número do dorsal
                const dorsalNumber = prompt('Qual número está nesta imagem de referência?');
                if (!dorsalNumber) return;
                
                const number = parseInt(dorsalNumber);
                if (isNaN(number)) {
                    alert('Por favor, digite apenas números');
                    return;
                }
                
                // Salvar imagem no Supabase
                const imageId = await this.supabaseClient.saveImage('calibration', base64Data, {
                    dorsal_number: number,
                    event_id: this.selectedEvent.id
                });
                
                // Salvar configuração
                await this.saveEventConfig('reference_photo', {
                    image_id: imageId,
                    dorsal_number: number,
                    image_data: base64Data
                });
                
                alert(`✅ Foto de referência salva!\n\nDorsal: ${number}\nPróximo: Configure padrão e área`);
                await this.loadEventConfigurations();
                
            } catch (error) {
                alert('Erro ao processar imagem: ' + error.message);
            }
        };
        
        input.click();
    }
    
    configureArea() {
        // Verificar se tem foto de referência
        this.checkReferencePhotoAndOpenArea();
    }
    
    async checkReferencePhotoAndOpenArea() {
        try {
            const { data: photoConfig, error } = await this.supabaseClient.supabase
                .from('event_configurations')
                .select('config_data')
                .eq('event_id', this.selectedEvent.id)
                .eq('config_type', 'reference_photo')
                .maybeSingle();
            
            if (photoConfig) {
                // Abrir modal para definir área na foto de referência
                this.openAreaDefinitionModal(photoConfig.config_data);
            } else {
                alert('⚠️ FOTO DE REFERÊNCIA NECESSÁRIA\n\nPrimeiro faça upload de uma foto do dorsal clicando em "📸 Foto Referência"');
            }
        } catch (error) {
            alert('⚠️ FOTO DE REFERÊNCIA NECESSÁRIA\n\nPrimeiro faça upload de uma foto do dorsal clicando em "📸 Foto Referência"');
        }
    }
    
    calibrateParams() {
        // Verificar se tem foto e área definidas
        this.checkPrerequisitesAndCalibrate();
    }
    
    async checkPrerequisitesAndCalibrate() {
        try {
            const { data: configs } = await this.supabaseClient.supabase
                .from('event_configurations')
                .select('config_type')
                .eq('event_id', this.selectedEvent.id)
                .in('config_type', ['reference_photo', 'number_area']);
            
            const hasPhoto = configs?.some(c => c.config_type === 'reference_photo');
            const hasArea = configs?.some(c => c.config_type === 'number_area');
            
            if (!hasPhoto) {
                alert('⚠️ FOTO DE REFERÊNCIA NECESSÁRIA\n\nPrimeiro faça upload de uma foto clicando em "📸 Foto Referência"');
                return;
            }
            
            if (!hasArea) {
                alert('⚠️ ÁREA DO NÚMERO NECESSÁRIA\n\nPrimeiro defina a área clicando em "📏 Área do Número"');
                return;
            }
            
            // Abrir calibração específica
            window.open(`/calibration?event=${this.selectedEvent.id}&step=calibration`, '_blank');
            
        } catch (error) {
            alert('Erro ao verificar pré-requisitos: ' + error.message);
        }
    }
    
    async pauseEvent() {
        if (confirm('Pausar este evento?')) {
            await this.updateEventStatus('paused');
        }
    }
    
    async completeEvent() {
        if (confirm('Finalizar este evento? Esta ação não pode ser desfeita.')) {
            await this.updateEventStatus('completed');
        }
    }
    
    async updateEventStatus(newStatus) {
        try {
            const { error } = await this.supabaseClient.supabase
                .from('events')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', this.selectedEvent.id);
            
            if (error) {
                alert('Erro ao atualizar evento: ' + error.message);
                return;
            }
            
            alert(`✅ Evento ${this.getStatusLabel(newStatus).toLowerCase()} com sucesso!`);
            this.closeDetailsModal();
            await this.loadEvents();
            
        } catch (error) {
            alert('Erro ao atualizar evento: ' + error.message);
        }
    }
    
    async exportEventData() {
        try {
            // Carregar todas as detecções do evento
            const { data: detections, error } = await this.supabaseClient.supabase
                .from('detections_complete')
                .select('*')
                .eq('event_id', this.selectedEvent.id)
                .order('timestamp', { ascending: true });
            
            if (error) {
                alert('Erro ao carregar dados: ' + error.message);
                return;
            }
            
            if (!detections || detections.length === 0) {
                alert('Nenhuma detecção encontrada para este evento');
                return;
            }
            
            // Gerar relatório completo
            let content = `RELATÓRIO DE DETECÇÕES - VISIONKRONO\n`;
            content += `=============================================\n\n`;
            content += `EVENTO: ${this.selectedEvent.name}\n`;
            content += `DESCRIÇÃO: ${this.selectedEvent.description || 'Não definida'}\n`;
            content += `DATA: ${this.selectedEvent.event_date ? new Date(this.selectedEvent.event_date).toLocaleDateString('pt-BR') : 'Não definida'}\n`;
            content += `LOCAL: ${this.selectedEvent.location || 'Não definido'}\n`;
            content += `TOTAL DETECÇÕES: ${detections.length}\n`;
            content += `GERADO EM: ${new Date().toLocaleString('pt-BR')}\n\n`;
            content += `=============================================\n\n`;
            
            // Estatísticas
            const uniqueDorsals = new Set(detections.map(d => d.number)).size;
            const devicesUsed = new Set(detections.map(d => d.device_name)).size;
            
            content += `ESTATÍSTICAS:\n`;
            content += `• Dorsais únicos detectados: ${uniqueDorsals}\n`;
            content += `• Dispositivos utilizados: ${devicesUsed}\n`;
            content += `• Primeira detecção: ${new Date(detections[0].timestamp).toLocaleString('pt-BR')}\n`;
            content += `• Última detecção: ${new Date(detections[detections.length - 1].timestamp).toLocaleString('pt-BR')}\n\n`;
            
            // Detecções por dispositivo
            const byDevice = {};
            detections.forEach(d => {
                const deviceName = d.device_name || 'Dispositivo desconhecido';
                if (!byDevice[deviceName]) byDevice[deviceName] = 0;
                byDevice[deviceName]++;
            });
            
            content += `DETECÇÕES POR DISPOSITIVO:\n`;
            Object.entries(byDevice).forEach(([device, count]) => {
                content += `• ${device}: ${count} detecções\n`;
            });
            content += `\n=============================================\n\n`;
            
            // Lista detalhada de detecções
            content += `DETECÇÕES DETALHADAS:\n\n`;
            detections.forEach((detection, index) => {
                content += `Registo ${index + 1}:\n`;
                content += `• Dorsal: ${detection.number}\n`;
                content += `• Data/Hora: ${new Date(detection.timestamp).toLocaleString('pt-BR')}\n`;
                content += `• Dispositivo: ${detection.device_name || 'Desconhecido'}\n`;
                
                if (detection.latitude && detection.longitude) {
                    content += `• GPS: ${detection.latitude}, ${detection.longitude}\n`;
                    content += `• Precisão GPS: ${Math.round(detection.accuracy || 0)}m\n`;
                } else {
                    content += `• GPS: Não disponível\n`;
                }
                
                if (detection.dorsal_region) {
                    const region = JSON.parse(detection.dorsal_region);
                    content += `• Região detectada: (${region.x}, ${region.y}) ${region.width}x${region.height}px\n`;
                }
                
                content += `• ID da prova: ${detection.proof_image_id || 'Não disponível'}\n`;
                content += `\n---\n\n`;
            });
            
            // Download do arquivo
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const eventName = this.selectedEvent.name.replace(/[^a-zA-Z0-9]/g, '_');
            const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            link.download = `${eventName}_${date}.txt`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            alert(`✅ Relatório exportado!\n\n${detections.length} detecções\n${uniqueDorsals} dorsais únicos\n${devicesUsed} dispositivos`);
            
        } catch (error) {
            alert('Erro ao exportar dados: ' + error.message);
            console.error('Erro:', error);
        }
    }
    
    startRealTimeUpdates() {
        // TODO: Implementar updates em tempo real
        setInterval(() => this.loadEvents(), 30000); // Atualizar a cada 30 segundos
    }
    
    // Métodos auxiliares
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async saveEventConfig(configType, configData) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('event_configurations')
                .upsert({
                    event_id: this.selectedEvent.id,
                    config_type: configType,
                    config_data: configData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'event_id,config_type'
                });
            
            if (error) {
                console.error('Erro ao salvar configuração:', error);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return false;
        }
    }
    
    async openPatternModal() {
        // Carregar configuração existente primeiro
        let existingPattern = null;
        
        try {
            const { data: config } = await this.supabaseClient.supabase
                .from('event_configurations')
                .select('config_data')
                .eq('event_id', this.selectedEvent.id)
                .eq('config_type', 'dorsal_pattern')
                .maybeSingle();
            
            existingPattern = config?.config_data;
            console.log('📋 Padrão existente carregado:', existingPattern);
        } catch (error) {
            console.warn('⚠️ Erro ao carregar padrão existente:', error);
        }
        
        // Valores padrão ou existentes
        const pattern = existingPattern || {
            type: 'numeric',
            minNumber: 1,
            maxNumber: 999,
            padding: false
        };
        
        // Criar modal para configurar padrão
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔢 Configurar Padrão dos Dorsais</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-btn">&times;</button>
                </div>
                <div style="background: ${existingPattern ? 'rgba(0,255,136,0.1)' : 'rgba(255,165,0,0.1)'}; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <strong style="color: ${existingPattern ? '#00ff88' : '#ffa500'};">
                        ${existingPattern ? '✏️ Editando configuração existente' : '🆕 Criando nova configuração'}
                    </strong>
                    ${existingPattern ? `<br><small style="color: #ccc;">Tipo atual: ${existingPattern.type}</small>` : ''}
                </div>
                <div class="modal-body">
                    <div style="background: rgba(0,255,136,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(0,255,136,0.3);">
                        <h4 style="color: #00ff88; margin-bottom: 10px;">✅ Padrões Ativos no Evento</h4>
                        <p style="color: #ccc; margin-bottom: 15px;">Selecione quais tipos de dorsais este evento deve aceitar:</p>
                        
                        <div class="pattern-toggles">
                            <label class="pattern-toggle">
                                <input type="checkbox" id="enableNumeric" ${pattern.enableNumeric !== false ? 'checked' : ''}>
                                <span class="toggle-content">
                                    <strong>🔢 Números Simples</strong>
                                    <small>Ex: 001, 024, 407 (sempre recomendado)</small>
                                </span>
                            </label>
                            
                            <label class="pattern-toggle">
                                <input type="checkbox" id="enablePrefix" ${pattern.enablePrefix ? 'checked' : ''}>
                                <span class="toggle-content">
                                    <strong>🔤 Prefixo + Número</strong>
                                    <small>Ex: A001, B024, CAT407</small>
                                </span>
                            </label>
                            
                            <label class="pattern-toggle">
                                <input type="checkbox" id="enableMarkers" ${pattern.enableMarkers ? 'checked' : ''}>
                                <span class="toggle-content">
                                    <strong>🎨 Marcadores Visuais</strong>
                                    <small>Ex: -verde 024 -vermelho</small>
                                </span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Configuração Números -->
                    <div id="modalNumericConfig" class="modal-pattern-section" style="background: rgba(0,200,0,0.1); border: 2px solid rgba(0,200,0,0.3);">
                        <h4 style="color: #00ff88; margin-bottom: 15px;">🔢 Configuração de Números</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Número Inicial</label>
                                <input type="number" id="modalNumMin" value="${pattern.minNumber || 1}" min="1" max="9999">
                            </div>
                            <div class="form-group">
                                <label>Número Final</label>
                                <input type="number" id="modalNumMax" value="${pattern.maxNumber || 999}" min="1" max="9999">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="modalNumPadding" ${pattern.padding ? 'checked' : ''}> 
                                <span>Usar zeros à esquerda (ex: 001, 023)</span>
                            </label>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; margin-top: 10px;">
                            <small style="color: #ccc;">Exemplo: 001, 002, 003, ..., 999</small>
                        </div>
                    </div>
                    
                    <!-- Configuração Prefixo -->
                    <div id="modalPrefixConfig" class="modal-pattern-section" style="display: none; background: rgba(0,100,200,0.1); border: 2px solid rgba(0,100,200,0.3);">
                        <h4 style="color: #00ff88; margin-bottom: 15px;">🔤 Configuração de Prefixo</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Prefixo (letras)</label>
                                <input type="text" id="modalPrefix" value="${pattern.prefix || 'A'}" maxlength="5" placeholder="A, B, CAT" style="text-transform: uppercase;">
                            </div>
                            <div class="form-group">
                                <label>Número Máximo</label>
                                <input type="number" id="modalPrefixMax" value="${pattern.maxNumber || 999}" min="1" max="9999">
                            </div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; margin-top: 10px;">
                            <small style="color: #ccc;">Exemplo: A001, A002, A003, ..., A999</small>
                        </div>
                    </div>
                    
                    <!-- Configuração Marcadores -->
                    <div id="modalMarkersConfig" class="modal-pattern-section" style="display: none; background: rgba(200,0,100,0.1); border: 2px solid rgba(200,0,100,0.3);">
                        <h4 style="color: #00ff88; margin-bottom: 15px;">🎨 Configuração de Marcadores Visuais</h4>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>🟢 Símbolo de Início</label>
                                <input type="text" id="modalStartSymbol" value="${pattern.startSymbol || '-'}" maxlength="3" placeholder="-, |, ●">
                            </div>
                            <div class="form-group">
                                <label>🔴 Símbolo de Fim</label>
                                <input type="text" id="modalEndSymbol" value="${pattern.endSymbol || '-'}" maxlength="3" placeholder="-, |, ●">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>🎨 Cor de Início</label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="color" id="modalStartColor" value="${pattern.startColor || '#00ff00'}" style="width: 60px; height: 40px;">
                                    <span style="color: #ccc;">Verde</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>🎨 Cor de Fim</label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="color" id="modalEndColor" value="${pattern.endColor || '#ff0000'}" style="width: 60px; height: 40px;">
                                    <span style="color: #ccc;">Vermelho</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="marker-preview" style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; text-align: center; margin-top: 15px;">
                            <h5 style="color: #00ff88; margin-bottom: 10px;">Exemplo Visual:</h5>
                            <div style="font-size: 1.5rem; font-weight: bold; font-family: 'Courier New', monospace;">
                                <span style="color: #00ff00;">-</span>
                                <span style="color: white; margin: 0 15px;">407</span>
                                <span style="color: #ff0000;">-</span>
                            </div>
                            <small style="color: #999; margin-top: 10px; display: block;">O sistema procura por dorsais com estes marcadores coloridos</small>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn secondary">Cancelar</button>
                        <button onclick="window.eventsManager.savePatternFromModal(this)" class="btn primary">Salvar Padrão</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Adicionar event listeners para toggles
        const patternToggles = modal.querySelectorAll('.pattern-toggle input[type="checkbox"]');
        patternToggles.forEach(toggle => {
            toggle.addEventListener('change', () => {
                console.log('Toggle alterado:', toggle.id, toggle.checked);
                this.updateModalPatternConfig(modal);
            });
        });
        
        // Aguardar um pouco para garantir que o DOM está pronto
        setTimeout(() => {
            this.updateModalPatternConfig(modal);
        }, 100);
    }
    
    updateModalPatternConfig(modal) {
        // Verificar quais padrões estão ativos
        const enableNumeric = modal.querySelector('#enableNumeric')?.checked || false;
        const enablePrefix = modal.querySelector('#enablePrefix')?.checked || false;
        const enableMarkers = modal.querySelector('#enableMarkers')?.checked || false;
        
        console.log('Padrões ativos:', { numeric: enableNumeric, prefix: enablePrefix, markers: enableMarkers });
        
        // Mostrar/esconder seções baseado nos toggles
        const numericSection = modal.querySelector('#modalNumericConfig');
        const prefixSection = modal.querySelector('#modalPrefixConfig');
        const markersSection = modal.querySelector('#modalMarkersConfig');
        
        console.log('Seções encontradas:', {
            numeric: !!numericSection,
            prefix: !!prefixSection,
            markers: !!markersSection
        });
        
        if (numericSection) {
            numericSection.style.display = enableNumeric ? 'block' : 'none';
            numericSection.style.opacity = enableNumeric ? '1' : '0.5';
            console.log('Numérica:', enableNumeric ? 'ativa' : 'inativa');
        }
        
        if (prefixSection) {
            prefixSection.style.display = enablePrefix ? 'block' : 'none';
            prefixSection.style.opacity = enablePrefix ? '1' : '0.5';
            console.log('Prefixo:', enablePrefix ? 'ativa' : 'inativa');
        }
        
        if (markersSection) {
            markersSection.style.display = enableMarkers ? 'block' : 'none';
            markersSection.style.opacity = enableMarkers ? '1' : '0.5';
            console.log('Marcadores:', enableMarkers ? 'ativa' : 'inativa');
        }
        
        // Atualizar texto do botão
        const saveBtn = modal.querySelector('.btn.primary');
        if (saveBtn) {
            const activeCount = [enableNumeric, enablePrefix, enableMarkers].filter(Boolean).length;
            saveBtn.textContent = `Salvar ${activeCount} Padrão${activeCount !== 1 ? 'ões' : ''}`;
        }
    }
    
    async savePatternFromModal(button) {
        try {
            const modal = button.closest('.modal');
            
            // Verificar quais padrões estão ativos
            const enableNumeric = modal.querySelector('#enableNumeric')?.checked || false;
            const enablePrefix = modal.querySelector('#enablePrefix')?.checked || false;
            const enableMarkers = modal.querySelector('#enableMarkers')?.checked || false;
            
            if (!enableNumeric && !enablePrefix && !enableMarkers) {
                alert('❌ Selecione pelo menos um tipo de padrão!');
                return;
            }
            
            let pattern = {
                enableNumeric: enableNumeric,
                enablePrefix: enablePrefix,
                enableMarkers: enableMarkers
            };
            
            let descriptions = [];
            
            // Configuração de números
            if (enableNumeric) {
                const minNum = parseInt(modal.querySelector('#modalNumMin').value) || 1;
                const maxNum = parseInt(modal.querySelector('#modalNumMax').value) || 999;
                const padding = modal.querySelector('#modalNumPadding').checked;
                
                pattern.numeric = {
                    minNumber: minNum,
                    maxNumber: maxNum,
                    padding: padding,
                    digits: 3
                };
                
                descriptions.push(`🔢 Números: ${minNum}-${maxNum}${padding ? ' (com zeros)' : ''}`);
            }
            
            // Configuração de prefixo
            if (enablePrefix) {
                const prefix = modal.querySelector('#modalPrefix').value || 'A';
                const maxNum = parseInt(modal.querySelector('#modalPrefixMax').value) || 999;
                
                pattern.prefix = {
                    prefix: prefix,
                    maxNumber: maxNum
                };
                
                descriptions.push(`🔤 Prefixo: ${prefix}001-${prefix}${maxNum.toString().padStart(3, '0')}`);
            }
            
            // Configuração de marcadores
            if (enableMarkers) {
                const startSymbol = modal.querySelector('#modalStartSymbol').value || '-';
                const endSymbol = modal.querySelector('#modalEndSymbol').value || '-';
                const startColor = modal.querySelector('#modalStartColor').value;
                const endColor = modal.querySelector('#modalEndColor').value;
                
                pattern.markers = {
                    startSymbol: startSymbol,
                    endSymbol: endSymbol,
                    startColor: startColor,
                    endColor: endColor,
                    colorTolerance: 20
                };
                
                descriptions.push(`🎨 Marcadores: ${startSymbol}(verde) NÚMERO ${endSymbol}(vermelho)`);
            }
            
            await this.saveEventConfig('dorsal_pattern', pattern);
            
            const activeCount = descriptions.length;
            alert(`✅ ${activeCount} Padrão${activeCount !== 1 ? 'ões' : ''} salvo${activeCount !== 1 ? 's' : ''}!\n\n${descriptions.join('\n')}\n\nPróximo: Faça upload da foto de referência`);
            
            modal.remove();
            await this.loadEventConfigurations();
            
        } catch (error) {
            alert('Erro ao salvar padrão: ' + error.message);
        }
    }
    
    openAreaDefinitionModal(photoConfig) {
        // Modal para definir área na foto de referência
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>📏 Definir Área do Número</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <p>Clique e arraste para desenhar um retângulo <strong>apenas na área do número ${photoConfig.dorsal_number}</strong>:</p>
                    
                    <div style="position: relative; display: inline-block; margin: 20px 0;">
                        <img id="areaPhoto" src="${photoConfig.image_data}" style="max-width: 80vw; max-height: 60vh; border: 2px solid rgba(255,255,255,0.2); border-radius: 10px;">
                        <canvas id="areaDrawCanvas" style="position: absolute; top: 0; left: 0; cursor: crosshair;"></canvas>
                    </div>
                    
                    <div class="form-actions">
                        <button onclick="window.eventsManager.resetAreaDrawing()" class="btn secondary">Limpar</button>
                        <button onclick="window.eventsManager.confirmAreaFromModal(this)" class="btn primary" disabled id="confirmModalAreaBtn">Confirmar Área</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar canvas quando imagem carregar
        const img = modal.querySelector('#areaPhoto');
        const canvas = modal.querySelector('#areaDrawCanvas');
        
        img.onload = () => {
            canvas.width = img.offsetWidth;
            canvas.height = img.offsetHeight;
            canvas.style.width = img.offsetWidth + 'px';
            canvas.style.height = img.offsetHeight + 'px';
            
            this.setupAreaDrawing(canvas);
        };
    }
    
    setupAreaDrawing(canvas) {
        // Implementar desenho da área (simplificado)
        let drawing = false;
        let startX, startY;
        
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            drawing = true;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!drawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const width = currentX - startX;
            const height = currentY - startY;
            
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, width, height);
            
            document.getElementById('confirmModalAreaBtn').disabled = false;
        });
        
        canvas.addEventListener('mouseup', () => {
            drawing = false;
        });
    }
    
    resetAreaDrawing() {
        const canvas = document.getElementById('areaDrawCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            document.getElementById('confirmModalAreaBtn').disabled = true;
        }
    }
    
    async confirmAreaFromModal(button) {
        try {
            const modal = button.closest('.modal');
            const canvas = modal.querySelector('#areaDrawCanvas');
            const img = modal.querySelector('#areaPhoto');
            
            // Calcular área relativa (implementação simplificada)
            const area = {
                x: 0.3, y: 0.4, width: 0.4, height: 0.3 // Valores de exemplo
            };
            
            await this.saveEventConfig('number_area', area);
            
            alert('✅ Área do número definida!\n\nPróximo: Calibrar parâmetros de IA');
            modal.remove();
            await this.loadEventConfigurations();
            
        } catch (error) {
            alert('Erro ao salvar área: ' + error.message);
        }
    }
    
    async configureDetectionMode() {
        if (!this.selectedEvent) {
            alert('Selecione um evento primeiro');
            return;
        }
        
        try {
            // Carregar configuração atual do evento
            const currentConfig = await this.supabaseClient.getConfiguration(`detection_mode_${this.selectedEvent.id}`);
            
            // Abrir modal
            const modal = document.getElementById('detectionModeModal');
            modal.style.display = 'flex';
            
            // Configurar valores atuais
            if (currentConfig) {
                const modeRadio = document.querySelector(`input[name="detectionMode"][value="${currentConfig.mode}"]`);
                if (modeRadio) {
                    modeRadio.checked = true;
                }
                
                const bufferCheckbox = document.getElementById('bufferModeEnabled');
                if (bufferCheckbox) {
                    bufferCheckbox.checked = currentConfig.bufferMode || false;
                }
            }
            
            // Event listeners do modal
            const closeBtn = document.getElementById('closeDetectionModeModalBtn');
            const cancelBtn = document.getElementById('cancelDetectionModeBtn');
            const saveBtn = document.getElementById('saveDetectionModeBtn');
            
            const closeModal = () => {
                modal.style.display = 'none';
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            saveBtn.addEventListener('click', async () => {
                try {
                    const selectedMode = document.querySelector('input[name="detectionMode"]:checked').value;
                    const bufferMode = document.getElementById('bufferModeEnabled').checked;
                    
                    const config = {
                        mode: selectedMode,
                        bufferMode: bufferMode,
                        updatedAt: new Date().toISOString()
                    };
                    
                    // Salvar configuração
                    await this.supabaseClient.saveConfiguration(`detection_mode_${this.selectedEvent.id}`, config);
                    
                    console.log(`✅ Modo de detecção configurado para evento ${this.selectedEvent.id}:`, config);
                    
                    // Atualizar status das configurações
                    await this.loadEventConfigurations();
                    
                    closeModal();
                    
                    alert(`✅ Modo de detecção configurado: ${selectedMode}${bufferMode ? ' (com buffer)' : ''}`);
                    
                } catch (error) {
                    console.error('❌ Erro ao salvar configuração do modo de detecção:', error);
                    alert('❌ Erro ao salvar configuração');
                }
            });
            
        } catch (error) {
            console.error('❌ Erro ao abrir configuração do modo de detecção:', error);
            alert('❌ Erro ao carregar configuração');
        }
    }
    
    // ===== MÉTODOS DE GESTÃO =====
    
    async clearEventDetections() {
        if (!this.selectedEvent) {
            alert('Selecione um evento primeiro');
            return;
        }
        
        const confirmed = confirm(`⚠️ Tem certeza que deseja apagar TODAS as detecções do evento "${this.selectedEvent.name}"?\n\nEsta ação não pode ser desfeita!`);
        
        if (!confirmed) return;
        
        try {
            console.log(`🗑️ Apagando detecções do evento ${this.selectedEvent.id}...`);
            
            // Apagar detecções do evento
            const { error: detectionsError } = await this.supabaseClient.supabase
                .from('detections')
                .delete()
                .eq('event_id', this.selectedEvent.id);
            
            if (detectionsError) {
                throw new Error(`Erro ao apagar detecções: ${detectionsError.message}`);
            }
            
            // Apagar imagens do buffer do evento
            const { error: bufferError } = await this.supabaseClient.supabase
                .from('image_buffer')
                .delete()
                .eq('event_id', this.selectedEvent.id);
            
            if (bufferError) {
                console.warn('⚠️ Erro ao apagar buffer:', bufferError.message);
            }
            
            console.log('✅ Detecções apagadas com sucesso');
            
            // Atualizar interface
            await this.loadEventDetections();
            this.updateRequestStatus();
            
            alert('✅ Todas as detecções foram apagadas!');
            
        } catch (error) {
            console.error('❌ Erro ao apagar detecções:', error);
            alert(`❌ Erro ao apagar detecções: ${error.message}`);
        }
    }
    
    async clearEventBuffer() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        if (!confirm(`⚠️ Tem certeza que deseja limpar todo o buffer de imagens do evento "${this.selectedEvent.name}"?\n\nIsso irá remover:\n• Todas as imagens pendentes\n• Todas as imagens processadas\n• Todas as imagens descartadas\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Limpando buffer do evento ${this.selectedEvent.id}...`);
            
            // Deletar em lotes para evitar timeout
            const batchSize = 100;
            let deletedTotal = 0;
            let hasMore = true;
            
            while (hasMore) {
                // Buscar IDs em lote
                const { data: records, error: selectError } = await this.supabaseClient.supabase
                    .from('image_buffer')
                    .select('id')
                    .eq('event_id', this.selectedEvent.id)
                    .limit(batchSize);
                
                if (selectError) {
                    throw new Error(`Erro ao buscar registros: ${selectError.message}`);
                }
                
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
                
                if (deleteError) {
                    throw new Error(`Erro ao deletar lote: ${deleteError.message}`);
                }
                
                deletedTotal += records.length;
                console.log(`🗑️ Deletados ${deletedTotal} registros...`);
                
                // Se deletou menos que o lote, não há mais registros
                if (records.length < batchSize) {
                    hasMore = false;
                }
            }
            
            console.log(`✅ Buffer limpo com sucesso! Total: ${deletedTotal} registros`);
            alert(`✅ Buffer de imagens limpo com sucesso! Total: ${deletedTotal} registros`);
            
            // Recarregar dados
            await this.loadEventDetections();
            await this.loadEvents();
            
        } catch (error) {
            console.error('❌ Erro ao limpar buffer:', error);
            alert('❌ Erro ao limpar buffer: ' + error.message);
        }
    }
    
    async removeSelectedDevice() {
        if (!this.selectedEvent) {
            alert('Selecione um evento primeiro');
            return;
        }
        
        // Mostrar lista de dispositivos para seleção
        const devices = await this.getEventDevices();
        if (!devices || devices.length === 0) {
            alert('Nenhum dispositivo encontrado neste evento');
            return;
        }
        
        const deviceList = devices.map((device, index) => 
            `${index + 1}. ${device.device_name || 'Dispositivo sem nome'} (${device.device_type})`
        ).join('\n');
        
        const deviceIndex = prompt(`Selecione o dispositivo para remover:\n\n${deviceList}\n\nDigite o número do dispositivo:`);
        
        if (!deviceIndex || isNaN(deviceIndex)) {
            return;
        }
        
        const selectedDevice = devices[parseInt(deviceIndex) - 1];
        if (!selectedDevice) {
            alert('Dispositivo inválido');
            return;
        }
        
        const confirmed = confirm(`⚠️ Tem certeza que deseja remover o dispositivo "${selectedDevice.device_name}"?\n\nEsta ação não pode ser desfeita!`);
        
        if (!confirmed) return;
        
        try {
            console.log(`🗑️ Removendo dispositivo ${selectedDevice.id}...`);
            
            // Remover associação do evento
            const { error: eventDeviceError } = await this.supabaseClient.supabase
                .from('event_devices')
                .delete()
                .eq('event_id', this.selectedEvent.id)
                .eq('device_id', selectedDevice.id);
            
            if (eventDeviceError) {
                throw new Error(`Erro ao remover dispositivo: ${eventDeviceError.message}`);
            }
            
            console.log('✅ Dispositivo removido com sucesso');
            
            // Atualizar interface
            await this.loadEventDevices();
            await this.loadDeviceLinks();
            
            alert('✅ Dispositivo removido do evento!');
            
        } catch (error) {
            console.error('❌ Erro ao remover dispositivo:', error);
            alert(`❌ Erro ao remover dispositivo: ${error.message}`);
        }
    }
    
    async getEventDevices() {
        if (!this.selectedEvent) {
            return [];
        }
        
        try {
            const { data: eventDevices, error } = await this.supabaseClient.supabase
                .from('event_devices')
                .select(`
                    device_id,
                    devices!inner(
                        id,
                        device_name,
                        device_type,
                        last_seen
                    )
                `)
                .eq('event_id', this.selectedEvent.id);
            
            if (error) {
                console.error('❌ Erro ao carregar dispositivos do evento:', error);
                return [];
            }
            
            return eventDevices?.map(ed => ed.devices) || [];
        } catch (error) {
            console.error('❌ Erro na conexão ao carregar dispositivos:', error);
            return [];
        }
    }
    
    async loadDeviceLinks() {
        if (!this.selectedEvent) {
            this.deviceLinksList.innerHTML = '<p style="color: #ff6b35;">Selecione um evento primeiro</p>';
            return;
        }
        
        try {
            const devices = await this.getEventDevices();
            
            if (!devices || devices.length === 0) {
                this.deviceLinksList.innerHTML = '<p style="color: #ff6b35;">Nenhum dispositivo encontrado</p>';
                return;
            }
            
            // Obter URL base
            const baseUrl = window.location.origin;
            
            const linksHtml = devices.map(device => {
                const detectionUrl = `${baseUrl}/detection?event=${this.selectedEvent.id}&device=${device.id}`;
                
                return `
                    <div class="device-link-item">
                        <div class="device-link-info">
                            <div class="device-link-name">${device.device_name}</div>
                            <div class="device-link-url">${detectionUrl}</div>
                        </div>
                        <div class="device-link-actions">
                            <button class="device-link-btn copy" onclick="navigator.clipboard.writeText('${detectionUrl}'); alert('Link copiado!')">
                                📋 Copiar
                            </button>
                            <button class="device-link-btn open" onclick="window.open('${detectionUrl}', '_blank')">
                                🔗 Abrir
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            this.deviceLinksList.innerHTML = linksHtml;
            
        } catch (error) {
            console.error('❌ Erro ao carregar links de dispositivos:', error);
            this.deviceLinksList.innerHTML = '<p style="color: #ff6b35;">Erro ao carregar links</p>';
        }
    }
    
    clearGeminiQueue() {
        if (window.geminiQueue) {
            const confirmed = confirm('⚠️ Tem certeza que deseja limpar a fila de requisições Gemini?\n\nTodas as requisições pendentes serão canceladas!');
            
            if (confirmed) {
                window.geminiQueue.clearQueue();
                this.updateRequestStatus();
                alert('✅ Fila limpa com sucesso!');
            }
        } else {
            alert('❌ Sistema de fila não disponível');
        }
    }
    
    updateRequestStatus() {
        if (!window.geminiQueue) {
            // Se não há fila, mostrar zeros
            this.queueLength.textContent = '0';
            this.processingCount.textContent = '0';
            this.completedCount.textContent = '0';
            this.errorCount.textContent = '0';
            return;
        }
        
        const status = window.geminiQueue.getStatus();
        
        this.queueLength.textContent = status.queueLength;
        this.processingCount.textContent = status.processing ? '1' : '0';
        
        // Para contadores de concluídas e erros, precisaríamos implementar
        // um sistema de tracking mais avançado na fila
        this.completedCount.textContent = '0'; // TODO: Implementar contador
        this.errorCount.textContent = '0'; // TODO: Implementar contador
        
        console.log('📊 Status atualizado:', status);
    }
    
    // Iniciar atualização automática do status
    startStatusUpdates() {
        // Atualizar status a cada 2 segundos
        setInterval(() => {
            if (this.selectedEvent) {
                this.updateRequestStatus();
            }
        }, 2000);
    }
    
    // ===== SISTEMA DE TIMING =====
    
    async startEvent(isAutoStart = false) {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        if (!isAutoStart && !confirm(`🚀 Iniciar evento "${this.selectedEvent.name}"?\n\nA partir de agora, todos os dorsais detectados começarão a contar tempo.`)) {
            return;
        }
        
        try {
            const now = new Date().toISOString();
            
            const { error } = await this.supabaseClient.supabase
                .from('events')
                .update({
                    event_started_at: now,
                    is_active: true,
                    status: 'active'
                })
                .eq('id', this.selectedEvent.id);
            
            if (error) {
                throw new Error(`Erro ao iniciar evento: ${error.message}`);
            }
            
            console.log('✅ Evento iniciado:', now);
            alert('🚀 Evento iniciado com sucesso!');
            
            // Atualizar interface
            this.selectedEvent.event_started_at = now;
            this.selectedEvent.is_active = true;
            this.updateTimingDisplay();
            this.updateTimingButtons();
            
        } catch (error) {
            console.error('❌ Erro ao iniciar evento:', error);
            alert('❌ Erro ao iniciar evento: ' + error.message);
        }
    }
    
    async stopEvent() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        if (!confirm(`⏹️ Parar evento "${this.selectedEvent.name}"?\n\nNão será possível mais detectar dorsais.`)) {
            return;
        }
        
        try {
            const now = new Date().toISOString();
            
            const { error } = await this.supabaseClient.supabase
                .from('events')
                .update({
                    event_ended_at: now,
                    is_active: false,
                    status: 'completed'
                })
                .eq('id', this.selectedEvent.id);
            
            if (error) {
                throw new Error(`Erro ao parar evento: ${error.message}`);
            }
            
            console.log('✅ Evento parado:', now);
            alert('⏹️ Evento parado com sucesso!');
            
            // Atualizar interface
            this.selectedEvent.event_ended_at = now;
            this.selectedEvent.is_active = false;
            this.updateTimingDisplay();
            this.updateTimingButtons();
            
        } catch (error) {
            console.error('❌ Erro ao parar evento:', error);
            alert('❌ Erro ao parar evento: ' + error.message);
        }
    }
    
    async resetEvent() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        if (!confirm(`🔄 Resetar evento "${this.selectedEvent.name}"?\n\nIsso irá:\n• Parar o cronômetro\n• Limpar todas as classificações\n• Permitir reiniciar o evento\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }
        
        try {
            // Parar evento
            const { error: stopError } = await this.supabaseClient.supabase
                .from('events')
                .update({
                    event_started_at: null,
                    event_ended_at: null,
                    is_active: false,
                    status: 'draft'
                })
                .eq('id', this.selectedEvent.id);
            
            if (stopError) {
                throw new Error(`Erro ao resetar evento: ${stopError.message}`);
            }
            
            // Limpar classificações
            const { error: clearError } = await this.supabaseClient.supabase
                .from('classifications')
                .delete()
                .eq('event_id', this.selectedEvent.id);
            
            if (clearError) {
                console.warn('⚠️ Erro ao limpar classificações:', clearError);
            }
            
            console.log('✅ Evento resetado');
            alert('🔄 Evento resetado com sucesso!');
            
            // Atualizar interface
            this.selectedEvent.event_started_at = null;
            this.selectedEvent.event_ended_at = null;
            this.selectedEvent.is_active = false;
            this.updateTimingDisplay();
            this.updateTimingButtons();
            
        } catch (error) {
            console.error('❌ Erro ao resetar evento:', error);
            alert('❌ Erro ao resetar evento: ' + error.message);
        }
    }
    
    updateTimingDisplay() {
        if (!this.selectedEvent) return;
        
        // Status
        if (this.selectedEvent.is_active) {
            this.eventTimingStatus.textContent = 'Ativo';
            this.eventTimingStatus.style.color = '#00ff88';
        } else if (this.selectedEvent.event_ended_at) {
            this.eventTimingStatus.textContent = 'Finalizado';
            this.eventTimingStatus.style.color = '#ff6b35';
        } else {
            this.eventTimingStatus.textContent = 'Não iniciado';
            this.eventTimingStatus.style.color = '#ccc';
        }
        
        // Hora configurada
        if (this.selectedEvent.scheduled_start_time) {
            const scheduledTime = new Date(this.selectedEvent.scheduled_start_time);
            this.eventScheduledTime.textContent = scheduledTime.toLocaleString('pt-BR');
        } else {
            this.eventScheduledTime.textContent = '--:--';
        }
        
        // Hora de início real
        if (this.selectedEvent.event_started_at) {
            const startTime = new Date(this.selectedEvent.event_started_at);
            this.eventStartTime.textContent = startTime.toLocaleString('pt-BR');
        } else {
            this.eventStartTime.textContent = '--:--';
        }
        
        // Duração
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
        
        // Próximo início (se não iniciado e tem horário configurado)
        if (!this.selectedEvent.event_started_at && this.selectedEvent.scheduled_start_time) {
            const scheduledTime = new Date(this.selectedEvent.scheduled_start_time);
            const now = new Date();
            
            if (scheduledTime > now) {
                const timeUntil = scheduledTime - now;
                const hours = Math.floor(timeUntil / 3600000);
                const minutes = Math.floor((timeUntil % 3600000) / 60000);
                
                this.nextStartTime.textContent = `Em ${hours}h ${minutes}m`;
                this.nextStartTime.style.color = '#ffc107';
            } else {
                this.nextStartTime.textContent = 'Já deveria ter iniciado';
                this.nextStartTime.style.color = '#ff6b35';
            }
        } else {
            this.nextStartTime.textContent = '--:--';
            this.nextStartTime.style.color = '#ccc';
        }
    }
    
    updateTimingButtons() {
        if (!this.selectedEvent) {
            this.startEventBtn.disabled = true;
            this.stopEventBtn.disabled = true;
            this.resetEventBtn.disabled = true;
            return;
        }
        
        const isActive = this.selectedEvent.is_active;
        const hasStarted = this.selectedEvent.event_started_at;
        
        this.startEventBtn.disabled = isActive || hasStarted;
        this.stopEventBtn.disabled = !isActive;
        this.resetEventBtn.disabled = !hasStarted;
    }
    
    async loadDeviceSequence() {
        if (!this.selectedEvent) return;
        
        try {
            // Buscar dispositivos do evento
            const { data: devices, error } = await this.supabaseClient.supabase
                .from('event_devices')
                .select(`
                    device_id,
                    devices!inner(
                        id,
                        device_name,
                        device_type
                    )
                `)
                .eq('event_id', this.selectedEvent.id);
            
            if (error) {
                console.error('❌ Erro ao carregar dispositivos:', error);
                return;
            }
            
            // Se não há dispositivos, mostrar mensagem
            if (!devices || devices.length === 0) {
                this.deviceSequenceList.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 20px;">
                        📱 Nenhum dispositivo associado<br>
                        <small>Adicione dispositivos primeiro</small>
                    </div>
                `;
                return;
            }
            
            // Ordenar dispositivos (se já tiver sequência salva)
            let deviceSequence = this.selectedEvent.device_sequence || [];
            if (deviceSequence.length === 0) {
                // Criar sequência padrão
                deviceSequence = devices.map((ed, index) => ({
                    order: index + 1,
                    device_id: ed.device_id,
                    device_name: ed.devices.device_name,
                    is_meta: index === devices.length - 1
                }));
            }
            
            // Renderizar sequência
            this.deviceSequenceList.innerHTML = deviceSequence.map(item => `
                <div class="sequence-item ${item.is_meta ? 'sequence-meta' : ''}">
                    <div class="sequence-order">${item.order}</div>
                    <div class="sequence-device">
                        ${item.device_name || `Dispositivo ${item.device_id}`}
                        ${item.is_meta ? ' (META)' : ''}
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('❌ Erro ao carregar sequência:', error);
            this.deviceSequenceList.innerHTML = '<p style="color: #ff6b35;">Erro ao carregar sequência</p>';
        }
    }
    
    async editDeviceSequence() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        // TODO: Implementar modal para editar sequência
        alert('✏️ Funcionalidade de edição de sequência será implementada em breve!');
    }
    
    // ===== CONFIGURAÇÃO DE TIMING =====
    
    async saveTimingConfig() {
        if (!this.selectedEvent) {
            alert('⚠️ Selecione um evento primeiro');
            return;
        }
        
        const date = this.eventDate.value;
        const time = this.eventTime.value;
        const autoStart = this.autoStartEnabled.checked;
        
        if (!date || !time) {
            alert('⚠️ Preencha data e hora');
            return;
        }
        
        try {
            const scheduledStartTime = new Date(`${date}T${time}`).toISOString();
            
            const { error } = await this.supabaseClient.supabase
                .from('events')
                .update({
                    scheduled_start_time: scheduledStartTime,
                    auto_start_enabled: autoStart
                })
                .eq('id', this.selectedEvent.id);
            
            if (error) {
                throw new Error(`Erro ao salvar configuração: ${error.message}`);
            }
            
            console.log('✅ Configuração de timing salva:', scheduledStartTime);
            alert('✅ Configuração de timing salva com sucesso!');
            
            // Atualizar evento local
            this.selectedEvent.scheduled_start_time = scheduledStartTime;
            this.selectedEvent.auto_start_enabled = autoStart;
            
            // Atualizar display
            this.updateTimingDisplay();
            
            // Iniciar monitoramento se auto-start ativo
            if (autoStart && !this.selectedEvent.event_started_at) {
                this.startAutoStartMonitoring();
            }
            
        } catch (error) {
            console.error('❌ Erro ao salvar configuração:', error);
            alert('❌ Erro ao salvar configuração: ' + error.message);
        }
    }
    
    loadTimingConfig() {
        if (!this.selectedEvent) return;
        
        // Carregar configuração salva
        if (this.selectedEvent.scheduled_start_time) {
            const scheduledTime = new Date(this.selectedEvent.scheduled_start_time);
            this.eventDate.value = scheduledTime.toISOString().split('T')[0];
            this.eventTime.value = scheduledTime.toTimeString().split(' ')[0].substring(0, 5);
        } else {
            // Valores padrão (hoje, agora + 1 hora)
            const tomorrow = new Date();
            tomorrow.setHours(tomorrow.getHours() + 1);
            this.eventDate.value = tomorrow.toISOString().split('T')[0];
            this.eventTime.value = tomorrow.toTimeString().split(' ')[0].substring(0, 5);
        }
        
        this.autoStartEnabled.checked = this.selectedEvent.auto_start_enabled !== false;
    }
    
    startAutoStartMonitoring() {
        // Limpar monitoramento anterior
        if (this.autoStartInterval) {
            clearInterval(this.autoStartInterval);
        }
        
        if (!this.selectedEvent?.auto_start_enabled || this.selectedEvent?.event_started_at) {
            return;
        }
        
        console.log('🕐 Iniciando monitoramento de início automático...');
        
        this.autoStartInterval = setInterval(() => {
            if (!this.selectedEvent?.scheduled_start_time || this.selectedEvent?.event_started_at) {
                clearInterval(this.autoStartInterval);
                return;
            }
            
            const scheduledTime = new Date(this.selectedEvent.scheduled_start_time);
            const now = new Date();
            
            // Verificar se é hora de iniciar (com tolerância de 1 minuto)
            if (now >= scheduledTime && (now - scheduledTime) < 60000) {
                console.log('🚀 Iniciando evento automaticamente...');
                this.startEvent(true); // true = início automático
            }
        }, 10000); // Verificar a cada 10 segundos
    }
    
    stopAutoStartMonitoring() {
        if (this.autoStartInterval) {
            clearInterval(this.autoStartInterval);
            this.autoStartInterval = null;
            console.log('🛑 Monitoramento de início automático parado');
        }
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.eventsManager = new VisionKronoEvents();
});
