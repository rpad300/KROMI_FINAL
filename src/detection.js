class VisionKronoDetection {
    constructor() {
        this.stream = null;
        this.isDetecting = false;
        this.detections = [];
        this.currentPosition = null;
        this.apiKey = null;
        this.totalDetected = 0;
        this.panelOpen = false;
        this.supabaseClient = new SupabaseClient();
        this.eventId = null;
        this.deviceId = null;
        this.detectionMode = 'gemini'; // Padrão agora é Gemini
        this.bufferMode = true; // Modo buffer ativo
        
        // Configurações carregadas da calibração
        this.numberArea = null;
        this.calibrationData = null;
        this.dorsalPattern = null;
        
        // Sistema de captura contínua para buffer
        this.continuousCapture = {
            enabled: false,
            interval: null,
            captureFrequency: 2000, // Capturar a cada 2 segundos
            lastCaptureTime: 0,
            bufferQueue: [],
            isUploading: false
        };
        
        // Sistema de buffer offline
        this.offlineBuffer = {
            enabled: true,
            storageKey: 'visionkrono_offline_buffer',
            maxRetries: 3,
            retryDelay: 5000, // 5 segundos
            syncInterval: null,
            isOnline: navigator.onLine,
            pendingDetections: [],
            syncInProgress: false
        };
        
        // Controles de câmera e som
        this.cameraControls = {
            facingMode: 'environment', // 'user' (frontal) ou 'environment' (traseira)
            flashEnabled: false,
            soundEnabled: true,
            audioContext: null,
            beepSound: null
        };
        
        // Sistema de processamento em background
        this.backgroundProcessor = {
            enabled: false,
            interval: null,
            batchSize: 5,
            processingFrequency: 10000 // Processar a cada 10 segundos
        };
        
        // Controlo de números já detectados
        this.detectedNumbers = new Set(); // Para evitar duplicatas
        
        this.motionCanvas = document.createElement('canvas');
        this.motionCtx = this.motionCanvas.getContext('2d');
        
        this.init();
    }
    
    async init() {
        try {
            this.checkUrlParameters();
            this.initOfflineBuffer();
            this.initCameraControls();
            this.setupElements();
            this.setupEventListeners();
            await this.initSupabase();
            await this.loadConfigurations();
            await this.requestCameraAccess();
            await this.getCurrentLocation();
            await this.registerDevice();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showError('Erro na inicialização', error.message);
        } finally {
            this.hideLoading();
            // Carregar modo de detecção salvo
            this.loadDetectionMode();
            // Debug: verificar se elementos estão visíveis
            console.log('📱 Debug interface:');
            console.log('  - Câmera:', this.video.style.display, 'Z-index:', getComputedStyle(this.video).zIndex);
            console.log('  - Overlay:', this.video.offsetWidth, 'x', this.video.offsetHeight);
        }
    }
    
    loadDetectionMode() {
        const savedMode = localStorage.getItem('visionkrono_detection_mode');
        if (savedMode && ['google', 'ocr', 'qr'].includes(savedMode)) {
            this.detectionMode = savedMode;
        }
        
        // Atualizar botão
        const modeLabels = {
            google: '🤖 Google',
            ocr: '📝 OCR',
            qr: '📱 QR+AI'
        };
        
        const modeColors = {
            google: '',
            ocr: 'native',
            qr: 'qr'
        };
        
        if (this.toggleOcrBtn) {
            this.toggleOcrBtn.textContent = modeLabels[this.detectionMode];
            this.toggleOcrBtn.className = `ocr-toggle ${modeColors[this.detectionMode]}`;
        }
        
        console.log(`🔄 Modo de detecção carregado: ${this.detectionMode}`);
    }
    
    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.eventId = urlParams.get('event');
        this.deviceId = urlParams.get('device');
        
        console.log('🔗 Parâmetros URL:');
        console.log('  - Event ID:', this.eventId || 'Não especificado');
        console.log('  - Device ID:', this.deviceId || 'Não especificado');
        
        // Validar se event_id foi fornecido
        if (!this.eventId) {
            console.error('❌ ATENÇÃO: event_id não especificado na URL!');
            console.warn('⚠️ As detecções serão salvas SEM event_id associado!');
            console.info('💡 Use o link correto: /detection?event=<ID_DO_EVENTO>&device=<ID_DO_DISPOSITIVO>');
            
            // Mostrar aviso na tela
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff3b30;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            warning.innerHTML = `
                ⚠️ AVISO: Esta página deve ser acessada através do link específico do evento!<br>
                <small>As detecções não serão associadas a nenhum evento.</small>
            `;
            document.body.appendChild(warning);
        }
        
        if (this.eventId) {
            document.title = 'VisionKrono - Detecção para Evento';
        }
    }
    
    async registerDevice() {
        if (!this.eventId || !this.deviceId) {
            console.log('⚠️ Evento ou dispositivo não especificado - modo standalone');
            return;
        }
        
        try {
            // Atualizar last_seen do dispositivo
            const { error } = await this.supabaseClient.supabase
                .from('devices')
                .update({ 
                    last_seen: new Date().toISOString(),
                    user_agent: navigator.userAgent
                })
                .eq('id', this.deviceId);
            
            if (error) {
                console.warn('Aviso ao atualizar dispositivo:', error.message);
            } else {
                console.log('✅ Dispositivo registado no evento');
            }
            
        } catch (error) {
            console.warn('Aviso ao registar dispositivo:', error.message);
        }
    }
    
    async initSupabase() {
        try {
            await this.supabaseClient.init();
            console.log('📊 Sistema de base de dados inicializado');
        } catch (error) {
            console.warn('⚠️ Supabase não disponível, usando localStorage:', error.message);
        }
    }
    
    setupElements() {
        this.video = document.getElementById('cameraStream');
        this.canvas = document.getElementById('captureCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.togglePanelBtn = document.getElementById('togglePanelBtn');
        this.status = document.getElementById('status');
        this.totalDetectedEl = document.getElementById('totalDetected');
        this.detectionsList = document.getElementById('detectionsList');
        this.detectionPanel = document.getElementById('detectionPanel');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorOverlay = document.getElementById('errorOverlay');
        this.errorMessage = document.getElementById('errorMessage');
        this.openCalibrationBtn = document.getElementById('openCalibrationBtn');
        
        // Controles de câmera e som
        this.cameraToggleBtn = document.getElementById('cameraToggleBtn');
        this.flashToggleBtn = document.getElementById('flashToggleBtn');
        this.soundToggleBtn = document.getElementById('soundToggleBtn');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startDetection());
        this.stopBtn.addEventListener('click', () => this.stopDetection());
        this.downloadBtn.addEventListener('click', () => this.downloadRecords());
        this.togglePanelBtn.addEventListener('click', () => this.togglePanel());
        this.openCalibrationBtn.addEventListener('click', () => this.openCalibrationPage());
        
        // Controles de câmera e som
        this.cameraToggleBtn.addEventListener('click', () => this.toggleCamera());
        this.flashToggleBtn.addEventListener('click', () => this.toggleFlash());
        this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
        
        // Atualizar localização periodicamente
        setInterval(() => this.getCurrentLocation(), 30000);
    }
    
    async loadConfigurations() {
        console.log('📋 Carregando configurações...');
        
        // Carregar API Key
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            console.log('🔧 Configuração do servidor:', config);
            
            if (config.GOOGLE_VISION_API_KEY) {
                this.apiKey = config.GOOGLE_VISION_API_KEY;
                console.log('✅ API Key carregada');
            } else {
                throw new Error('API Key não configurada');
            }
        } catch (error) {
            throw new Error('Erro ao carregar API Key: ' + error.message);
        }
        
        // Carregar configurações do Supabase (com fallback para localStorage)
        console.log('🔄 Carregando configurações compartilhadas...');
        console.log('📊 Status Supabase:', this.supabaseClient.isConnected ? 'CONECTADO' : 'DESCONECTADO');
        console.log('🏃‍♂️ Event ID:', this.eventId || 'Não especificado');
        
        // Se tem event ID, tentar carregar configurações do evento
        if (this.eventId && this.supabaseClient.isConnected) {
            console.log('📋 Carregando configurações do evento...');
            
            try {
                const { data: eventConfigs, error } = await this.supabaseClient.supabase
                    .from('event_configurations')
                    .select('config_type, config_data')
                    .eq('event_id', this.eventId);
                
                if (error) {
                    console.warn('⚠️ Erro ao carregar configurações do evento:', error);
                } else {
                    console.log('📊 Configurações do evento:', eventConfigs);
                    
                    // Processar configurações do evento
                    eventConfigs?.forEach(config => {
                        if (config.config_type === 'number_area') {
                            this.numberArea = config.config_data;
                        } else if (config.config_type === 'calibration') {
                            this.calibrationData = config.config_data;
                        } else if (config.config_type === 'dorsal_pattern') {
                            this.dorsalPattern = config.config_data;
                        }
                    });
                }
            } catch (error) {
                console.warn('⚠️ Erro ao buscar configurações do evento:', error);
            }
        }
        
        // Fallbacks para localStorage se não carregou do evento
        if (!this.numberArea) {
            this.numberArea = await this.supabaseClient.getConfiguration('number_area');
            console.log('📏 Área do número (global):', this.numberArea);
            
            if (!this.numberArea) {
                const localArea = localStorage.getItem('visionkrono_number_area');
                if (localArea) {
                    this.numberArea = JSON.parse(localArea);
                    console.log('📂 Área carregada do localStorage:', this.numberArea);
                }
            }
        }
        
        if (!this.calibrationData) {
            this.calibrationData = await this.supabaseClient.getConfiguration('calibration');
            console.log('🔧 Calibração (global):', this.calibrationData);
            
            if (!this.calibrationData) {
                const localCalibration = localStorage.getItem('visionkrono_calibration');
                if (localCalibration) {
                    this.calibrationData = JSON.parse(localCalibration);
                    console.log('📂 Calibração carregada do localStorage:', this.calibrationData);
                } else {
                    // Usar calibração padrão
                    this.calibrationData = {
                        contrast: 1.5,
                        threshold: 120,
                        expectedNumbers: [407] // Número de exemplo
                    };
                    console.log('📂 Usando calibração padrão');
                }
            }
        }
        
        if (!this.dorsalPattern) {
            this.dorsalPattern = await this.supabaseClient.getConfiguration('dorsal_pattern');
            console.log('🔢 Padrão dos dorsais (global):', this.dorsalPattern);
            
            if (!this.dorsalPattern) {
                this.dorsalPattern = {
                    type: 'numeric',
                    minNumber: 1,
                    maxNumber: 9999,
                    padding: false,
                    digits: 3
                };
                console.log('📂 Usando padrão padrão dos dorsais');
            }
        }
        
        // Verificar se tem configurações mínimas
        if (!this.numberArea) {
            throw new Error('❌ Área do número não definida.\n\nConfigure no desktop primeiro:\n1. Acesse /events\n2. Configure o evento\n3. Defina área do número');
        }
        
            this.updateStatus('✅ Configurações carregadas - Pronto para detectar');
        console.log('🎉 Todas as configurações carregadas com sucesso');
    }

    async waitForCameraAvailability() {
        const maxWait = 10000; // 10 segundos
        const checkInterval = 500; // 500ms
        let waited = 0;
        
        while (waited < maxWait) {
            if (!window.independentLiveStream || !window.independentLiveStream.liveStream) {
                console.log('✅ Câmera disponível para detecção');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        console.log('⚠️ Timeout aguardando câmera - tentando mesmo assim');
    }
    
    async requestCameraAccess() {
        try {
            this.updateStatus('Solicitando acesso à câmera...');
            
            // Verificar se Live Stream já está usando a câmera
            if (window.independentLiveStream && window.independentLiveStream.liveStream) {
                console.log('⚠️ Live Stream já está usando a câmera - aguardando...');
                await this.waitForCameraAvailability();
            }
            
            const constraints = {
                video: {
                    facingMode: this.cameraControls.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            console.log(`📹 Câmera DETECÇÃO: ${this.stream.getVideoTracks()[0].getSettings().width}x${this.stream.getVideoTracks()[0].getSettings().height}`);
            
            // Notificar Live Stream que detecção está usando a câmera
            if (window.independentLiveStream) {
                window.independentLiveStream.detectionStream = this.stream;
                console.log('📡 Stream de detecção compartilhado com Live Stream');
            }
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.motionCanvas.width = this.video.videoWidth;
                this.motionCanvas.height = this.video.videoHeight;
                console.log(`📹 Câmera: ${this.video.videoWidth}x${this.video.videoHeight}`);
            });
            
            this.updateStatus('Câmera ativa');
        } catch (error) {
            throw new Error('Erro ao acessar câmera: ' + error.message);
        }
    }
    
    async getCurrentLocation() {
        if (!navigator.geolocation) return;
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });
            
            this.currentPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            console.log('📍 GPS obtido:', this.currentPosition);
        } catch (error) {
            console.warn('Erro ao obter GPS:', error);
        }
    }
    
    async startDetection() {
        this.isDetecting = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        document.body.classList.add('detection-active');
        
        if (this.bufferMode) {
            // Modo buffer: captura contínua + processamento em background
            this.updateStatus('📸 Capturando imagens para buffer...');
            this.startContinuousCapture();
            this.startBackgroundProcessor();
        } else {
            // Modo antigo: detecção em tempo real
            this.updateStatus('🔍 Detectando dorsais em tempo real...');
            this.startRealtimeDetection();
        }
        
        console.log(`🎬 Detecção iniciada (modo: ${this.bufferMode ? 'buffer' : 'tempo real'})`);
    }
    
    startContinuousCapture() {
        this.continuousCapture.enabled = true;
        
        // Capturar imagem a cada X segundos
        this.continuousCapture.interval = setInterval(() => {
            this.captureToBuffer();
        }, this.continuousCapture.captureFrequency);
        
        console.log('📸 Captura contínua iniciada');
    }
    
    startBackgroundProcessor() {
        this.backgroundProcessor.enabled = true;
        
        console.log('ℹ️ Modo buffer ativado - imagens serão enviadas para processamento independente');
        console.log('📋 Acesse /image-processor para processar as imagens');
        
        // Não processar aqui - deixar para o processador independente
        // Apenas marcar como ativo para controle de estado
    }
    
    startRealtimeDetection() {
        // Sistema antigo para compatibilidade
        this.motionDetection.enabled = true;
        this.motionDetection.previousFrame = null;
        this.motionDetection.lastMotionTime = 0;
        
        this.detectionInterval = setInterval(() => {
            this.detectMotionAndCapture();
        }, 100);
    }
    
    async captureToBuffer() {
        if (!this.continuousCapture.enabled || !this.video.videoWidth || this.continuousCapture.isUploading) {
            return;
        }
        
        try {
            // Capturar e otimizar imagem
            const optimizedImages = await this.captureOptimizedImages();
            
            const now = new Date();
            
            // Criar entrada do buffer com imagens otimizadas
            const bufferEntry = {
                event_id: this.eventId,
                device_id: this.deviceId,
                session_id: this.supabaseClient.getSessionId(),
                image_data: optimizedImages.aiVersion, // Versão para IA (comprimida)
                image_metadata: {
                    ai_version_size: optimizedImages.aiSize,
                    display_version_size: optimizedImages.displaySize,
                    original_dimensions: optimizedImages.originalDimensions,
                    compression_ratio: optimizedImages.compressionRatio,
                    device_type: 'mobile'
                },
                display_image: optimizedImages.displayVersion, // Versão para visualização
                captured_at: now.toISOString(),
                latitude: this.currentPosition?.latitude || null,
                longitude: this.currentPosition?.longitude || null,
                accuracy: this.currentPosition?.accuracy || null,
                status: 'pending'
            };
            
            // Salvar no buffer do Supabase
            await this.saveToBuffer(bufferEntry);
            
            const bufferCount = await this.getBufferCount();
            this.updateStatus(`📸 Buffer: ${bufferCount} imagens aguardando`);
            
        } catch (error) {
            console.error('❌ Erro ao capturar para buffer:', error);
        }
    }
    
    async saveToBuffer(bufferEntry) {
        // Se offline ou Supabase desconectado, usar buffer offline
        if (!this.offlineBuffer.isOnline || !this.supabaseClient.isConnected) {
            console.log('📱 Modo offline - salvando no buffer local');
            this.addToOfflineBuffer(bufferEntry);
            return;
        }
        
        try {
            this.continuousCapture.isUploading = true;
            
            const { data, error } = await this.supabaseClient.supabase
                .from('image_buffer')
                .insert([bufferEntry])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Erro ao salvar no buffer:', error);
                // Se falhou, tentar buffer offline como fallback
                console.log('📱 Fallback para buffer offline');
                this.addToOfflineBuffer(bufferEntry);
            } else {
                console.log(`📸 Imagem salva no buffer: ${data.id}`);
            }
            
        } catch (error) {
            console.error('❌ Erro na conexão buffer:', error);
            // Se falhou, tentar buffer offline como fallback
            console.log('📱 Fallback para buffer offline');
            this.addToOfflineBuffer(bufferEntry);
        } finally {
            this.continuousCapture.isUploading = false;
        }
    }
    
    async getBufferCount() {
        try {
            let query = this.supabaseClient.supabase
                .from('image_buffer')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            // Só adicionar filtro de event_id se existir
            if (this.eventId) {
                query = query.eq('event_id', this.eventId);
            }
            
            const { count, error } = await query;
            
            return count || 0;
        } catch (error) {
            console.warn('⚠️ Erro ao contar buffer:', error);
            return 0;
        }
    }
    
    // Método removido - processamento agora é feito pelo processador independente
    // Acesse /image-processor para processar as imagens do buffer
    
    async captureOptimizedImages() {
        return new Promise((resolve) => {
            // Canvas original (alta qualidade)
            const originalCanvas = document.createElement('canvas');
            const originalCtx = originalCanvas.getContext('2d');
            originalCanvas.width = this.video.videoWidth;
            originalCanvas.height = this.video.videoHeight;
            originalCtx.drawImage(this.video, 0, 0, originalCanvas.width, originalCanvas.height);
            
            // Versão para IA (otimizada para processamento)
            const aiCanvas = document.createElement('canvas');
            const aiCtx = aiCanvas.getContext('2d');
            
            // Redimensionar para IA (máximo 1024px na maior dimensão)
            const maxAIDimension = 1024;
            const scale = Math.min(maxAIDimension / originalCanvas.width, maxAIDimension / originalCanvas.height, 1);
            
            aiCanvas.width = Math.round(originalCanvas.width * scale);
            aiCanvas.height = Math.round(originalCanvas.height * scale);
            
            // Usar algoritmo de redimensionamento de alta qualidade
            aiCtx.imageSmoothingEnabled = true;
            aiCtx.imageSmoothingQuality = 'high';
            aiCtx.drawImage(originalCanvas, 0, 0, aiCanvas.width, aiCanvas.height);
            
            // Aplicar otimizações para IA
            this.optimizeForAI(aiCtx, aiCanvas.width, aiCanvas.height);
            
            // Versão para visualização (menor mas ainda legível)
            const displayCanvas = document.createElement('canvas');
            const displayCtx = displayCanvas.getContext('2d');
            
            // Redimensionar para display (máximo 800px)
            const maxDisplayDimension = 800;
            const displayScale = Math.min(maxDisplayDimension / originalCanvas.width, maxDisplayDimension / originalCanvas.height, 1);
            
            displayCanvas.width = Math.round(originalCanvas.width * displayScale);
            displayCanvas.height = Math.round(originalCanvas.height * displayScale);
            
            displayCtx.imageSmoothingEnabled = true;
            displayCtx.imageSmoothingQuality = 'high';
            displayCtx.drawImage(originalCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
            
            // Gerar imagens finais com melhor compressão
            const aiVersion = this.generateOptimizedImage(aiCanvas, 'ai');
            const displayVersion = this.generateOptimizedImage(displayCanvas, 'display');
            
            // Calcular tamanhos e compressão
            const originalSize = this.getBase64Size(originalCanvas.toDataURL('image/jpeg', 0.95));
            const aiSize = this.getBase64Size(aiVersion);
            const displaySize = this.getBase64Size(displayVersion);
            
            const compressionRatio = ((originalSize - aiSize) / originalSize * 100).toFixed(1);
            
            console.log(`📸 Otimização de imagem:`);
            console.log(`  Original: ${originalCanvas.width}x${originalCanvas.height} (${(originalSize/1024).toFixed(1)}KB)`);
            console.log(`  IA: ${aiCanvas.width}x${aiCanvas.height} (${(aiSize/1024).toFixed(1)}KB)`);
            console.log(`  Display: ${displayCanvas.width}x${displayCanvas.height} (${(displaySize/1024).toFixed(1)}KB)`);
            console.log(`  Compressão: ${compressionRatio}%`);
            
            resolve({
                aiVersion: aiVersion,
                displayVersion: displayVersion,
                aiSize: aiSize,
                displaySize: displaySize,
                originalDimensions: { width: originalCanvas.width, height: originalCanvas.height },
                compressionRatio: parseFloat(compressionRatio)
            });
        });
    }
    
    optimizeForAI(ctx, width, height) {
        // Aplicar filtros para melhorar detecção de IA
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Aumentar contraste ligeiramente para melhor detecção
            const contrast = 1.1;
            const brightness = 5;
            
            data[i] = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
            data[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
            data[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    generateOptimizedImage(canvas, purpose) {
        // Tentar WebP primeiro (melhor compressão)
        if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
            console.log(`📸 Usando WebP para ${purpose}`);
            
            if (purpose === 'ai') {
                return canvas.toDataURL('image/webp', 0.80); // WebP 80% para IA
            } else {
                return canvas.toDataURL('image/webp', 0.70); // WebP 70% para display
            }
        } else {
            // Fallback para JPEG
            console.log(`📸 Usando JPEG para ${purpose} (WebP não suportado)`);
            
            if (purpose === 'ai') {
                return canvas.toDataURL('image/jpeg', 0.85); // JPEG 85% para IA
            } else {
                return canvas.toDataURL('image/jpeg', 0.75); // JPEG 75% para display
            }
        }
    }
    
    getBase64Size(base64String) {
        // Calcular tamanho real do base64 (removendo header)
        const base64Data = base64String.split(',')[1];
        return Math.round((base64Data.length * 3) / 4);
    }
    
    stopDetection() {
        this.isDetecting = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Detecção parada');
        document.body.classList.remove('detection-active');
        
        // Parar captura contínua
        if (this.continuousCapture) {
            this.continuousCapture.enabled = false;
            if (this.continuousCapture.interval) clearInterval(this.continuousCapture.interval);
        }
        
        // Parar processamento em background
        if (this.backgroundProcessor) {
            this.backgroundProcessor.enabled = false;
            if (this.backgroundProcessor.interval) clearInterval(this.backgroundProcessor.interval);
        }
        
        // Parar sistema antigo (compatibilidade)
        if (this.detectionInterval) clearInterval(this.detectionInterval);
        
        console.log('🛑 Detecção parada');
    }
    
    detectMotionAndCapture() {
        if (!this.motionDetection.enabled || !this.video.videoWidth) return;
        
        // Capturar frame para análise de movimento
        this.motionCtx.drawImage(this.video, 0, 0, this.motionCanvas.width, this.motionCanvas.height);
        const currentFrame = this.motionCtx.getImageData(0, 0, this.motionCanvas.width, this.motionCanvas.height);
        
        if (this.motionDetection.previousFrame) {
            const motionDetected = this.compareFrames(this.motionDetection.previousFrame, currentFrame);
            
            if (motionDetected && !this.motionDetection.burstMode) {
                const now = Date.now();
                if (now - this.motionDetection.lastMotionTime > this.motionDetection.cooldownPeriod) {
                    this.startBurstCapture();
                    this.motionDetection.lastMotionTime = now;
                }
            }
        }
        
        this.motionDetection.previousFrame = currentFrame;
    }
    
    startBurstCapture() {
        console.log('🎬 MOVIMENTO DETECTADO - Iniciando captura em rajada');
        
        this.motionDetection.burstMode = true;
        this.motionDetection.burstPhotos = [];
        this.motionDetection.burstCount = 0;
        
        this.updateStatus('📸 Capturando fotos em rajada...');
        
        // Capturar fotos consecutivas a cada 200ms
        this.motionDetection.burstInterval = setInterval(() => {
            this.captureBurstPhoto();
        }, 200);
    }
    
    captureBurstPhoto() {
        if (this.motionDetection.burstCount >= this.motionDetection.maxBurstPhotos) {
            this.finishBurstCapture();
            return;
        }
        
        const photoCanvas = document.createElement('canvas');
        const photoCtx = photoCanvas.getContext('2d');
        
        photoCanvas.width = this.video.videoWidth;
        photoCanvas.height = this.video.videoHeight;
        photoCtx.drawImage(this.video, 0, 0, photoCanvas.width, photoCanvas.height);
        
        const photoData = photoCanvas.toDataURL('image/jpeg', 0.95);
        
        const burstPhoto = {
            id: `burst_${Date.now()}_${this.motionDetection.burstCount}`,
            imageData: photoData,
            timestamp: new Date(),
            burstIndex: this.motionDetection.burstCount
        };
        
        this.motionDetection.burstPhotos.push(burstPhoto);
        this.motionDetection.burstCount++;
        
        this.updateStatus(`📸 Foto ${this.motionDetection.burstCount}/${this.motionDetection.maxBurstPhotos} capturada`);
        
        console.log(`📷 Foto rajada ${this.motionDetection.burstCount}/${this.motionDetection.maxBurstPhotos} capturada`);
    }
    
    finishBurstCapture() {
        clearInterval(this.motionDetection.burstInterval);
        this.motionDetection.burstMode = false;
        
        console.log(`🎯 Rajada completa: ${this.motionDetection.burstPhotos.length} fotos capturadas`);
        this.updateStatus(`🔍 Analisando ${this.motionDetection.burstPhotos.length} fotos...`);
        
        // Processar todas as fotos da rajada
        this.processBurstPhotos();
    }
    
    async processBurstPhotos() {
        const burstPhotos = [...this.motionDetection.burstPhotos];
        this.motionDetection.burstPhotos = [];
        
        const dorsalDetections = new Map(); // número -> [{foto, região, isolado, photoIndex}...]
        
        console.log(`🔍 Processando ${burstPhotos.length} fotos da rajada...`);
        
        // FASE 1: Analisar todas as fotos
        if (this.detectionMode === 'gemini') {
            // Modo Gemini: Enviar todas as 5 imagens de uma vez
            this.updateStatusWithQueue(`💎 Analisando ${burstPhotos.length} fotos com Gemini...`);
            
            try {
                const batchDetections = await this.analyzePhotoBatchWithGemini(burstPhotos);
                
                // Processar resultados do lote
                batchDetections.forEach((detections, photoIndex) => {
                    const photo = burstPhotos[photoIndex];
                    
                    console.log(`📊 Foto ${photoIndex + 1}: ${detections.length} dorsais encontrados [${detections.map(d => d.number).join(', ')}]`);
                    
                    detections.forEach(detection => {
                        const number = detection.number;
                        const isIsolated = detections.length === 1;
                        
                        if (!dorsalDetections.has(number)) {
                            dorsalDetections.set(number, []);
                        }
                        
                        dorsalDetections.get(number).push({
                            number: number,
                            region: detection.region,
                            photo: photo,
                            photoIndex: photoIndex + 1,
                            isIsolated: isIsolated,
                            totalInPhoto: detections.length,
                            detectionMethod: 'Gemini'
                        });
                        
                        const isolatedText = isIsolated ? '🎯 ISOLADO' : `👥 COM ${detections.length - 1} OUTROS`;
                        console.log(`📍 Dorsal ${number} encontrado (foto ${photoIndex + 1}): ${isolatedText}`);
                    });
                });
                
            } catch (error) {
                console.error('❌ Erro no lote Gemini:', error);
                // Fallback para análise individual
                await this.analyzePhotosIndividually(burstPhotos, dorsalDetections);
            }
        } else {
            // Outros modos: análise individual
            await this.analyzePhotosIndividually(burstPhotos, dorsalDetections);
        }
    }
    
    async analyzePhotosIndividually(burstPhotos, dorsalDetections) {
        for (let i = 0; i < burstPhotos.length; i++) {
            const photo = burstPhotos[i];
            
            this.updateStatus(`🔍 Analisando foto ${i + 1}/${burstPhotos.length}...`);
            
            try {
                const detections = await this.analyzeStaticPhotoWithDynamicCalibration(photo.imageData);
                
                console.log(`📊 Foto ${i + 1}: ${detections.length} dorsais encontrados [${detections.map(d => d.number).join(', ')}]`);
                
                // Catalogar cada detecção com info se está isolada
                detections.forEach(detection => {
                    const number = detection.number;
                    const isIsolated = detections.length === 1; // Dorsal sozinho na foto
                    
                    if (!dorsalDetections.has(number)) {
                        dorsalDetections.set(number, []);
                    }
                    
                    dorsalDetections.get(number).push({
                        number: number,
                        region: detection.region,
                        photo: photo,
                        photoIndex: i + 1,
                        isIsolated: isIsolated,
                        totalInPhoto: detections.length
                    });
                    
                    const isolatedText = isIsolated ? '🎯 ISOLADO' : `👥 COM ${detections.length - 1} OUTROS`;
                    console.log(`📍 Dorsal ${number} encontrado (foto ${i + 1}): ${isolatedText}`);
                });
                
                // Pequena pausa entre análises
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`❌ Erro ao analisar foto ${i + 1}:`, error);
            }
        }
        
        // FASE 2: Selecionar a melhor foto para cada dorsal
        const bestDetections = [];
        
        dorsalDetections.forEach((detectionsList, number) => {
            console.log(`\n🔍 Selecionando melhor foto para dorsal ${number}:`);
            
            // Priorizar fotos onde o dorsal está isolado
            const isolatedDetections = detectionsList.filter(d => d.isIsolated);
            const groupDetections = detectionsList.filter(d => !d.isIsolated);
            
            let bestDetection = null;
            
            if (isolatedDetections.length > 0) {
                // Preferir primeira foto onde está isolado
                bestDetection = isolatedDetections[0];
                console.log(`  ✅ ESCOLHIDA: Foto ${bestDetection.photoIndex} (dorsal isolado)`);
            } else if (groupDetections.length > 0) {
                // Se não há fotos isoladas, usar primeira detecção em grupo
                bestDetection = groupDetections[0];
                console.log(`  ⚠️ ESCOLHIDA: Foto ${bestDetection.photoIndex} (em grupo com ${bestDetection.totalInPhoto - 1} outros)`);
            }
            
            if (bestDetection) {
                bestDetections.push(bestDetection);
                
                // Mostrar alternativas descartadas
                const alternatives = detectionsList.filter(d => d !== bestDetection);
                alternatives.forEach(alt => {
                    const altText = alt.isIsolated ? 'isolado' : `grupo ${alt.totalInPhoto}`;
                    console.log(`  🗑️ DESCARTADA: Foto ${alt.photoIndex} (${altText})`);
                });
            }
        });
        
        console.log(`\n🎯 RESULTADO FINAL: ${bestDetections.length} dorsais com melhores fotos selecionadas`);
        
        if (bestDetections.length > 0) {
            // Salvar cada detecção com sua melhor foto
            for (const detection of bestDetections) {
                // Verificar se já foi detectado anteriormente (controlo global)
                if (!this.detectedNumbers.has(detection.number)) {
                    await this.addDetectionWithProof(
                        detection.number, 
                        detection.photo.timestamp, 
                        detection.photo.imageData, 
                        detection.region
                    );
                    
                    // Marcar como detectado globalmente
                    this.detectedNumbers.add(detection.number);
                    
                    const isolatedText = detection.isIsolated ? '(isolado)' : `(grupo ${detection.totalInPhoto})`;
                    console.log(`💾 SALVO: Dorsal ${detection.number} da foto ${detection.photoIndex} ${isolatedText}`);
                } else {
                    console.log(`🚫 IGNORADO: Dorsal ${detection.number} já foi detectado anteriormente`);
                }
            }
            
            this.updateStatus(`✅ ${bestDetections.length} dorsais únicos registrados`);
        } else {
            this.updateStatus(`⚠️ Nenhum dorsal válido encontrado na rajada`);
        }
        
        // Voltar ao modo de espera
        setTimeout(() => {
            this.updateStatus('🔍 Aguardando movimento...');
        }, 3000);
    }
    
    compareFrames(frame1, frame2) {
        const data1 = frame1.data;
        const data2 = frame2.data;
        let changedPixels = 0;
        
        for (let i = 0; i < data1.length; i += 16) {
            const diff = Math.abs((data1[i] + data1[i+1] + data1[i+2]) - (data2[i] + data2[i+1] + data2[i+2]));
            if (diff > this.motionDetection.threshold) {
                changedPixels++;
            }
        }
        
        return changedPixels > this.motionDetection.minChangedPixels;
    }
    
    
    async analyzeStaticPhoto(imageData) {
        // Implementação simplificada da análise em duas fases
        // (Usar a mesma lógica do app.js principal)
        
        try {
            const base64Data = imageData.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: { content: base64Data },
                    features: [
                        { type: 'TEXT_DETECTION', maxResults: 50 },
                        { type: 'OBJECT_LOCALIZATION', maxResults: 20 }
                    ]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            return this.extractNumbers(result);
            
        } catch (error) {
            console.error('Erro na análise:', error);
            return [];
        }
    }
    
    extractNumbers(apiResult) {
        // Lógica simplificada de extração de números
        const numbers = [];
        
        if (apiResult.responses && apiResult.responses[0] && apiResult.responses[0].textAnnotations) {
            const annotations = apiResult.responses[0].textAnnotations;
            
            annotations.forEach(annotation => {
                const text = annotation.description;
                const matches = text.match(/\b\d{1,4}\b/g);
                if (matches) {
                    matches.forEach(match => {
                        const num = parseInt(match);
                        if (num >= 1 && num <= 9999) {
                            numbers.push(num);
                        }
                    });
                }
            });
        }
        
        // Filtrar duplicatas e priorizar números calibrados
        const unique = [...new Set(numbers)];
        const prioritized = [];
        const others = [];
        
        unique.forEach(num => {
            if (this.calibrationData.expectedNumbers.includes(num)) {
                prioritized.push(num);
            } else {
                others.push(num);
            }
        });
        
        return [...prioritized, ...others];
    }
    
    async addDetectionWithProof(number, timestamp, proofImage, dorsalRegion) {
        // Verificar duplicatas recentes
        const recentDetection = this.detections.find(d => 
            d.number === number && 
            (timestamp - new Date(d.timestamp)) < 5000
        );
        
        if (!recentDetection) {
            const detection = {
                number: number,
                timestamp: timestamp.toISOString(),
                time: timestamp.toLocaleTimeString('pt-BR'),
                latitude: this.currentPosition ? this.currentPosition.latitude : null,
                longitude: this.currentPosition ? this.currentPosition.longitude : null,
                accuracy: this.currentPosition ? this.currentPosition.accuracy : null,
                deviceType: 'mobile',
                sessionId: this.deviceId || this.supabaseClient.getSessionId(),
                eventId: this.eventId, // Associar ao evento
                proofImage: proofImage, // Imagem completa de prova
                dorsalRegion: dorsalRegion, // Coordenadas do dorsal na imagem
                detectionMethod: dorsalRegion.detectionMethod || this.getDetectionMethodName() // Método usado
            };
            
            // Salvar no Supabase/localStorage com imagem de prova
            await this.supabaseClient.saveDetection(detection);
            
            this.detections.push(detection);
            this.totalDetected++;
            this.updateDetectionsList();
            this.flashDetection();
            
            // Tocar bip de detecção
            this.playDetectionBeep();
            
            console.log('✅ Dorsal registrado com prova:', { number: detection.number, region: dorsalRegion });
        }
    }
    
    async analyzeStaticPhotoWithRegions(imageData) {
        // Versão que retorna números E regiões para salvar como prova
        try {
            const base64Data = imageData.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: { content: base64Data },
                    features: [
                        { type: 'TEXT_DETECTION', maxResults: 50 },
                        { type: 'OBJECT_LOCALIZATION', maxResults: 20 }
                    ]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            return this.extractNumbersWithRegions(result);
            
        } catch (error) {
            console.error('Erro na análise:', error);
            return [];
        }
    }
    
    extractNumbersWithRegions(apiResult) {
        const detections = [];
        
        if (apiResult.responses && apiResult.responses[0] && apiResult.responses[0].textAnnotations) {
            const annotations = apiResult.responses[0].textAnnotations;
            
            // Pular primeira anotação (texto completo) e processar individuais
            annotations.slice(1).forEach(annotation => {
                const text = annotation.description;
                
                // Verificar se corresponde ao padrão definido
                if (this.matchesDorsalPattern(text)) {
                    const number = this.extractNumberFromText(text);
                    
                    // Extrair coordenadas do bounding box
                    const vertices = annotation.boundingPoly.vertices;
                    if (vertices && vertices.length >= 4) {
                        const xs = vertices.map(v => v.x || 0);
                        const ys = vertices.map(v => v.y || 0);
                        
                        const region = {
                            x: Math.min(...xs),
                            y: Math.min(...ys),
                            width: Math.max(...xs) - Math.min(...xs),
                            height: Math.max(...ys) - Math.min(...ys),
                            confidence: annotation.confidence || 0.8
                        };
                        
                        // Filtro inteligente baseado no tamanho típico de dorsais
                        const area = region.width * region.height;
                        const aspectRatio = region.width / region.height;
                        
                        // Critérios para dorsais baseados no 407 (191x108 = 20,628 pixels)
                        const isValidDorsalSize = this.isValidDorsalRegion(region, number);
                        
                        if (isValidDorsalSize) {
                            const isPriority = this.calibrationData.expectedNumbers.includes(number);
                            
                            detections.push({
                                number: number,
                                region: region,
                                isPriority: isPriority,
                                area: area,
                                aspectRatio: aspectRatio
                            });
                            
                            const priority = isPriority ? '⭐' : '';
                            console.log(`📍 Dorsal ${number}${priority} encontrado em (${region.x}, ${region.y}) ${region.width}x${region.height} área=${area} ratio=${aspectRatio.toFixed(2)}`);
                        } else {
                            console.log(`❌ Região rejeitada: ${number} (${region.width}x${region.height} área=${area}) - não parece dorsal`);
                        }
                    }
                }
            });
        }
        
        // Filtrar duplicatas e priorizar números calibrados
        const unique = new Map();
        detections.forEach(detection => {
            if (!unique.has(detection.number)) {
                unique.set(detection.number, detection);
            }
        });
        
        const result = Array.from(unique.values());
        
        // Priorizar números calibrados e filtrar por tamanho
        result.sort((a, b) => {
            // Primeiro critério: números calibrados
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            
            // Segundo critério: tamanho da região (maiores primeiro)
            const aArea = a.region.width * a.region.height;
            const bArea = b.region.width * b.region.height;
            return bArea - aArea;
        });
        
        // FILTRO INTELIGENTE: Priorizar calibrados mas aceitar dorsais válidos
        const calibratedNumbers = result.filter(detection => {
            return this.calibrationData.expectedNumbers.includes(detection.number);
        });
        
        const validDorsals = result.filter(detection => {
            // Se já é calibrado, aceitar
            if (this.calibrationData.expectedNumbers.includes(detection.number)) {
                return true;
            }
            
            // Para outros números, verificar se parecem dorsais válidos
            return this.isValidDorsalRegion(detection.region, detection.number);
        });
        
        // Priorizar calibrados, depois outros válidos (máximo 3 total)
        const finalFiltered = [...calibratedNumbers, ...validDorsals.filter(d => !calibratedNumbers.includes(d))].slice(0, 3);
        
        console.log(`🎯 Filtro INTELIGENTE aplicado:`);
        console.log(`  - Total detectados: ${result.length}`);
        console.log(`  - Calibrados: ${calibratedNumbers.length}`);
        console.log(`  - Válidos: ${validDorsals.length}`);
        console.log(`  - Final aceito: ${finalFiltered.length}`);
        
        finalFiltered.forEach(d => {
            const priority = d.isPriority ? '⭐' : '';
            console.log(`  ✅ ${d.number}${priority} (${d.region.width}x${d.region.height})`);
        });
        
        // Mostrar rejeitados
        const rejected = result.filter(d => !finalFiltered.includes(d));
        rejected.forEach(d => {
            console.log(`  ❌ ${d.number} REJEITADO (${d.region.width}x${d.region.height})`);
        });
        
        return finalFiltered;
    }
    
    async analyzeStaticPhotoWithDynamicCalibration(imageData) {
        console.log('🔧 Iniciando análise com calibração dinâmica...');
        
        // Testar múltiplos parâmetros para esta foto específica
        const calibrationParams = [
            { contrast: 1.0, threshold: 127, name: 'Padrão' },
            { contrast: 1.3, threshold: 100, name: 'Baixo contraste' },
            { contrast: 1.6, threshold: 140, name: 'Médio contraste' },
            { contrast: 2.0, threshold: 160, name: 'Alto contraste' },
            { contrast: 0.8, threshold: 90, name: 'Suave' }
        ];
        
        const allResults = new Map(); // número -> melhor detecção
        
        for (let i = 0; i < calibrationParams.length; i++) {
            const params = calibrationParams[i];
            
            try {
                console.log(`🧪 Teste ${i + 1}/5: ${params.name} (contrast=${params.contrast}, threshold=${params.threshold})`);
                
                // Aplicar calibração específica para esta foto
                const processedImage = await this.preprocessImageWithParams(imageData, params);
                const detections = await this.analyzeImageWithVision(processedImage);
                
                console.log(`📊 ${params.name}: ${detections.length} detecções [${detections.map(d => d.number).join(', ')}]`);
                
                // Para cada detecção, manter a melhor
                detections.forEach(detection => {
                    const number = detection.number;
                    
                    if (!allResults.has(number) || this.isBetterDetection(detection, allResults.get(number))) {
                        allResults.set(number, {
                            ...detection,
                            calibrationUsed: params.name,
                            confidence: detection.confidence || 0.8
                        });
                        
                        console.log(`  ✅ Melhor detecção para ${number}: ${params.name}`);
                    }
                });
                
                // Pausa entre testes
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.warn(`❌ Erro no teste ${params.name}:`, error.message);
            }
        }
        
        const finalDetections = Array.from(allResults.values());
        console.log(`🎯 Calibração dinâmica completa: ${finalDetections.length} dorsais com melhores parâmetros`);
        
        return finalDetections;
    }
    
    async preprocessImageWithParams(imageData, params) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                // Aplicar pré-processamento com parâmetros específicos
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * params.contrast + 128));
                    const binary = enhanced > params.threshold ? 255 : 0;
                    
                    data[i] = binary;
                    data[i + 1] = binary;
                    data[i + 2] = binary;
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = imageData;
        });
    }
    
    async analyzeImageWithVision(processedImage) {
        try {
            const base64Data = processedImage.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: { content: base64Data },
                    features: [{ type: 'TEXT_DETECTION', maxResults: 20 }]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            return this.extractNumbersWithRegions(result);
            
        } catch (error) {
            console.error('Erro na análise:', error);
            return [];
        }
    }
    
    isBetterDetection(newDetection, currentBest) {
        // Critérios para determinar melhor detecção:
        // 1. Maior confiança
        // 2. Região maior (mais provável de ser dorsal)
        
        const newConfidence = newDetection.confidence || 0.8;
        const currentConfidence = currentBest.confidence || 0.8;
        
        if (newConfidence > currentConfidence) return true;
        
        const newArea = newDetection.region.width * newDetection.region.height;
        const currentArea = currentBest.region.width * currentBest.region.height;
        
        return newArea > currentArea;
    }
    
    matchesDorsalPattern(text) {
        if (!this.dorsalPattern) return /^\d{1,4}$/.test(text); // Fallback
        
        console.log(`🔍 Verificando texto "${text}" contra padrões ativos`);
        
        // Novo sistema: verificar múltiplos padrões ativos
        if (this.dorsalPattern.enableNumeric || this.dorsalPattern.enablePrefix || this.dorsalPattern.enableMarkers) {
            // Novo formato com múltiplos padrões
            
            // 1. Verificar padrão numérico (se ativo)
            if (this.dorsalPattern.enableNumeric && this.matchesNumericPattern(text)) {
                console.log(`  ✅ ACEITO por padrão numérico: "${text}"`);
                return true;
            }
            
            // 2. Verificar padrão de prefixo (se ativo)
            if (this.dorsalPattern.enablePrefix && this.matchesPrefixPattern(text)) {
                console.log(`  ✅ ACEITO por padrão de prefixo: "${text}"`);
                return true;
            }
            
            // 3. Verificar padrão de marcadores (se ativo)
            if (this.dorsalPattern.enableMarkers && this.matchesMarkersPattern(text)) {
                console.log(`  ✅ ACEITO por padrão de marcadores: "${text}"`);
                return true;
            }
            
            console.log(`  ❌ REJEITADO: "${text}" não corresponde a nenhum padrão ativo`);
            return false;
        }
        
        // Formato antigo (compatibilidade)
        const type = this.dorsalPattern.type;
        
        if (type === 'numeric') {
            // Padrão numérico: verificar se é número na faixa
            if (!/^\d+$/.test(text)) return false;
            
            const number = parseInt(text);
            
            // Se padding está ativo, validar formato com zeros
            if (this.dorsalPattern.padding) {
                const expectedDigits = this.dorsalPattern.digits || 3;
                
                console.log(`🔢 Verificando formato com zeros: "${text}" (esperado: ${expectedDigits} dígitos)`);
                
                // Verificar se tem o número correto de dígitos
                if (text.length !== expectedDigits) {
                    console.log(`  ❌ Formato incorreto: "${text}" tem ${text.length} dígitos, esperado ${expectedDigits}`);
                    return false;
                }
                
                // Verificar se começa com zero (se necessário)
                if (number < Math.pow(10, expectedDigits - 1) && !text.startsWith('0')) {
                    console.log(`  ❌ Deveria ter zeros à esquerda: "${text}" para número ${number}`);
                    return false;
                }
                
                console.log(`  ✅ FORMATO CORRETO: "${text}" → número ${number}`);
            }
            
            return number >= this.dorsalPattern.minNumber && number <= this.dorsalPattern.maxNumber;
            
        } else if (type === 'prefix') {
            // Padrão com prefixo: verificar prefixo + número
            const prefix = this.dorsalPattern.prefix;
            const regex = new RegExp(`^${prefix}\\d+$`);
            
            if (!regex.test(text)) return false;
            
            const numberPart = text.substring(prefix.length);
            const number = parseInt(numberPart);
            return number >= 1 && number <= this.dorsalPattern.maxNumber;
            
        } else if (type === 'markers') {
            // Padrão com marcadores visuais: MUITO RESTRITIVO
            const startSymbol = this.dorsalPattern.startSymbol || '-';
            const endSymbol = this.dorsalPattern.endSymbol || '-';
            
            console.log(`🎨 Verificando marcadores em "${text}": procurando ${startSymbol}...${endSymbol}`);
            
            // Verificar se o texto contém EXATAMENTE os marcadores
            const hasStartMarker = text.includes(startSymbol);
            const hasEndMarker = text.includes(endSymbol);
            
            if (!hasStartMarker || !hasEndMarker) {
                console.log(`  ❌ Marcadores ausentes: início=${hasStartMarker}, fim=${hasEndMarker}`);
                return false;
            }
            
            // O texto deve ter formato EXATO: [símbolo][número][símbolo]
            const pattern = new RegExp(`^${startSymbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\d+${endSymbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`);
            
            if (!pattern.test(text)) {
                console.log(`  ❌ Formato inválido: "${text}" não corresponde ao padrão ${startSymbol}NÚMERO${endSymbol}`);
                return false;
            }
            
            // Extrair número entre marcadores
            const startIndex = text.indexOf(startSymbol);
            const endIndex = text.lastIndexOf(endSymbol);
            
            if (startIndex >= endIndex) return false;
            
            const numberText = text.substring(startIndex + startSymbol.length, endIndex).trim();
            const number = parseInt(numberText);
            
            if (isNaN(number) || number < 1 || number > 9999) {
                console.log(`  ❌ Número inválido extraído: "${numberText}" → ${number}`);
                return false;
            }
            
            console.log(`  ✅ MARCADOR VÁLIDO: "${text}" → número ${number}`);
            return true;
            
        } else if (type === 'custom') {
            // Padrão personalizado: usar regex
            if (!this.dorsalPattern.regex) return false;
            
            try {
                const regex = new RegExp(this.dorsalPattern.regex);
                return regex.test(text);
            } catch (error) {
                console.error('Erro na regex personalizada:', error);
                return false;
            }
        }
        
        return false;
    }
    
    extractNumberFromText(text) {
        if (!this.dorsalPattern) return parseInt(text);
        
        const type = this.dorsalPattern.type;
        
        if (type === 'numeric') {
            return parseInt(text);
        } else if (type === 'prefix') {
            const numberPart = text.substring(this.dorsalPattern.prefix.length);
            return parseInt(numberPart);
        } else if (type === 'markers') {
            // Extrair número entre marcadores
            const startSymbol = this.dorsalPattern.startSymbol || '-';
            const endSymbol = this.dorsalPattern.endSymbol || '-';
            
            const startIndex = text.indexOf(startSymbol);
            const endIndex = text.lastIndexOf(endSymbol);
            
            if (startIndex >= 0 && endIndex > startIndex) {
                const numberText = text.substring(startIndex + startSymbol.length, endIndex).trim();
                return parseInt(numberText) || 0;
            }
            
            // Fallback: tentar extrair qualquer número
            const matches = text.match(/\d+/);
            return matches ? parseInt(matches[0]) : 0;
        } else if (type === 'custom') {
            // Para padrões personalizados, tentar extrair números
            const matches = text.match(/\d+/);
            return matches ? parseInt(matches[0]) : 0;
        }
        
        return parseInt(text);
    }
    
    async analyzePhotoBatchWithGemini(burstPhotos) {
        try {
            console.log(`💎 Enviando ${burstPhotos.length} imagens para Gemini em lote...`);
            
            // Verificar API key
            const response = await fetch('/api/config');
            const config = await response.json();
            const geminiKey = config.GEMINI_API_KEY;
            
            if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
                throw new Error('Gemini API Key não configurada');
            }
            
            // Construir prompt baseado nos padrões ativos
            const patterns = this.dorsalPattern;
            const simpleActive = patterns.enableNumeric || patterns.numeric ? true : false;
            const prefixActive = patterns.enablePrefix || patterns.prefix ? true : false;
            const visualActive = patterns.enableMarkers || patterns.markers ? true : false;
            
            const systemPrompt = "És um leitor de dorsais. Lê o conteúdo do papel e devolve apenas o identificador pedido. Não expliques. Não acrescentes texto.";
            
            const userPrompt = `Analisa as imagens anexas e devolve **apenas** os identificadores dos dorsais, conforme os padrões ativos:

Padrões ativos:
- Números Simples: ${simpleActive}
- Prefixo + Número: ${prefixActive}  
- Marcadores Visuais (traço verde, número, traço vermelho): ${visualActive}

Regras:
1) Se Prefixo + Número estiver ativo, devolve o prefixo junto ao número exatamente como impresso, sem espaços, por exemplo B024, CAT407.
2) Se Marcadores Visuais estiver ativo, devolve só o número entre o traço verde e o traço vermelho, por exemplo 024, 401, 999.
3) Se Números Simples estiver ativo, devolve só o número impresso, preservando zeros à esquerda.

Se mais do que um padrão estiver ativo, segue esta prioridade: Prefixo + Número > Marcadores Visuais > Números Simples.

Formato de resposta: Para cada imagem, numa linha separada, apenas o identificador ou INVALID se não conseguires identificar.
Exemplo de resposta para 3 imagens:
024
INVALID
A401`;
            
            // Preparar request com múltiplas imagens
            const parts = [{ text: userPrompt }];
            
            burstPhotos.forEach((photo, index) => {
                const base64Data = photo.imageData.split(',')[1];
                parts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Data
                    }
                });
                console.log(`💎 Adicionada imagem ${index + 1} ao lote`);
            });
            
            const requestBody = {
                contents: [{ parts: parts }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            };
            
            console.log('💎 Enviando lote para Gemini...');
            
            // Usar sistema de fila para garantir processamento sequencial
            const requestData = {
                geminiKey: geminiKey,
                requestBody: requestBody
            };
            
            const result = await window.geminiQueue.addRequest(requestData);
            console.log('💎 Resposta do Gemini:', result);
            
            if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                const content = result.candidates[0].content.parts[0].text.trim();
                console.log('💎 Identificadores detectados:', content);
                
                // Processar resposta linha por linha
                const lines = content.split('\n').map(line => line.trim()).filter(line => line);
                const batchResults = [];
                
                lines.forEach((line, index) => {
                    const photoDetections = [];
                    
                    if (line !== 'INVALID' && line) {
                        // Verificar se o identificador é válido
                        if (this.matchesDorsalPattern(line)) {
                            const number = this.extractNumberFromText(line);
                            
                            photoDetections.push({
                                number: number,
                                text: line,
                                detectionMethod: 'Gemini',
                                region: { x: 0, y: 0, width: 100, height: 50, confidence: 0.95 }
                            });
                            
                            console.log(`💎 Foto ${index + 1}: "${line}" → número ${number}`);
                        } else {
                            console.log(`💎 Foto ${index + 1}: "${line}" não corresponde ao padrão`);
                        }
                    } else {
                        console.log(`💎 Foto ${index + 1}: INVALID ou vazia`);
                    }
                    
                    batchResults.push(photoDetections);
                });
                
                // Garantir que temos resultado para todas as fotos
                while (batchResults.length < burstPhotos.length) {
                    batchResults.push([]);
                }
                
                console.log(`💎 Lote Gemini processado: ${batchResults.length} fotos analisadas`);
                return batchResults;
            }
            
            throw new Error('Resposta do Gemini inválida');
            
        } catch (error) {
            console.error('❌ Erro no lote Gemini:', error);
            throw error;
        }
    }
    
    async analyzePhotosIndividually(burstPhotos, dorsalDetections) {
        for (let i = 0; i < burstPhotos.length; i++) {
            const photo = burstPhotos[i];
            
            this.updateStatus(`🔍 Analisando foto ${i + 1}/${burstPhotos.length}...`);
            
            try {
                const detections = await this.analyzeStaticPhotoWithDynamicCalibration(photo.imageData);
                
                console.log(`📊 Foto ${i + 1}: ${detections.length} dorsais encontrados [${detections.map(d => d.number).join(', ')}]`);
                
                // Catalogar cada detecção com info se está isolada
                detections.forEach(detection => {
                    const number = detection.number;
                    const isIsolated = detections.length === 1;
                    
                    if (!dorsalDetections.has(number)) {
                        dorsalDetections.set(number, []);
                    }
                    
                    dorsalDetections.get(number).push({
                        number: number,
                        region: detection.region,
                        photo: photo,
                        photoIndex: i + 1,
                        isIsolated: isIsolated,
                        totalInPhoto: detections.length
                    });
                    
                    const isolatedText = isIsolated ? '🎯 ISOLADO' : `👥 COM ${detections.length - 1} OUTROS`;
                    console.log(`📍 Dorsal ${number} encontrado (foto ${i + 1}): ${isolatedText}`);
                });
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`❌ Erro ao analisar foto ${i + 1}:`, error);
            }
        }
    }
    
    matchesNumericPattern(text) {
        if (!/^\d+$/.test(text)) return false;
        
        const number = parseInt(text);
        const config = this.dorsalPattern.numeric;
        
        // Verificar se está na faixa
        if (number < config.minNumber || number > config.maxNumber) {
            console.log(`    ❌ Número ${number} fora da faixa ${config.minNumber}-${config.maxNumber}`);
            return false;
        }
        
        // Se padding está ativo, validar formato com zeros
        if (config.padding) {
            const expectedDigits = config.digits || 3;
            
            if (text.length !== expectedDigits) {
                console.log(`    ❌ Formato incorreto: "${text}" tem ${text.length} dígitos, esperado ${expectedDigits}`);
                return false;
            }
            
            // Para números pequenos, deve ter zeros à esquerda
            if (number < Math.pow(10, expectedDigits - 1) && !text.startsWith('0')) {
                console.log(`    ❌ Deveria ter zeros à esquerda: "${text}" para número ${number}`);
                return false;
            }
        }
        
        console.log(`    ✅ Número válido: "${text}" → ${number}`);
        return true;
    }
    
    matchesPrefixPattern(text) {
        const config = this.dorsalPattern.prefix;
        const prefix = config.prefix;
        
        if (!text.startsWith(prefix)) {
            console.log(`    ❌ Não começa com prefixo "${prefix}"`);
            return false;
        }
        
        const numberPart = text.substring(prefix.length);
        if (!/^\d+$/.test(numberPart)) {
            console.log(`    ❌ Parte numérica inválida: "${numberPart}"`);
            return false;
        }
        
        const number = parseInt(numberPart);
        if (number < 1 || number > config.maxNumber) {
            console.log(`    ❌ Número ${number} fora da faixa 1-${config.maxNumber}`);
            return false;
        }
        
        console.log(`    ✅ Prefixo válido: "${text}" → ${prefix}${number}`);
        return true;
    }
    
    matchesMarkersPattern(text) {
        const config = this.dorsalPattern.markers;
        const startSymbol = config.startSymbol;
        const endSymbol = config.endSymbol;
        
        // O texto deve ter formato EXATO: [símbolo][número][símbolo]
        const pattern = new RegExp(`^${startSymbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\d+${endSymbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`);
        
        if (!pattern.test(text)) {
            console.log(`    ❌ Formato inválido: "${text}" não corresponde ao padrão ${startSymbol}NÚMERO${endSymbol}`);
            return false;
        }
        
        // Extrair e validar número
        const startIndex = text.indexOf(startSymbol);
        const endIndex = text.lastIndexOf(endSymbol);
        const numberText = text.substring(startIndex + startSymbol.length, endIndex).trim();
        const number = parseInt(numberText);
        
        if (isNaN(number) || number < 1 || number > 9999) {
            console.log(`    ❌ Número inválido: "${numberText}" → ${number}`);
            return false;
        }
        
        console.log(`    ✅ Marcador válido: "${text}" → número ${number}`);
        return true;
    }
    
    isValidDorsalRegion(region, number) {
        const area = region.width * region.height;
        const aspectRatio = region.width / region.height;
        
        // Usar o 407 como referência de tamanho típico de dorsal
        // 407: 191x108 pixels = 20,628 área, ratio = 1.77
        const referenceArea = 191 * 108; // 20,628
        const referenceRatio = 191 / 108; // 1.77
        
        console.log(`🔍 Analisando número ${number}: ${region.width}x${region.height} (área=${area}, ratio=${aspectRatio.toFixed(2)})`);
        
        // 1. Números calibrados sempre aceitos
        if (this.calibrationData.expectedNumbers.includes(number)) {
            console.log(`  ⭐ ACEITO: Número calibrado ${number}`);
            return true;
        }
        
        // 2. Filtros para dorsais válidos (não calibrados)
        
        // Rejeitar números muito pequenos ou grandes
        if (number < 1 || number > 9999) {
            console.log(`  ❌ REJEITADO: Número ${number} fora da faixa de dorsais (1-9999)`);
            return false;
        }
        
        // Rejeitar anos e datas
        if (number >= 2000) {
            console.log(`  ❌ REJEITADO: Número ${number} parece ser ano`);
            return false;
        }
        
        // Área deve estar entre 50% e 200% da referência do 407
        const minArea = referenceArea * 0.5; // ~10,300 pixels
        const maxArea = referenceArea * 2.0; // ~41,200 pixels
        
        if (area < minArea) {
            console.log(`  ❌ REJEITADO: Área muito pequena ${area} < ${minArea} (${((area/referenceArea)*100).toFixed(1)}% do 407)`);
            return false;
        }
        
        if (area > maxArea) {
            console.log(`  ❌ REJEITADO: Área muito grande ${area} > ${maxArea} (${((area/referenceArea)*100).toFixed(1)}% do 407)`);
            return false;
        }
        
        // Dimensões mínimas para dorsais
        if (region.width < 80 || region.height < 50) {
            console.log(`  ❌ REJEITADO: Dimensões muito pequenas ${region.width}x${region.height} (mín: 80x50)`);
            return false;
        }
        
        // Aspect ratio típico de dorsais (mais largo que alto)
        if (aspectRatio < 1.0 || aspectRatio > 3.0) {
            console.log(`  ❌ REJEITADO: Proporção inválida ${aspectRatio.toFixed(2)} (esperado: 1.0-3.0)`);
            return false;
        }
        
        console.log(`  ✅ ACEITO: Dorsal válido ${number} (${((area/referenceArea)*100).toFixed(1)}% do 407, ratio=${aspectRatio.toFixed(2)})`);
        return true;
    }
    
    updateDetectionsList() {
        this.totalDetectedEl.textContent = this.totalDetected;
        
        if (this.detections.length === 0) {
            this.detectionsList.innerHTML = '<div class="no-detections">Nenhuma detecção ainda</div>';
            return;
        }
        
        // Mostrar últimas 10 detecções
        const recent = this.detections.slice(-10).reverse();
        
        this.detectionsList.innerHTML = recent.map(detection => {
            // Formatar Base64 corretamente
            let imageUrl = '';
            if (detection.proofImage) {
                // Se já começa com "data:", usar como está
                if (detection.proofImage.startsWith('data:')) {
                    imageUrl = detection.proofImage;
                } else {
                    // Senão, adicionar o prefixo
                    imageUrl = `data:image/jpeg;base64,${detection.proofImage}`;
                }
            }
            
            return `
                <div class="detection-item">
                    <div class="detection-header">
                        <div class="detection-number">${detection.number}</div>
                        <div class="detection-method">${detection.detectionMethod || 'Google Vision'}</div>
                    </div>
                    <div class="detection-time">${detection.time}</div>
                    <div class="detection-gps">
                        ${detection.latitude ? 
                            `${detection.latitude.toFixed(6)}, ${detection.longitude.toFixed(6)}` : 
                            'GPS não disponível'
                        }
                    </div>
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
    }
    
    flashDetection() {
        document.body.classList.add('detection-found');
        setTimeout(() => {
            document.body.classList.remove('detection-found');
        }, 800);
    }
    
    togglePanel() {
        this.panelOpen = !this.panelOpen;
        this.detectionPanel.classList.toggle('open', this.panelOpen);
        this.togglePanelBtn.textContent = this.panelOpen ? '✕' : '📊';
    }
    
    downloadRecords() {
        if (this.detections.length === 0) {
            alert('Nenhum registro para download');
            return;
        }
        
        let content = 'REGISTROS DE DORSAIS - VISIONKRONO\n';
        content += '=====================================\n\n';
        
        this.detections.forEach((detection, index) => {
            content += `Registro ${index + 1}:\n`;
            content += `Dorsal: ${detection.number}\n`;
            content += `Data/Hora: ${new Date(detection.timestamp).toLocaleString('pt-BR')}\n`;
            
            if (detection.latitude && detection.longitude) {
                content += `GPS: ${detection.latitude}, ${detection.longitude}\n`;
            } else {
                content += `GPS: Não disponível\n`;
            }
            content += '\n---\n\n';
        });
        
        content += `Total de registros: ${this.detections.length}\n`;
        content += `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dorsais_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    
    updateStatus(message) {
        this.status.textContent = message;
    }
    
    updateStatusWithQueue(message) {
        const queueStatus = window.geminiQueue.getStatus();
        let statusMessage = message;
        
        if (queueStatus.queueLength > 0) {
            statusMessage += ` | 📋 Fila: ${queueStatus.queueLength}`;
        }
        
        if (queueStatus.processing) {
            statusMessage += ` | 🔄 Processando...`;
        }
        
        this.status.textContent = statusMessage;
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    showError(title, message) {
        this.errorMessage.textContent = message;
        this.errorOverlay.style.display = 'flex';
    }
    
    async analyzeImageWithVision(processedImage) {
        // Escolher método baseado no modo selecionado
        switch (this.detectionMode) {
            case 'google':
                return await this.analyzeWithGoogleVision(processedImage);
            case 'gemini':
                return await this.analyzeWithGemini(processedImage);
            case 'ocr':
                return await this.analyzeWithTesseract(processedImage);
            case 'qr':
                // Usar Google Vision otimizado para QR codes
                return await this.analyzeWithGoogleVisionQR(processedImage);
            case 'hybrid':
                // Modo híbrido: QR codes com AI + texto normal
                return await this.analyzeWithHybridMode(processedImage);
            default:
                return await this.analyzeWithGoogleVision(processedImage);
        }
    }
    
    async analyzeWithGoogleVision(processedImage) {
        try {
            const base64Data = processedImage.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: { content: base64Data },
                    features: [
                        { type: 'TEXT_DETECTION', maxResults: 20 },
                        { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
                    ]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            return this.extractNumbersWithRegions(result);
            
        } catch (error) {
            console.error('Erro Google Vision:', error);
            return [];
        }
    }
    
    async analyzeWithGemini(imageData) {
        try {
            console.log('💎 Usando Gemini para análise de dorsais...');
            
            // Verificar se tem API key do Gemini
            const response = await fetch('/api/config');
            const config = await response.json();
            const geminiKey = config.GEMINI_API_KEY;
            
            if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
                console.log('⚠️ Gemini API Key não configurada, usando Google Vision');
                return await this.analyzeWithGoogleVision(imageData);
            }
            
            const base64Data = imageData.split(',')[1];
            
            // Construir prompt baseado nos padrões ativos
            const patterns = this.dorsalPattern;
            const simpleActive = patterns.enableNumeric || false;
            const prefixActive = patterns.enablePrefix || false;
            const visualActive = patterns.enableMarkers || false;
            
            const prompt = `Analisa a imagem e devolve apenas o identificador do dorsal. Padrões ativos: Números Simples=${simpleActive}; Prefixo+Número=${prefixActive}; Marcadores Visuais=${visualActive}. Prioridade quando há vários ativos: Prefixo+Número > Marcadores Visuais > Números Simples. Regras: (1) Prefixo+Número → devolver prefixo colado ao número, ex: B024; (2) Marcadores Visuais → devolver só o número entre o traço verde e o traço vermelho, ex: 024; (3) Números Simples → devolver só o número, preservando zeros à esquerda. Responder apenas com o identificador, sem texto adicional. Se não for possível identificar com segurança, responder: INVALID.`;
            
            const requestBody = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }]
            };
            
            // Usar sistema de fila para garantir processamento sequencial
            const requestData = {
                geminiKey: geminiKey,
                requestBody: requestBody
            };
            
            const result = await window.geminiQueue.addRequest(requestData);
            console.log('💎 Resposta do Gemini:', result);
            
            if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                const content = result.candidates[0].content.parts[0].text;
                console.log('💎 Análise do Gemini:', content);
                
                // Tentar extrair JSON da resposta
                try {
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const analysis = JSON.parse(jsonMatch[0]);
                        
                        const detections = [];
                        if (analysis.dorsals && Array.isArray(analysis.dorsals)) {
                            analysis.dorsals.forEach(dorsal => {
                                if (this.matchesDorsalPattern(dorsal.text || dorsal.number.toString())) {
                                    detections.push({
                                        number: parseInt(dorsal.number),
                                        detectionMethod: 'Gemini Vision',
                                        region: {
                                            x: dorsal.x || 0,
                                            y: dorsal.y || 0,
                                            width: dorsal.width || 100,
                                            height: dorsal.height || 50,
                                            confidence: dorsal.confidence || 0.9
                                        }
                                    });
                                    
                                    console.log(`💎 Gemini detectou: ${dorsal.text} → número ${dorsal.number}`);
                                }
                            });
                        }
                        
                        console.log(`💎 Gemini encontrou: ${detections.length} dorsais`);
                        return detections;
                    }
                } catch (parseError) {
                    console.warn('⚠️ Erro ao analisar resposta JSON do Gemini, usando análise de texto');
                }
                
                // Fallback: extrair números da resposta de texto
                const detections = [];
                const numbers = content.match(/\d{1,4}/g);
                if (numbers) {
                    numbers.forEach(num => {
                        const number = parseInt(num);
                        if (this.matchesDorsalPattern(num)) {
                            detections.push({
                                number: number,
                                detectionMethod: 'Gemini Vision',
                                region: { x: 0, y: 0, width: 100, height: 50, confidence: 0.8 }
                            });
                        }
                    });
                }
                
                return detections;
            }
            
            console.log('💎 Gemini não encontrou dorsais');
            return [];
            
        } catch (error) {
            console.error('Erro Gemini Vision:', error);
            // Fallback para Google Vision
            console.log('🔄 Fallback para Google Vision...');
            return await this.analyzeWithGoogleVision(processedImage);
        }
    }
    
    async analyzeWithGoogleVisionQR(imageData) {
        try {
            console.log('🤖 Usando Google Vision para detectar QR codes...');
            const base64Data = imageData.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: { content: base64Data },
                    features: [
                        { type: 'TEXT_DETECTION', maxResults: 50 },
                        { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 50 }
                    ]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            
            console.log('🤖 Resposta completa do Google Vision:', JSON.stringify(result, null, 2));
            
            const detections = [];
            
            if (result.responses && result.responses[0]) {
                const response = result.responses[0];
                
                // Procurar em TEXT_DETECTION
                if (response.textAnnotations) {
                    console.log(`🔍 ${response.textAnnotations.length} anotações de texto encontradas`);
                    
                    response.textAnnotations.forEach((annotation, index) => {
                        const text = annotation.description.trim();
                        console.log(`📝 Anotação ${index}: "${text}"`);
                        
                        // Verificar se é um QR code (formato específico ou padrão de dorsal)
                        if (this.looksLikeQRContent(text) || this.matchesDorsalPattern(text)) {
                            const number = this.extractNumberFromText(text);
                            
                            if (number && !detections.some(d => d.number === number)) {
                                const vertices = annotation.boundingPoly?.vertices;
                                if (vertices && vertices.length >= 4) {
                                    const xs = vertices.map(v => v.x || 0);
                                    const ys = vertices.map(v => v.y || 0);
                                    
                                    detections.push({
                                        number: number,
                                        qrData: text,
                                        detectionMethod: 'QR+AI',
                                        region: {
                                            x: Math.min(...xs),
                                            y: Math.min(...ys),
                                            width: Math.max(...xs) - Math.min(...xs),
                                            height: Math.max(...ys) - Math.min(...ys),
                                            confidence: 0.95
                                        }
                                    });
                                    
                                    console.log(`🤖 Google Vision detectou QR/texto: "${text}" → número ${number}`);
                                }
                            }
                        }
                    });
                }
                
                // Procurar em DOCUMENT_TEXT_DETECTION (melhor para texto estruturado)
                if (response.fullTextAnnotation) {
                    console.log('📄 Análise de documento encontrada');
                    const fullText = response.fullTextAnnotation.text;
                    console.log('📄 Texto completo:', fullText);
                    
                    const lines = fullText.split('\n');
                    lines.forEach(line => {
                        const cleanLine = line.trim();
                        if (cleanLine && this.matchesDorsalPattern(cleanLine)) {
                            const number = this.extractNumberFromText(cleanLine);
                            
                            if (number && !detections.some(d => d.number === number)) {
                                detections.push({
                                    number: number,
                                    qrData: cleanLine,
                                    region: { x: 0, y: 0, width: 100, height: 50, confidence: 0.9 }
                                });
                                
                                console.log(`📄 Documento detectou: "${cleanLine}" → número ${number}`);
                            }
                        }
                    });
                }
            }
            
            console.log(`🤖 Google Vision encontrou: ${detections.length} dorsais/QR codes`);
            return detections;
            
        } catch (error) {
            console.error('Erro Google Vision QR:', error);
            return [];
        }
    }
    
    looksLikeQRContent(text) {
        // Verificar se o texto parece conteúdo de QR code
        // QR codes podem ter formatos específicos ou simplesmente números
        
        // Se é só números, pode ser QR
        if (/^\d+$/.test(text)) return true;
        
        // Se tem marcadores, pode ser QR
        if (text.includes('-') && /\d/.test(text)) return true;
        
        // Se tem prefixos, pode ser QR
        if (/^[A-Z]\d+$/.test(text)) return true;
        
        return false;
    }
    
    async analyzeWithTesseract(processedImage) {
        try {
            console.log('📝 Analisando com Tesseract OCR...');
            
            const { data: { text, words } } = await Tesseract.recognize(processedImage, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            console.log('📝 Texto detectado pelo Tesseract:', text);
            
            // Extrair números do texto
            const detections = [];
            const lines = text.split('\n');
            
            lines.forEach(line => {
                const cleanLine = line.trim();
                if (this.matchesDorsalPattern(cleanLine)) {
                    const number = this.extractNumberFromText(cleanLine);
                    detections.push({
                        number: number,
                        region: { x: 0, y: 0, width: 100, height: 50, confidence: 0.9 }
                    });
                }
            });
            
            console.log('📝 Tesseract detectou:', detections.map(d => d.number));
            return detections;
            
        } catch (error) {
            console.error('Erro Tesseract:', error);
            return [];
        }
    }
    
    async analyzeWithQRCode(imageData) {
        try {
            console.log('📱 Procurando QR Codes com múltiplas técnicas...');
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = async () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const detections = [];
                    
                    // Técnica 1: Imagem original
                    console.log('📱 Tentativa 1: Imagem original');
                    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    let qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (qrCode) {
                        console.log('📱 QR encontrado na imagem original:', qrCode.data);
                        const detection = this.processQRCode(qrCode);
                        if (detection) detections.push(detection);
                    }
                    
                    // Técnica 2: Aumentar contraste
                    console.log('📱 Tentativa 2: Alto contraste');
                    this.enhanceImageForQR(ctx, canvas.width, canvas.height, 2.0, 150);
                    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (qrCode && !detections.some(d => d.qrData === qrCode.data)) {
                        console.log('📱 QR encontrado com alto contraste:', qrCode.data);
                        const detection = this.processQRCode(qrCode);
                        if (detection) detections.push(detection);
                    }
                    
                    // Técnica 3: Redimensionar para maior
                    console.log('📱 Tentativa 3: Imagem ampliada');
                    ctx.drawImage(img, 0, 0); // Restaurar original
                    
                    const scaledCanvas = document.createElement('canvas');
                    const scaledCtx = scaledCanvas.getContext('2d');
                    scaledCanvas.width = canvas.width * 2;
                    scaledCanvas.height = canvas.height * 2;
                    
                    scaledCtx.imageSmoothingEnabled = false;
                    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                    
                    const scaledImageData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
                    qrCode = jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height);
                    
                    if (qrCode && !detections.some(d => d.qrData === qrCode.data)) {
                        console.log('📱 QR encontrado na imagem ampliada:', qrCode.data);
                        const detection = this.processQRCode(qrCode);
                        if (detection) detections.push(detection);
                    }
                    
                    // Técnica 4: Procurar em regiões específicas
                    if (detections.length === 0) {
                        console.log('📱 Tentativa 4: Procurar em regiões específicas');
                        const regions = [
                            { x: 0, y: 0, w: canvas.width/2, h: canvas.height/2 }, // Canto superior esquerdo
                            { x: canvas.width/2, y: 0, w: canvas.width/2, h: canvas.height/2 }, // Canto superior direito
                            { x: 0, y: canvas.height/2, w: canvas.width/2, h: canvas.height/2 }, // Canto inferior esquerdo
                            { x: canvas.width/2, y: canvas.height/2, w: canvas.width/2, h: canvas.height/2 } // Canto inferior direito
                        ];
                        
                        for (const region of regions) {
                            const regionData = ctx.getImageData(region.x, region.y, region.w, region.h);
                            qrCode = jsQR(regionData.data, region.w, region.h);
                            
                            if (qrCode && !detections.some(d => d.qrData === qrCode.data)) {
                                console.log(`📱 QR encontrado na região (${region.x}, ${region.y}):`, qrCode.data);
                                const detection = this.processQRCode(qrCode);
                                if (detection) {
                                    // Ajustar coordenadas para imagem completa
                                    detection.region.x += region.x;
                                    detection.region.y += region.y;
                                    detections.push(detection);
                                }
                            }
                        }
                    }
                    
                    console.log(`📱 QR Codes encontrados: ${detections.length}`);
                    resolve(detections);
                };
                img.src = imageData;
            });
            
        } catch (error) {
            console.error('Erro QR Code:', error);
            return [];
        }
    }
    
    enhanceImageForQR(ctx, width, height, contrast, threshold) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Converter para escala de cinza
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Aplicar contraste
            const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
            
            // Binarizar para melhor detecção de QR
            const binary = enhanced > threshold ? 255 : 0;
            
            data[i] = binary;
            data[i + 1] = binary;
            data[i + 2] = binary;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    processQRCode(qrCode) {
        const qrText = qrCode.data;
        
        if (this.matchesDorsalPattern(qrText)) {
            const number = this.extractNumberFromText(qrText);
            return {
                number: number,
                qrData: qrText,
                region: {
                    x: qrCode.location.topLeftCorner.x,
                    y: qrCode.location.topLeftCorner.y,
                    width: Math.abs(qrCode.location.topRightCorner.x - qrCode.location.topLeftCorner.x),
                    height: Math.abs(qrCode.location.bottomLeftCorner.y - qrCode.location.topLeftCorner.y),
                    confidence: 1.0
                }
            };
        } else {
            console.log('📱 QR Code não corresponde ao padrão:', qrText);
            return null;
        }
    }
    
    async analyzeWithHybridMode(imageData) {
        try {
            console.log('🔄 Modo híbrido: QR codes + texto normal');
            
            // Primeiro tentar detectar QR codes com AI
            const qrDetections = await this.analyzeWithGoogleVisionQR(imageData);
            
            // Se não encontrou QR codes, usar detecção de texto normal
            const textDetections = qrDetections.length === 0 ? 
                await this.analyzeWithGoogleVision(imageData) : [];
            
            // Combinar resultados e marcar método usado
            const allDetections = [
                ...qrDetections.map(d => ({ ...d, detectionMethod: 'QR+AI' })),
                ...textDetections.map(d => ({ ...d, detectionMethod: 'Texto+AI' }))
            ];
            
            // Remover duplicatas
            const unique = new Map();
            allDetections.forEach(detection => {
                if (!unique.has(detection.number)) {
                    unique.set(detection.number, detection);
                }
            });
            
            const finalDetections = Array.from(unique.values());
            console.log(`🔄 Híbrido detectou: ${finalDetections.length} dorsais`);
            
            return finalDetections;
            
        } catch (error) {
            console.error('Erro modo híbrido:', error);
            return [];
        }
    }
    
    getDetectionMethodName() {
        const methodNames = {
            google: 'Google Vision',
            gemini: 'Gemini Vision',
            ocr: 'OCR Nativo',
            qr: 'QR+AI',
            hybrid: 'Híbrido'
        };
        
        return methodNames[this.detectionMode] || 'Desconhecido';
    }
    
    openCalibrationPage() {
        window.open('/calibration.html', '_blank');
    }
    
    // ===== SISTEMA DE BUFFER OFFLINE =====
    
    initOfflineBuffer() {
        console.log('🔄 Inicializando sistema de buffer offline...');
        
        // Carregar detecções pendentes do localStorage
        this.loadPendingDetections();
        
        // Configurar listeners de conectividade
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Iniciar sincronização automática
        this.startOfflineSync();
        
        // Atualizar status visual
        this.updateConnectivityStatus();
        
        console.log(`📱 Buffer offline inicializado. ${this.offlineBuffer.pendingDetections.length} detecções pendentes.`);
    }
    
    loadPendingDetections() {
        try {
            const stored = localStorage.getItem(this.offlineBuffer.storageKey);
            if (stored) {
                this.offlineBuffer.pendingDetections = JSON.parse(stored);
                console.log(`📦 Carregadas ${this.offlineBuffer.pendingDetections.length} detecções do buffer offline`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar buffer offline:', error);
            this.offlineBuffer.pendingDetections = [];
        }
    }
    
    savePendingDetections() {
        try {
            localStorage.setItem(
                this.offlineBuffer.storageKey, 
                JSON.stringify(this.offlineBuffer.pendingDetections)
            );
        } catch (error) {
            console.error('❌ Erro ao salvar buffer offline:', error);
        }
    }
    
    addToOfflineBuffer(detectionData) {
        const offlineDetection = {
            ...detectionData,
            timestamp: new Date().toISOString(),
            retryCount: 0,
            id: this.generateOfflineId()
        };
        
        this.offlineBuffer.pendingDetections.push(offlineDetection);
        this.savePendingDetections();
        
        console.log(`📱 Adicionado ao buffer offline: ${detectionData.number} (${this.offlineBuffer.pendingDetections.length} pendentes)`);
        
        // Tentar enviar imediatamente se online
        if (this.offlineBuffer.isOnline) {
            this.syncOfflineBuffer();
        }
    }
    
    generateOfflineId() {
        return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    handleOnline() {
        console.log('🌐 Conexão restaurada!');
        this.offlineBuffer.isOnline = true;
        this.updateConnectivityStatus();
        this.syncOfflineBuffer();
    }
    
    handleOffline() {
        console.log('📴 Conexão perdida - modo offline ativo');
        this.offlineBuffer.isOnline = false;
        this.updateConnectivityStatus();
    }
    
    startOfflineSync() {
        // Sincronizar a cada 10 segundos quando online
        this.offlineBuffer.syncInterval = setInterval(() => {
            if (this.offlineBuffer.isOnline && this.offlineBuffer.pendingDetections.length > 0) {
                this.syncOfflineBuffer();
            }
        }, 10000);
    }
    
    async syncOfflineBuffer() {
        if (this.offlineBuffer.syncInProgress || !this.offlineBuffer.isOnline) {
            return;
        }
        
        if (this.offlineBuffer.pendingDetections.length === 0) {
            return;
        }
        
        this.offlineBuffer.syncInProgress = true;
        console.log(`🔄 Sincronizando ${this.offlineBuffer.pendingDetections.length} detecções offline...`);
        
        const successfulSyncs = [];
        const failedSyncs = [];
        
        for (const detection of [...this.offlineBuffer.pendingDetections]) {
            try {
                await this.sendOfflineDetection(detection);
                successfulSyncs.push(detection);
                console.log(`✅ Sincronizado offline: ${detection.number}`);
            } catch (error) {
                console.error(`❌ Falha ao sincronizar ${detection.number}:`, error);
                detection.retryCount++;
                
                if (detection.retryCount < this.offlineBuffer.maxRetries) {
                    failedSyncs.push(detection);
                } else {
                    console.warn(`⚠️ Máximo de tentativas atingido para ${detection.number} - removendo do buffer`);
                }
            }
        }
        
        // Atualizar buffer com apenas as falhas
        this.offlineBuffer.pendingDetections = failedSyncs;
        this.savePendingDetections();
        
        this.offlineBuffer.syncInProgress = false;
        
        if (successfulSyncs.length > 0) {
            console.log(`✅ ${successfulSyncs.length} detecções sincronizadas com sucesso`);
            this.showSyncNotification(successfulSyncs.length);
        }
        
        this.updateConnectivityStatus();
    }
    
    async sendOfflineDetection(detection) {
        // Remover campos específicos do offline
        const { id, timestamp, retryCount, ...cleanDetection } = detection;
        
        // Usar o método normal de envio
        await this.saveToBuffer(cleanDetection);
    }
    
    updateConnectivityStatus() {
        const statusElement = document.getElementById('connectivityStatus');
        if (!statusElement) return;
        
        const isOnline = this.offlineBuffer.isOnline;
        const pendingCount = this.offlineBuffer.pendingDetections.length;
        const syncInProgress = this.offlineBuffer.syncInProgress;
        
        if (syncInProgress) {
            statusElement.innerHTML = `
                <div class="status-item">
                    <span class="status-icon">🔄</span>
                    <span class="status-text">Sincronizando...</span>
                </div>
            `;
            statusElement.className = 'status-item syncing';
        } else if (!isOnline) {
            statusElement.innerHTML = `
                <div class="status-item">
                    <span class="status-icon">📴</span>
                    <span class="status-text">Offline (${pendingCount} pendentes)</span>
                </div>
            `;
            statusElement.className = 'status-item offline';
        } else if (pendingCount > 0) {
            statusElement.innerHTML = `
                <div class="status-item">
                    <span class="status-icon">📦</span>
                    <span class="status-text">${pendingCount} pendentes</span>
                </div>
            `;
            statusElement.className = 'status-item pending';
        } else {
            statusElement.innerHTML = `
                <div class="status-item">
                    <span class="status-icon">🌐</span>
                    <span class="status-text">Online</span>
                </div>
            `;
            statusElement.className = 'status-item online';
        }
    }
    
    showSyncNotification(count) {
        // Criar notificação visual
        const notification = document.createElement('div');
        notification.className = 'sync-notification';
        notification.innerHTML = `
            <div class="sync-content">
                <span class="sync-icon">✅</span>
                <span class="sync-text">${count} detecções sincronizadas!</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Método para limpar buffer offline (útil para debug)
    clearOfflineBuffer() {
        this.offlineBuffer.pendingDetections = [];
        this.savePendingDetections();
        this.updateConnectivityStatus();
        console.log('🗑️ Buffer offline limpo');
    }
    
    // ===== CONTROLES DE CÂMERA E SOM =====
    
    initCameraControls() {
        console.log('📷 Inicializando controles de câmera e som...');
        
        // Carregar configurações salvas
        this.loadCameraSettings();
        
        // Inicializar contexto de áudio para bip
        this.initAudioContext();
        
        // Atualizar interface
        this.updateCameraControlsUI();
        
        console.log(`📷 Câmera: ${this.cameraControls.facingMode}, Flash: ${this.cameraControls.flashEnabled}, Som: ${this.cameraControls.soundEnabled}`);
    }
    
    loadCameraSettings() {
        try {
            const saved = localStorage.getItem('visionkrono_camera_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.cameraControls.facingMode = settings.facingMode || 'environment';
                this.cameraControls.flashEnabled = settings.flashEnabled || false;
                this.cameraControls.soundEnabled = settings.soundEnabled !== false; // default true
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações de câmera:', error);
        }
    }
    
    saveCameraSettings() {
        try {
            const settings = {
                facingMode: this.cameraControls.facingMode,
                flashEnabled: this.cameraControls.flashEnabled,
                soundEnabled: this.cameraControls.soundEnabled
            };
            localStorage.setItem('visionkrono_camera_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('❌ Erro ao salvar configurações de câmera:', error);
        }
    }
    
    initAudioContext() {
        try {
            // Criar contexto de áudio para bip
            this.cameraControls.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔊 Contexto de áudio inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar áudio:', error);
            this.cameraControls.soundEnabled = false;
        }
    }
    
    async toggleCamera() {
        if (this.isDetecting) {
            console.log('⚠️ Pare a detecção antes de trocar a câmera');
            return;
        }
        
        try {
            // Trocar modo da câmera
            this.cameraControls.facingMode = this.cameraControls.facingMode === 'user' ? 'environment' : 'user';
            
            console.log(`📷 Trocando para câmera ${this.cameraControls.facingMode === 'user' ? 'frontal' : 'traseira'}`);
            
            // Parar stream atual
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            // Solicitar nova câmera
            await this.requestCameraAccess();
            
            // Salvar configuração
            this.saveCameraSettings();
            
            // Atualizar interface
            this.updateCameraControlsUI();
            
            console.log('✅ Câmera trocada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao trocar câmera:', error);
            alert('❌ Erro ao trocar câmera. Verifique se o dispositivo suporta múltiplas câmeras.');
        }
    }
    
    async toggleFlash() {
        if (!this.stream) {
            console.log('⚠️ Câmera não inicializada');
            return;
        }
        
        try {
            const videoTrack = this.stream.getVideoTracks()[0];
            if (!videoTrack) {
                console.log('⚠️ Track de vídeo não encontrada');
                return;
            }
            
            // Verificar se o dispositivo suporta flash
            const capabilities = videoTrack.getCapabilities();
            if (!capabilities.torch) {
                console.log('⚠️ Dispositivo não suporta flash');
                alert('⚠️ Este dispositivo não suporta controle de flash');
                return;
            }
            
            // Alternar flash
            this.cameraControls.flashEnabled = !this.cameraControls.flashEnabled;
            
            await videoTrack.applyConstraints({
                advanced: [{ torch: this.cameraControls.flashEnabled }]
            });
            
            // Salvar configuração
            this.saveCameraSettings();
            
            // Atualizar interface
            this.updateCameraControlsUI();
            
            console.log(`💡 Flash ${this.cameraControls.flashEnabled ? 'ligado' : 'desligado'}`);
            
        } catch (error) {
            console.error('❌ Erro ao controlar flash:', error);
            this.cameraControls.flashEnabled = false;
            this.updateCameraControlsUI();
        }
    }
    
    toggleSound() {
        this.cameraControls.soundEnabled = !this.cameraControls.soundEnabled;
        
        // Salvar configuração
        this.saveCameraSettings();
        
        // Atualizar interface
        this.updateCameraControlsUI();
        
        console.log(`🔊 Som ${this.cameraControls.soundEnabled ? 'ativado' : 'desativado'}`);
    }
    
    playDetectionBeep() {
        if (!this.cameraControls.soundEnabled || !this.cameraControls.audioContext) {
            return;
        }
        
        try {
            // Criar oscilador para bip
            const oscillator = this.cameraControls.audioContext.createOscillator();
            const gainNode = this.cameraControls.audioContext.createGain();
            
            // Configurar som
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.cameraControls.audioContext.currentTime); // 800Hz
            
            // Configurar volume e envelope
            gainNode.gain.setValueAtTime(0, this.cameraControls.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.cameraControls.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.cameraControls.audioContext.currentTime + 0.1);
            
            // Conectar e tocar
            oscillator.connect(gainNode);
            gainNode.connect(this.cameraControls.audioContext.destination);
            
            oscillator.start(this.cameraControls.audioContext.currentTime);
            oscillator.stop(this.cameraControls.audioContext.currentTime + 0.1);
            
        } catch (error) {
            console.error('❌ Erro ao tocar bip:', error);
        }
    }
    
    updateCameraControlsUI() {
        // Atualizar botão de câmera
        const cameraBtn = document.getElementById('cameraToggleBtn');
        if (cameraBtn) {
            const icon = this.cameraControls.facingMode === 'user' ? '📱' : '📷';
            const text = this.cameraControls.facingMode === 'user' ? 'Frontal' : 'Traseira';
            cameraBtn.innerHTML = `
                <div class="btn-icon">${icon}</div>
                <div class="btn-text">${text}</div>
            `;
        }
        
        // Atualizar botão de flash
        const flashBtn = document.getElementById('flashToggleBtn');
        if (flashBtn) {
            const icon = this.cameraControls.flashEnabled ? '💡' : '🔦';
            const text = this.cameraControls.flashEnabled ? 'Flash ON' : 'Flash OFF';
            flashBtn.innerHTML = `
                <div class="btn-icon">${icon}</div>
                <div class="btn-text">${text}</div>
            `;
            flashBtn.className = `control-btn ${this.cameraControls.flashEnabled ? 'flash-on' : 'flash-off'}`;
        }
        
        // Atualizar botão de som
        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) {
            const icon = this.cameraControls.soundEnabled ? '🔊' : '🔇';
            const text = this.cameraControls.soundEnabled ? 'Som ON' : 'Som OFF';
            soundBtn.innerHTML = `
                <div class="btn-icon">${icon}</div>
                <div class="btn-text">${text}</div>
            `;
            soundBtn.className = `control-btn ${this.cameraControls.soundEnabled ? 'sound-on' : 'sound-off'}`;
        }
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    new VisionKronoDetection();
});
