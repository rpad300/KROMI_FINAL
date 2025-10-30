/**
 * Kromi.online Live Stream Client
 * 
 * Cliente limpo e moderno para streaming WebRTC via Socket.IO
 * - Conecta dispositivo móvel ao servidor de signaling
 * - Estabelece conexão P2P com viewers usando WebRTC
 * - Transmite stream da câmera com baixa latência
 * 
 * Uso: Incluir na página de detecção para transmitir câmera
 */

class LiveStreamClient {
    constructor() {
        this.socket = null;
        this.peerConnections = new Map(); // viewerId -> RTCPeerConnection
        this.localStream = null;
        this.deviceId = null;
        this.eventId = null;
        this.deviceName = null;
        this.isStreaming = false;
        
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
     * Inicializa o cliente
     */
    async init() {
        try {
            // Carregar parâmetros da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.deviceId = urlParams.get('device');
            this.eventId = urlParams.get('event');
            
            if (!this.deviceId || !this.eventId) {
                console.warn('⚠️ LiveStream: device e event são necessários na URL');
                return false;
            }
            
            this.deviceName = `Dispositivo ${this.deviceId.substring(0, 8)}`;
            
            console.log('🎥 LiveStream Client inicializando...');
            console.log(`📱 Device: ${this.deviceId}`);
            console.log(`🏃 Event: ${this.eventId}`);
            
            // Conectar ao servidor Socket.IO
            await this.connectSocket();
            
            console.log('✅ LiveStream Client pronto');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar LiveStream:', error);
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
                    
                    // Registrar dispositivo
                    this.socket.emit('register-device', {
                        deviceId: this.deviceId,
                        eventId: this.eventId,
                        deviceName: this.deviceName
                    });
                    
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('❌ Erro de conexão Socket:', error);
                    reject(error);
                });
                
                // Escutar comandos de stream
                this.socket.on('stream-command', ({ command }) => {
                    console.log('📨 Comando recebido:', command);
                    if (command === 'start') {
                        this.startStreaming();
                    } else if (command === 'stop') {
                        this.stopStreaming();
                    }
                });
                
                // Escutar offers de viewers
                this.socket.on('webrtc-offer', async ({ from, offer }) => {
                    console.log('📡 Offer recebido de viewer:', from);
                    await this.handleOffer(from, offer);
                });
                
                // Escutar ICE candidates de viewers
                this.socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
                    console.log('📡 ICE candidate recebido de viewer:', from);
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
     * Inicia o streaming da câmera
     */
    async startStreaming() {
        try {
            if (this.isStreaming) {
                console.log('⚠️ Streaming já está ativo');
                return;
            }
            
            console.log('🎥 Iniciando streaming...');
            
            // Obter stream da câmera (reusa stream existente se disponível)
            if (!this.localStream) {
                // Tentar obter stream do sistema de detecção primeiro
                if (window.detectionApp && window.detectionApp.stream) {
                    this.localStream = window.detectionApp.stream;
                    console.log('📹 Usando stream de detecção existente');
                } else {
                    // Criar novo stream
                    this.localStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 30 }
                        },
                        audio: false
                    });
                    console.log('📹 Novo stream da câmera criado');
                }
            }
            
            this.isStreaming = true;
            console.log('✅ Streaming ativo - aguardando viewers...');
            
            // Mostrar feedback visual
            this.showStreamingIndicator();
            
        } catch (error) {
            console.error('❌ Erro ao iniciar streaming:', error);
            this.isStreaming = false;
        }
    }
    
    /**
     * Para o streaming
     */
    stopStreaming() {
        try {
            console.log('🎥 Parando streaming...');
            
            // Fechar todas as conexões P2P
            for (const [viewerId, pc] of this.peerConnections.entries()) {
                pc.close();
                console.log(`🔌 Conexão fechada com viewer: ${viewerId}`);
            }
            this.peerConnections.clear();
            
            // NÃO parar o stream se vier do sistema de detecção
            if (window.detectionApp && window.detectionApp.stream === this.localStream) {
                console.log('📹 Stream de detecção mantido ativo');
            } else if (this.localStream) {
                // Parar tracks do stream próprio
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            this.isStreaming = false;
            console.log('✅ Streaming parado');
            
            // Remover feedback visual
            this.hideStreamingIndicator();
            
        } catch (error) {
            console.error('❌ Erro ao parar streaming:', error);
        }
    }
    
    /**
     * Processa offer de viewer e cria conexão P2P
     */
    async handleOffer(viewerId, offer) {
        try {
            console.log(`📡 Processando offer de viewer: ${viewerId}`);
            
            // Criar nova PeerConnection
            const pc = new RTCPeerConnection(this.rtcConfig);
            this.peerConnections.set(viewerId, pc);
            
            // Adicionar tracks do stream local
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    pc.addTrack(track, this.localStream);
                    console.log(`📡 Track adicionado: ${track.kind}`);
                });
            }
            
            // Configurar ICE candidate handling
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('webrtc-ice-candidate', {
                        from: this.deviceId,
                        to: viewerId,
                        candidate: event.candidate
                    });
                }
            };
            
            // Monitorar estado da conexão
            pc.onconnectionstatechange = () => {
                console.log(`🔗 Estado da conexão com ${viewerId}:`, pc.connectionState);
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    this.peerConnections.delete(viewerId);
                }
            };
            
            // Processar offer
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Criar answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // Enviar answer via Socket.IO
            this.socket.emit('webrtc-answer', {
                from: this.deviceId,
                to: viewerId,
                answer: answer
            });
            
            console.log(`✅ Answer enviado para viewer: ${viewerId}`);
            
        } catch (error) {
            console.error('❌ Erro ao processar offer:', error);
        }
    }
    
    /**
     * Mostra indicador visual de streaming
     */
    showStreamingIndicator() {
        // Criar indicador se não existir
        let indicator = document.getElementById('livestream-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'livestream-indicator';
            indicator.innerHTML = '🔴 LIVE';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(255, 0, 0, 0.9);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                z-index: 10000;
                animation: pulse 1.5s infinite;
                box-shadow: 0 2px 10px rgba(255, 0, 0, 0.5);
            `;
            document.body.appendChild(indicator);
            
            // Adicionar animação
            if (!document.getElementById('livestream-animation')) {
                const style = document.createElement('style');
                style.id = 'livestream-animation';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(0.95); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        indicator.style.display = 'block';
    }
    
    /**
     * Esconde indicador visual de streaming
     */
    hideStreamingIndicator() {
        const indicator = document.getElementById('livestream-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    /**
     * Limpa recursos ao desconectar
     */
    cleanup() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.stopStreaming();
    }
}

// Inicializar quando estiver na página de detecção
if (window.location.pathname.includes('detection')) {
    window.liveStreamClient = new LiveStreamClient();
    
    // Inicializar após carregamento do DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.liveStreamClient.init();
        });
    } else {
        window.liveStreamClient.init();
    }
    
    // Cleanup ao sair
    window.addEventListener('beforeunload', () => {
        if (window.liveStreamClient) {
            window.liveStreamClient.cleanup();
        }
    });
}

// Exportar para uso global
window.LiveStreamClient = LiveStreamClient;

