const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Carregamento do .env:', dotenvResult.error ? 'ERRO: ' + dotenvResult.error : 'SUCESSO');
console.log('Parsed:', dotenvResult.parsed);
console.log('GOOGLE_VISION_API_KEY carregada:', process.env.GOOGLE_VISION_API_KEY ? 'SIM' : 'NÃO');
console.log('Valor da API Key:', process.env.GOOGLE_VISION_API_KEY);

const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const BackgroundImageProcessor = require('./background-processor');

const app = express();
const PORT = 1144;

// Inicializar processador de imagens em background
const imageProcessor = new BackgroundImageProcessor();

// Servir arquivos estáticos
app.use(express.static('.'));

// Rota para fornecer configurações do ambiente
app.get('/api/config', (req, res) => {
    console.log('Solicitação de configuração recebida');
    console.log('GOOGLE_VISION_API_KEY no processo:', process.env.GOOGLE_VISION_API_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
    console.log('SUPABASE_URL no processo:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
    
    res.json({
        GOOGLE_VISION_API_KEY: process.env.GOOGLE_VISION_API_KEY || null,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || null
    });
});

// Endpoint para obter configuração do processador de um evento
app.get('/api/processor-config/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const processorConfig = await imageProcessor.getProcessorConfigForEvent(eventId);
        
        res.json({
            success: true,
            config: processorConfig
        });
    } catch (error) {
        console.error('Erro ao obter configuração do processador:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Rotas principais
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-kromi.html'));
});

// Rota legada
app.get('/index-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/platform-config', (req, res) => {
    res.sendFile(path.join(__dirname, 'platform-config.html'));
});

app.get('/detection', (req, res) => {
    res.sendFile(path.join(__dirname, 'detection-kromi.html'));
});

app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug-mobile.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'events-kromi.html'));
});

// Rota legada (manter para compatibilidade)
app.get('/events-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'events.html'));
});

app.get('/detection-debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'detection-debug.html'));
});

app.get('/image-processor', (req, res) => {
    res.sendFile(path.join(__dirname, 'image-processor-kromi.html'));
});

// Página de gestão da base de dados
app.get('/database-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'database-management-kromi.html'));
});

// Página de classificações
app.get('/classifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'classifications-kromi.html'));
});

// Página de gestão de participantes
app.get('/participants', (req, res) => {
    res.sendFile(path.join(__dirname, 'participants-kromi.html'));
});

// Página de configurações do evento
app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, 'config-kromi.html'));
});

// Página de rankings por categoria
app.get('/category-rankings', (req, res) => {
    res.sendFile(path.join(__dirname, 'category-rankings-kromi.html'));
});

app.get('/devices', (req, res) => {
    res.sendFile(path.join(__dirname, 'devices-kromi.html'));
});

app.get('/checkpoint-order', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkpoint-order-kromi.html'));
});

app.get('/calibration', (req, res) => {
    res.sendFile(path.join(__dirname, 'calibration-kromi.html'));
});

// Rotas legadas (para compatibilidade)
app.get('/calibration-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'calibration.html'));
});

app.get('/detection-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'detection.html'));
});

app.get('/classifications-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'classifications.html'));
});

app.get('/participants-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'participants.html'));
});

app.get('/image-processor-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'image-processor.html'));
});

app.get('/database-management-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'database-management.html'));
});

// Página de Live Stream
app.get('/live-stream', (req, res) => {
    res.sendFile(path.join(__dirname, 'live-stream.html'));
});

// Página de teste do Supabase
app.get('/test-supabase', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-supabase.html'));
});

// Verificar se os certificados existem
const keyPath = path.join(__dirname, 'certs', 'key.pem');
const certPath = path.join(__dirname, 'certs', 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('❌ Certificados SSL não encontrados!');
    console.log('🔧 Execute primeiro: npm run generate-cert');
    process.exit(1);
}

// Configurar HTTPS
const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

// Iniciar servidor HTTPS
const server = https.createServer(httpsOptions, app);

// Configurar Socket.IO para LiveStream Signaling
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Mapa para rastrear dispositivos e salas
const devices = new Map(); // deviceId -> socketId
const rooms = new Map(); // eventId -> Set of socketIds

