/**
 * VisionKrono Live Stream Viewer
 * 
 * Visualizador limpo e moderno para receber streams WebRTC via Socket.IO
 * - Conecta ao servidor de signaling
 * - Descobre dispositivos online
 * - Estabelece conexão P2P com dispositivos usando WebRTC
 * - Exibe stream da câmera com baixa latência
 * 
 * Uso: Incluir na página de eventos para visualizar streams de dispositivos
 */

class LiveStreamViewer {
    constructor() {
        this.socket = null;
        this.peerConnections = new Map(); // deviceId -> RTCPeerConnection
        this.remoteStreams = new Map(); // deviceId -> MediaStream
        this.devices = new Map(); // deviceId -> deviceInfo
        this.eventId = null;
        this.viewerId = null;
        
        // Configuração WebRTC otimizada
        this.rtcConfig = {
            iceServers: [
                // Google STUN servers
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                // Fallback STUN servers
                { urls: 'stun:stun.stunprotocol.org:3478' },
                // TURN server público (fallback para NAT simétrico)
                { 
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };
    }
    
    /**
     * Inicializa o viewer
     */
    async init(eventId) {
        try {
            if (!eventId) {
                console.warn('⚠️ LiveStream Viewer: eventId é necessário');
                return false;
            }
            
            this.eventId = eventId;
            this.viewerId = 'viewer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            console.log('🎥 LiveStream Viewer inicializando...');
            console.log(`🏃 Event: ${this.eventId}`);
            console.log(`👁️ Viewer: ${this.viewerId}`);
            
            // Conectar ao servidor Socket.IO
            await this.connectSocket();
            
            console.log('✅ LiveStream Viewer pronto');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar LiveStream Viewer:', error);
            return false;
        }
    }
    
    /**
     * Conecta ao servidor Socket.IO
     */
    async connectSocket() {
        return new Promise((resolve, reject) => {
            try {
                // Conectar ao Socket.IO (mesmo servidor)
                this.socket = io({
                    secure: true,
                    rejectUnauthorized: false
                });
                
                this.socket.on('connect', () => {
                    console.log('🔌 Socket conectado:', this.socket.id);
                    
                    // Registrar viewer
                    this.socket.emit('register-viewer', {
                        eventId: this.eventId
                    });
                    
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('❌ Erro de conexão Socket:', error);
                    reject(error);
                });
                
                // Escutar lista de dispositivos
                this.socket.on('devices-list', (devices) => {
                    console.log('📱 Lista de dispositivos recebida:', devices.length);
                    this.updateDevicesList(devices);
                });
                
                // Escutar dispositivo online
                this.socket.on('device-online', (device) => {
                    console.log('📱 Dispositivo online:', device.deviceName);
                    this.addDevice(device);
                });
                
                // Escutar dispositivo offline
                this.socket.on('device-offline', (device) => {
                    console.log('📱 Dispositivo offline:', device.deviceName);
                    this.removeDevice(device.deviceId);
                });
                
                // Escutar answers de dispositivos
                this.socket.on('webrtc-answer', async ({ from, answer }) => {
                    console.log('📡 Answer recebido de dispositivo:', from);
                    await this.handleAnswer(from, answer);
                });
                
                // Escutar ICE candidates de dispositivos
                this.socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
                    console.log('📡 ICE candidate recebido de dispositivo:', from);
                    const pc = this.peerConnections.get(from);
                    if (pc) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Atualiza lista completa de dispositivos
     */
    updateDevicesList(devicesList) {
        this.devices.clear();
        devicesList.forEach(device => {
            this.devices.set(device.deviceId, {
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                status: device.status
            });
        });
        this.renderDevices();
    }
    
    /**
     * Adiciona dispositivo à lista
     */
    addDevice(device) {
        this.devices.set(device.deviceId, {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            status: device.status
        });
        this.renderDevices();
    }
    
    /**
     * Remove dispositivo da lista
     */
    removeDevice(deviceId) {
        this.devices.delete(deviceId);
        
        // Fechar conexão P2P se existir
        const pc = this.peerConnections.get(deviceId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(deviceId);
        }
        
        // Remover stream
        this.remoteStreams.delete(deviceId);
        
        this.renderDevices();
    }
    
    /**
     * Inicia stream de um dispositivo
     */
    async startStream(deviceId) {
        try {
            console.log(`🎥 Iniciando stream do dispositivo: ${deviceId}`);
            
            // Verificar se já existe conexão
            if (this.peerConnections.has(deviceId)) {
                console.log('⚠️ Conexão já existe para este dispositivo');
                return;
            }
            
            // Enviar comando para dispositivo iniciar stream
            this.socket.emit('start-stream', { deviceId });
            
            // Criar PeerConnection
            const pc = new RTCPeerConnection(this.rtcConfig);
            this.peerConnections.set(deviceId, pc);
            
            // Configurar ICE candidate handling
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('webrtc-ice-candidate', {
                        from: this.viewerId,
                        to: deviceId,
                        candidate: event.candidate
                    });
                }
            };
            
            // Configurar recebimento de stream
            pc.ontrack = (event) => {
                console.log(`📺 Stream recebido do dispositivo: ${deviceId}`);
                if (event.streams && event.streams[0]) {
                    this.remoteStreams.set(deviceId, event.streams[0]);
                    this.displayStream(deviceId, event.streams[0]);
                }
            };
            
            // Monitorar estado da conexão
            pc.onconnectionstatechange = () => {
                console.log(`🔗 Estado da conexão com ${deviceId}:`, pc.connectionState);
                this.updateConnectionStatus(deviceId, pc.connectionState);
            };
            
            // Criar offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Enviar offer via Socket.IO
            this.socket.emit('webrtc-offer', {
                from: this.viewerId,
                to: deviceId,
                offer: offer
            });
            
            console.log(`✅ Offer enviado para dispositivo: ${deviceId}`);
            
        } catch (error) {
            console.error('❌ Erro ao iniciar stream:', error);
        }
    }
    
    /**
     * Para stream de um dispositivo
     */
    stopStream(deviceId) {
        try {
            console.log(`🎥 Parando stream do dispositivo: ${deviceId}`);
            
            // Enviar comando para dispositivo parar stream
            this.socket.emit('stop-stream', { deviceId });
            
            // Fechar conexão P2P
            const pc = this.peerConnections.get(deviceId);
            if (pc) {
                pc.close();
                this.peerConnections.delete(deviceId);
            }
            
            // Remover stream
            this.remoteStreams.delete(deviceId);
            
            // Atualizar UI
            this.hideStream(deviceId);
            
            console.log(`✅ Stream parado: ${deviceId}`);
            
        } catch (error) {
            console.error('❌ Erro ao parar stream:', error);
        }
    }
    
    /**
     * Processa answer de dispositivo
     */
    async handleAnswer(deviceId, answer) {
        try {
            console.log(`📡 Processando answer de dispositivo: ${deviceId}`);
            
            const pc = this.peerConnections.get(deviceId);
            if (!pc) {
                console.error('❌ PeerConnection não encontrada para:', deviceId);
                return;
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`✅ Answer processado para dispositivo: ${deviceId}`);
            
        } catch (error) {
            console.error('❌ Erro ao processar answer:', error);
        }
    }
    
    /**
     * Renderiza lista de dispositivos na UI
     */
    renderDevices() {
        const container = document.getElementById('livestream-devices-list');
        if (!container) return;
        
        if (this.devices.size === 0) {
            container.innerHTML = `
                <div class="no-devices">
                    <div style="font-size: 3rem; margin-bottom: 10px;">📱</div>
                    <div>Nenhum dispositivo online</div>
                </div>
            `;
            return;
        }
        
        const devicesHTML = Array.from(this.devices.values()).map(device => {
            const isStreaming = this.remoteStreams.has(device.deviceId);
            const pc = this.peerConnections.get(device.deviceId);
            const connectionState = pc ? pc.connectionState : 'disconnected';
            
            return `
                <div class="device-card" data-device-id="${device.deviceId}">
                    <div class="device-info">
                        <div class="device-name">${device.deviceName}</div>
                        <div class="device-status ${device.status}">
                            ${device.status === 'online' ? '🟢' : '🔴'} ${device.status}
                        </div>
                        ${isStreaming ? `<div class="connection-status">${this.getConnectionStatusIcon(connectionState)} ${connectionState}</div>` : ''}
                    </div>
                    <div class="device-actions">
                        ${!isStreaming ? 
                            `<button class="btn-start" onclick="window.liveStreamViewer.startStream('${device.deviceId}')">
                                ▶️ Iniciar Stream
                            </button>` :
                            `<button class="btn-stop" onclick="window.liveStreamViewer.stopStream('${device.deviceId}')">
                                ⏹️ Parar Stream
                            </button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = devicesHTML;
    }
    
    /**
     * Exibe stream em video element
     */
    displayStream(deviceId, stream) {
        let videoContainer = document.getElementById('livestream-videos');
        if (!videoContainer) {
            // Criar container se não existir
            videoContainer = document.createElement('div');
            videoContainer.id = 'livestream-videos';
            document.body.appendChild(videoContainer);
        }
        
        // Criar video element
        let videoElement = document.getElementById(`stream-${deviceId}`);
        if (!videoElement) {
            const device = this.devices.get(deviceId);
            videoElement = document.createElement('div');
            videoElement.id = `stream-${deviceId}`;
            videoElement.className = 'stream-container';
            videoElement.innerHTML = `
                <div class="stream-header">
                    <span class="stream-title">${device ? device.deviceName : deviceId}</span>
                    <span class="stream-indicator">🔴 LIVE</span>
                </div>
                <video id="video-${deviceId}" autoplay playsinline muted></video>
            `;
            videoContainer.appendChild(videoElement);
        }
        
        // Configurar video
        const video = document.getElementById(`video-${deviceId}`);
        if (video) {
            video.srcObject = stream;
            video.play().catch(e => console.error('Erro ao reproduzir vídeo:', e));
        }
    }
    
    /**
     * Esconde stream
     */
    hideStream(deviceId) {
        const streamElement = document.getElementById(`stream-${deviceId}`);
        if (streamElement) {
            streamElement.remove();
        }
        this.renderDevices();
    }
    
    /**
     * Atualiza status da conexão na UI
     */
    updateConnectionStatus(deviceId, state) {
        this.renderDevices();
    }
    
    /**
     * Retorna ícone para status da conexão
     */
    getConnectionStatusIcon(state) {
        const icons = {
            'new': '🔵',
            'connecting': '🟡',
            'connected': '🟢',
            'disconnected': '🔴',
            'failed': '❌',
            'closed': '⚫'
        };
        return icons[state] || '❓';
    }
    
    /**
     * Limpa recursos ao desconectar
     */
    cleanup() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // Fechar todas as conexões
        for (const [deviceId, pc] of this.peerConnections.entries()) {
            pc.close();
        }
        this.peerConnections.clear();
        this.remoteStreams.clear();
    }
}

// Exportar para uso global
window.LiveStreamViewer = LiveStreamViewer;