io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.id);
    
    // Dispositivo registra-se
    socket.on('register-device', ({ deviceId, eventId, deviceName }) => {
        console.log(`📱 Dispositivo registrado: ${deviceName} (${deviceId}) no evento ${eventId}`);
        
        devices.set(deviceId, {
            socketId: socket.id,
            deviceId,
            eventId,
            deviceName,
            status: 'online',
            connectedAt: new Date()
        });
        
        // Adicionar à sala do evento
        socket.join(`event:${eventId}`);
        
        if (!rooms.has(eventId)) {
            rooms.set(eventId, new Set());
        }
        rooms.get(eventId).add(socket.id);
        
        // Notificar viewers sobre novo dispositivo
        socket.to(`event:${eventId}`).emit('device-online', {
            deviceId,
            deviceName,
            status: 'online'
        });
        
        // Enviar lista de dispositivos online para o novo socket
        const onlineDevices = Array.from(devices.values())
            .filter(d => d.eventId === eventId)
            .map(d => ({
                deviceId: d.deviceId,
                deviceName: d.deviceName,
                status: d.status
            }));
        
        socket.emit('devices-list', onlineDevices);
    });
    
    // Viewer registra-se para monitorar evento
    socket.on('register-viewer', ({ eventId }) => {
        console.log(`👁️ Viewer registrado para evento ${eventId}`);
        socket.join(`event:${eventId}`);
        
        // Enviar lista de dispositivos online
        const onlineDevices = Array.from(devices.values())
            .filter(d => d.eventId === eventId)
            .map(d => ({
                deviceId: d.deviceId,
                deviceName: d.deviceName,
                status: d.status
            }));
        
        socket.emit('devices-list', onlineDevices);
    });
    
    // WebRTC Signaling: Offer
    socket.on('webrtc-offer', ({ from, to, offer }) => {
        console.log(`📡 Offer de ${from} para ${to}`);
        const targetDevice = devices.get(to);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('webrtc-offer', { from, offer });
        }
    });
    
    // WebRTC Signaling: Answer
    socket.on('webrtc-answer', ({ from, to, answer }) => {
        console.log(`📡 Answer de ${from} para ${to}`);
        const targetDevice = devices.get(to);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('webrtc-answer', { from, answer });
        }
    });
    
    // WebRTC Signaling: ICE Candidate
    socket.on('webrtc-ice-candidate', ({ from, to, candidate }) => {
        console.log(`📡 ICE candidate de ${from} para ${to}`);
        const targetDevice = devices.get(to);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('webrtc-ice-candidate', { from, candidate });
        }
    });
    
    // Comando para iniciar stream
    socket.on('start-stream', ({ deviceId }) => {
        console.log(`▶️ Comando para iniciar stream do dispositivo ${deviceId}`);
        const device = devices.get(deviceId);
        if (device) {
            io.to(device.socketId).emit('stream-command', { command: 'start' });
        }
    });
    
    // Comando para parar stream
    socket.on('stop-stream', ({ deviceId }) => {
        console.log(`⏹️ Comando para parar stream do dispositivo ${deviceId}`);
        const device = devices.get(deviceId);
        if (device) {
            io.to(device.socketId).emit('stream-command', { command: 'stop' });
        }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
        console.log('🔌 Socket desconectado:', socket.id);
        
        // Remover dispositivo
        for (const [deviceId, device] of devices.entries()) {
            if (device.socketId === socket.id) {
                console.log(`📱 Dispositivo offline: ${device.deviceName}`);
                
                // Notificar viewers
                socket.to(`event:${device.eventId}`).emit('device-offline', {
                    deviceId,
                    deviceName: device.deviceName,
                    status: 'offline'
                });
                
                // Remover da sala
                if (rooms.has(device.eventId)) {
                    rooms.get(device.eventId).delete(socket.id);
                }
                
                devices.delete(deviceId);
                break;
            }
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 VisionKrono servidor iniciado!');
    console.log('');
    console.log('🌐 Acesso local:');
    console.log(`   https://localhost:${PORT}`);
    console.log(`   https://127.0.0.1:${PORT}`);
    console.log('');
    console.log('📱 Acesso móvel:');
    
    // Tentar obter IP local
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    
    // Mostrar IPs disponíveis
    Object.keys(results).forEach(name => {
        results[name].forEach(ip => {
            console.log(`   https://${ip}:${PORT}`);
        });
    });
    
    console.log('');
    console.log('⚠️  IMPORTANTE para telemóvel:');
    console.log('   1. Conecte o telemóvel na mesma rede WiFi');
    console.log('   2. Acesse um dos IPs acima no browser do telemóvel');
    console.log('   3. Aceite o certificado auto-assinado quando solicitado');
    console.log('   4. Permita acesso à câmera e localização');
    console.log('');
    console.log('🔐 Certificado SSL ativo - necessário para acesso à câmera');
    console.log('⏹️  Para parar: Ctrl+C');
    console.log('');
    console.log('🎥 Socket.IO Live Stream Signaling ativo');
    console.log('   - WebRTC P2P com baixa latência');
    console.log('   - Suporte para múltiplos dispositivos');
    console.log('');
    
    // Iniciar processador de imagens em background
    console.log('🤖 Iniciando processador de imagens em background...');
    imageProcessor.init().then(success => {
        if (success) {
            console.log('✅ Processador de imagens ativo e monitorando buffer');
        } else {
            console.log('❌ Falha ao iniciar processador de imagens');
        }
    });
});

// Tratamento de erros
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Porta ${PORT} já está em uso!`);
        console.log('🔧 Tente uma porta diferente ou pare o processo que está usando a porta');
    } else {
        console.error('❌ Erro no servidor:', err.message);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Parando servidor...');
    console.log('🛑 Parando processador de imagens...');
    imageProcessor.stop();
    server.close(() => {
        console.log('✅ Servidor parado com sucesso!');
        process.exit(0);
    });
});
