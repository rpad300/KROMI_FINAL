class Kromi.online {
    constructor() {
        this.stream = null;
        this.isDetecting = false;
        this.detections = [];
        this.currentPosition = null;
        this.apiKey = null;
        this.totalDetected = 0;
        
        this.init();
    }
    
    async init() {
        try {
            this.setupElements();
            this.setupEventListeners();
            await this.loadApiKey();
            await this.requestCameraAccess();
            await this.getCurrentLocation();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.updateStatus('Erro na inicialização');
        } finally {
            // Sempre esconder loading, mesmo se houver erro
            this.hideLoading();
            // Atualizar status de configuração
            this.updateSetupStatus();
        }
    }
    
    setupElements() {
        this.video = document.getElementById('cameraStream');
        this.canvas = document.getElementById('captureCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.roiCanvas = document.getElementById('roiCanvas');
        this.roiCtx = this.roiCanvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.testBtn = document.getElementById('testBtn');
        this.calibrateBtn = document.getElementById('calibrateBtn');
        this.setNumberAreaBtn = document.getElementById('setNumberAreaBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.imageUpload = document.getElementById('imageUpload');
        this.status = document.getElementById('status');
        this.setupStatus = document.getElementById('setupStatus');
        this.lastDetection = document.getElementById('lastDetection');
        this.gpsStatus = document.getElementById('gpsStatus');
        this.totalDetectedEl = document.getElementById('totalDetected');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Elementos do modal
        this.numberAreaModal = document.getElementById('numberAreaModal');
        this.calibrationImage = document.getElementById('calibrationImage');
        this.areaCanvas = document.getElementById('areaCanvas');
        this.areaCtx = this.areaCanvas.getContext('2d');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.confirmAreaBtn = document.getElementById('confirmAreaBtn');
        this.resetAreaBtn = document.getElementById('resetAreaBtn');
        
        // Parâmetros de calibração
        this.calibrationData = {
            contrast: 1.5,
            threshold: 120,
            expectedNumbers: [],
            confidence: 0.7
        };
        
        // Área do número no dorsal (template)
        this.numberArea = {
            active: false,
            x: 0,      // Posição relativa no dorsal (0-1)
            y: 0,      // Posição relativa no dorsal (0-1) 
            width: 0,  // Largura relativa (0-1)
            height: 0  // Altura relativa (0-1)
        };
        
        this.isDrawingROI = false;
        this.roiStartX = 0;
        this.roiStartY = 0;
        
        // Sistema de detecção de movimento
        this.motionDetection = {
            enabled: false,
            previousFrame: null,
            threshold: 30, // Sensibilidade do movimento
            minChangedPixels: 1000, // Mínimo de pixels alterados
            lastMotionTime: 0,
            cooldownPeriod: 1000, // 1 segundo entre capturas
            captureQueue: [],
            isProcessing: false
        };
        
        this.motionCanvas = document.createElement('canvas');
        this.motionCtx = this.motionCanvas.getContext('2d');
        
        // Variáveis para o modal de área
        this.savedCalibrationImage = null;
        this.modalDrawing = {
            isDrawing: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startDetection());
        this.stopBtn.addEventListener('click', () => this.stopDetection());
        this.testBtn.addEventListener('click', () => this.testDetection());
        this.calibrateBtn.addEventListener('click', () => this.startCalibration());
        this.setNumberAreaBtn.addEventListener('click', () => this.startNumberAreaSelection());
        this.downloadBtn.addEventListener('click', () => this.downloadRecords());
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Eventos do modal
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.confirmAreaBtn.addEventListener('click', () => this.confirmNumberArea());
        this.resetAreaBtn.addEventListener('click', () => this.resetNumberArea());
        
        // Eventos para desenhar área no modal
        this.areaCanvas.addEventListener('mousedown', (e) => this.onModalMouseDown(e));
        this.areaCanvas.addEventListener('mousemove', (e) => this.onModalMouseMove(e));
        this.areaCanvas.addEventListener('mouseup', (e) => this.onModalMouseUp(e));
        
        // Touch events para mobile
        this.areaCanvas.addEventListener('touchstart', (e) => this.onModalTouchStart(e));
        this.areaCanvas.addEventListener('touchmove', (e) => this.onModalTouchMove(e));
        this.areaCanvas.addEventListener('touchend', (e) => this.onModalTouchEnd(e));
        
        // Eventos para desenhar ROI
        this.video.addEventListener('mousedown', (e) => this.onROIMouseDown(e));
        this.video.addEventListener('mousemove', (e) => this.onROIMouseMove(e));
        this.video.addEventListener('mouseup', (e) => this.onROIMouseUp(e));
        
        // Eventos para touch (mobile)
        this.video.addEventListener('touchstart', (e) => this.onROITouchStart(e));
        this.video.addEventListener('touchmove', (e) => this.onROITouchMove(e));
        this.video.addEventListener('touchend', (e) => this.onROITouchEnd(e));
        
        // Redimensionar ROI canvas quando video redimensionar
        this.video.addEventListener('loadedmetadata', () => this.setupROICanvas());
        
        // Atualizar localização periodicamente
        setInterval(() => this.getCurrentLocation(), 30000);
    }
    
    async loadApiKey() {
        try {
            // Carregar configuração do servidor (.env)
            console.log('Carregando configuração da API...');
            const response = await fetch('/api/config');
            console.log('Resposta do servidor:', response.status);
            
            const config = await response.json();
            console.log('Configuração recebida:', config);
            
            if (config.GOOGLE_VISION_API_KEY && config.GOOGLE_VISION_API_KEY !== 'your_api_key_here') {
                this.apiKey = config.GOOGLE_VISION_API_KEY;
                this.updateStatus('Google Vision API configurada');
                console.log('Google Vision API carregada com sucesso');
                console.log('API Key:', this.apiKey.substring(0, 10) + '...');
                this.updateSetupStatus();
            } else {
                console.log('API Key inválida ou não configurada:', config.GOOGLE_VISION_API_KEY);
                throw new Error('Google Vision API Key não configurada no arquivo .env');
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            this.updateStatus('ERRO: Configure GOOGLE_VISION_API_KEY no arquivo .env');
            alert('ERRO: É necessário configurar GOOGLE_VISION_API_KEY no arquivo .env');
            throw error;
        }
    }
    
    async requestCameraAccess() {
        try {
            this.updateStatus('Solicitando acesso à câmera...');
            
            const constraints = {
                video: {
                    facingMode: 'environment', // Câmera traseira por padrão
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                console.log(`📹 Câmera configurada: ${this.video.videoWidth}x${this.video.videoHeight}`);
                this.setupROICanvas();
                this.loadNumberAreaFromStorage();
                this.loadCalibrationFromStorage();
                this.loadSavedCalibrationImage();
            });
            
            // Debug: verificar se vídeo está visível
            this.video.addEventListener('playing', () => {
                console.log('📹 Vídeo iniciado e reproduzindo');
                console.log('Dimensões do vídeo na tela:', this.video.offsetWidth, 'x', this.video.offsetHeight);
            });
            
            this.updateStatus('Câmera ativa');
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            this.updateStatus('Erro ao acessar câmera');
            alert('Não foi possível acessar a câmera. Verifique as permissões.');
        }
    }
    
    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.gpsStatus.textContent = 'GPS não disponível';
            return;
        }
        
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
            
            this.gpsStatus.innerHTML = `
                Lat: ${this.currentPosition.latitude.toFixed(6)}<br>
                Lng: ${this.currentPosition.longitude.toFixed(6)}<br>
                Precisão: ${Math.round(this.currentPosition.accuracy)}m
            `;
        } catch (error) {
            console.error('Erro ao obter localização:', error);
            this.gpsStatus.textContent = 'Erro ao obter GPS';
        }
    }
    
    async startDetection() {
        if (!this.apiKey) {
            alert('Google Vision API não configurada. Verifique o arquivo .env');
            return;
        }
        
        if (!this.numberArea.active) {
            alert('⚠️ ÁREA DO NÚMERO NÃO DEFINIDA\n\n' +
                  'É obrigatório definir onde fica o número no dorsal.\n\n' +
                  '1. Clique em "Definir Área do Número"\n' +
                  '2. Desenhe um retângulo na área do número (ex: 407)\n' +
                  '3. Depois inicie a detecção');
            return;
        }
        
        if (this.calibrationData.expectedNumbers.length === 0) {
            alert('⚠️ CALIBRAÇÃO NÃO FEITA\n\n' +
                  'É obrigatório calibrar o sistema.\n\n' +
                  '1. Clique em "Calibrar com Foto"\n' +
                  '2. Faça upload de uma foto de dorsal\n' +
                  '3. Digite o número que está na foto\n' +
                  '4. Depois inicie a detecção');
            return;
        }
        
        this.isDetecting = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.updateStatus('Aguardando movimento para capturar dorsais...');
        document.body.classList.add('detection-active');
        
        // Inicializar sistema de detecção de movimento
        this.motionDetection.enabled = true;
        this.motionDetection.previousFrame = null;
        this.motionDetection.lastMotionTime = 0;
        
        // Configurar canvas para detecção de movimento
        this.motionCanvas.width = this.video.videoWidth;
        this.motionCanvas.height = this.video.videoHeight;
        
        // Iniciar loop de detecção de movimento (mais frequente)
        this.detectionInterval = setInterval(() => {
            this.detectMotionAndCapture();
        }, 100); // Verificar movimento a cada 100ms
        
        // Iniciar processador de fila de capturas
        this.startCaptureProcessor();
        
        console.log('🎬 Sistema de detecção por movimento iniciado');
    }
    
    stopDetection() {
        this.isDetecting = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Detecção parada');
        document.body.classList.remove('detection-active');
        
        // Parar detecção de movimento
        this.motionDetection.enabled = false;
        this.motionDetection.captureQueue = [];
        this.motionDetection.isProcessing = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
        
        if (this.captureProcessor) {
            clearInterval(this.captureProcessor);
        }
        
        console.log('🛑 Sistema de detecção de movimento parado');
    }
    
    async testDetection() {
        if (!this.video.videoWidth) {
            alert('Câmera não está ativa ainda');
            return;
        }
        
        if (!this.numberArea.active) {
            alert('⚠️ ÁREA DO NÚMERO NÃO DEFINIDA\n\n' +
                  'É obrigatório definir onde fica o número no dorsal antes de testar.\n\n' +
                  'Clique em "Definir Área do Número" primeiro.');
            return;
        }
        
        if (this.calibrationData.expectedNumbers.length === 0) {
            alert('⚠️ CALIBRAÇÃO NÃO FEITA\n\n' +
                  'É obrigatório calibrar o sistema antes de testar.\n\n' +
                  'Clique em "Calibrar com Foto" primeiro.');
            return;
        }
        
        this.updateStatus('Testando detecção...');
        this.testBtn.disabled = true;
        
        try {
            // Capturar foto estática para teste
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const testImageData = this.canvas.toDataURL('image/jpeg', 0.95);
            
            console.log('🧪 TESTE: Iniciando análise em duas fases...');
            
            // Analisar usando o sistema de duas fases
            const detectedNumbers = await this.analyzeStaticPhoto(testImageData);
            
            if (detectedNumbers && detectedNumbers.length > 0) {
                this.updateStatus(`Teste: ${detectedNumbers.length} números detectados [${detectedNumbers.join(', ')}]`);
                console.log(`✅ TESTE: Números detectados [${detectedNumbers.join(', ')}]`);
                
                // Mostrar resultado visual
                alert(`✅ TESTE CONCLUÍDO\n\n` +
                      `Números detectados: ${detectedNumbers.join(', ')}\n\n` +
                      `${detectedNumbers.length} dorsal(is) encontrado(s).\n` +
                      `Verifique o console para logs detalhados.`);
            } else {
                this.updateStatus('Teste: Nenhum número detectado');
                console.log('⚠️ TESTE: Nenhum número detectado');
                
                alert('⚠️ NENHUM NÚMERO DETECTADO\n\n' +
                      'Possíveis problemas:\n' +
                      '• Dorsal não está visível na câmera\n' +
                      '• Área do número mal definida\n' +
                      '• Iluminação insuficiente\n' +
                      '• Dorsal muito pequeno ou borrado\n\n' +
                      'Verifique o console para logs detalhados.');
            }
        } catch (error) {
            console.error('Erro no teste:', error);
            this.updateStatus('Erro no teste');
            alert(`❌ ERRO NO TESTE\n\n${error.message}\n\nVerifique o console para mais detalhes.`);
        } finally {
            this.testBtn.disabled = false;
        }
    }
    
    startCalibration() {
        this.imageUpload.click();
    }
    
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.updateStatus('Calibrando com imagem de referência...');
        this.calibrateBtn.disabled = true;
        
        try {
            // Converter imagem para base64
            const base64Data = await this.fileToBase64(file);
            
            // Salvar imagem para usar na definição da área
            this.savedCalibrationImage = base64Data;
            localStorage.setItem('visionkrono_calibration_image', base64Data);
            
            // Solicitar ao usuário qual número deveria detectar
            const expectedNumber = prompt('Qual número está na imagem de referência? (ex: 407)');
            if (!expectedNumber) {
                this.updateStatus('Calibração cancelada');
                return;
            }
            
            const expectedNum = parseInt(expectedNumber);
            if (isNaN(expectedNum)) {
                alert('Por favor, digite apenas números');
                this.updateStatus('Erro na calibração');
                return;
            }
            
            // Testar diferentes parâmetros de pré-processamento
            await this.optimizeParameters(base64Data, expectedNum);
            
            // Após calibração bem-sucedida, verificar se área está definida
            if (!this.numberArea.active) {
                setTimeout(() => {
                    alert('🎯 PRÓXIMO PASSO: Definir Área do Número\n\n' +
                          'Agora clique em "Definir Área do Número" para\n' +
                          'desenhar onde fica o número na imagem que você enviou.');
                }, 1000);
            }
            
        } catch (error) {
            console.error('Erro na calibração:', error);
            this.updateStatus('Erro na calibração');
            alert('Erro ao processar a imagem de calibração');
        } finally {
            this.calibrateBtn.disabled = false;
            // Limpar o input
            this.imageUpload.value = '';
        }
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async optimizeParameters(imageData, expectedNumber) {
        console.log('🔧 Otimizando parâmetros para detectar:', expectedNumber);
        
        // Primeiro, testar com a imagem original sem pré-processamento
        console.log('📸 Testando imagem original sem pré-processamento...');
        try {
            const originalDetection = await this.analyzeImage(imageData);
            console.log('Detecção na imagem original:', originalDetection);
            
            // SEMPRE fazer calibração, mesmo se detectar na original
            if (originalDetection.includes(expectedNumber)) {
                console.log(`✅ Número ${expectedNumber} detectado na imagem original - continuando calibração para otimizar`);
            } else {
                console.log(`⚠️ Número ${expectedNumber} NÃO detectado na imagem original - calibração necessária`);
            }
        } catch (error) {
            console.error('Erro ao testar imagem original:', error);
        }
        
        const testParams = [
            { contrast: 1.0, threshold: 127 }, // Sem alteração
            { contrast: 1.2, threshold: 100 },
            { contrast: 1.5, threshold: 120 },
            { contrast: 1.8, threshold: 140 },
            { contrast: 2.0, threshold: 160 },
            { contrast: 1.3, threshold: 80 },
            { contrast: 0.8, threshold: 100 }, // Menos contraste
            { contrast: 2.5, threshold: 180 }, // Mais contraste
        ];
        
        let bestParams = null;
        let bestScore = 0;
        let allResults = [];
        
        for (let i = 0; i < testParams.length; i++) {
            const params = testParams[i];
            try {
                console.log(`\n🧪 Teste ${i + 1}/${testParams.length}: contrast=${params.contrast}, threshold=${params.threshold}`);
                
                // Temporariamente usar estes parâmetros
                const originalContrast = this.calibrationData.contrast;
                const originalThreshold = this.calibrationData.threshold;
                
                this.calibrationData.contrast = params.contrast;
                this.calibrationData.threshold = params.threshold;
                
                // Processar imagem com estes parâmetros
                const processedImage = await this.preprocessReferenceImage(imageData);
                const detectedNumbers = await this.analyzeImage(processedImage);
                
                // Calcular score baseado na detecção do número esperado
                const score = this.calculateDetectionScore(detectedNumbers, expectedNumber);
                
                const result = {
                    params,
                    detectedNumbers,
                    score,
                    found407: detectedNumbers.includes(expectedNumber)
                };
                
                allResults.push(result);
                
                console.log(`✅ Resultado: detectados=[${detectedNumbers.join(',')}], score=${score}, encontrou ${expectedNumber}=${result.found407}`);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestParams = params;
                }
                
                // Restaurar parâmetros originais
                this.calibrationData.contrast = originalContrast;
                this.calibrationData.threshold = originalThreshold;
                
                // Pequena pausa para não sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.warn(`❌ Erro no teste ${i + 1}:`, params, error.message);
                allResults.push({
                    params,
                    detectedNumbers: [],
                    score: 0,
                    error: error.message,
                    found407: false
                });
            }
        }
        
        // Mostrar resumo de todos os testes
        console.log('\n📊 RESUMO DE TODOS OS TESTES:');
        allResults.forEach((result, index) => {
            console.log(`Teste ${index + 1}: contrast=${result.params.contrast}, threshold=${result.params.threshold} → [${result.detectedNumbers.join(',')}] (score: ${result.score}) ${result.found407 ? '✅' : '❌'}`);
        });
        
        // Verificar se pelo menos um teste encontrou o número esperado
        const successfulTests = allResults.filter(r => r.found407);
        
        if (bestParams && bestScore > 0) {
            this.calibrationData.contrast = bestParams.contrast;
            this.calibrationData.threshold = bestParams.threshold;
            this.calibrationData.expectedNumbers.push(expectedNumber);
            
            // Salvar calibração no localStorage
            localStorage.setItem('visionkrono_calibration', JSON.stringify(this.calibrationData));
            
            this.updateStatus(`Calibração concluída! Parâmetros otimizados para detectar ${expectedNumber}`);
            this.updateSetupStatus();
            
            const message = `✅ Calibração bem-sucedida!\n\n` +
                `Parâmetros otimizados:\n` +
                `- Contraste: ${bestParams.contrast}\n` +
                `- Threshold: ${bestParams.threshold}\n` +
                `- Score: ${bestScore.toFixed(2)}\n\n` +
                `Testes que encontraram ${expectedNumber}: ${successfulTests.length}/${allResults.length}\n\n` +
                `A detecção agora está otimizada para dorsais similares ao ${expectedNumber}.`;
            
            alert(message);
            console.log('🎯 Calibração concluída:', this.calibrationData);
        } else if (successfulTests.length > 0) {
            // Se encontrou o número mas score foi baixo, usar o melhor resultado que encontrou
            const bestSuccessful = successfulTests.reduce((best, current) => 
                current.score > best.score ? current : best
            );
            
            this.calibrationData.contrast = bestSuccessful.params.contrast;
            this.calibrationData.threshold = bestSuccessful.params.threshold;
            this.calibrationData.expectedNumbers.push(expectedNumber);
            
            // Salvar calibração no localStorage
            localStorage.setItem('visionkrono_calibration', JSON.stringify(this.calibrationData));
            
            this.updateStatus(`Calibração parcial - ${expectedNumber} detectado com parâmetros alternativos`);
            this.updateSetupStatus();
            
            const message = `⚠️ Calibração parcial!\n\n` +
                `O número ${expectedNumber} foi detectado, mas com score baixo.\n\n` +
                `Parâmetros utilizados:\n` +
                `- Contraste: ${bestSuccessful.params.contrast}\n` +
                `- Threshold: ${bestSuccessful.params.threshold}\n` +
                `- Score: ${bestSuccessful.score}\n\n` +
                `Testes que encontraram ${expectedNumber}: ${successfulTests.length}/${allResults.length}`;
            
            alert(message);
            console.log('⚠️ Calibração parcial:', this.calibrationData);
        } else {
            // Mesmo se não detectou o número esperado, salvar calibração com parâmetros padrão
            console.log('⚠️ Forçando calibração com parâmetros padrão...');
            
            this.calibrationData.contrast = 1.5;
            this.calibrationData.threshold = 120;
            this.calibrationData.expectedNumbers.push(expectedNumber);
            
            // Salvar calibração no localStorage
            localStorage.setItem('visionkrono_calibration', JSON.stringify(this.calibrationData));
            
            this.updateStatus(`Calibração forçada - usando parâmetros padrão para ${expectedNumber}`);
            this.updateSetupStatus();
            
            const message = `⚠️ Calibração com parâmetros padrão!\n\n` +
                `O número ${expectedNumber} não foi detectado nos testes,\n` +
                `mas a calibração foi salva com parâmetros padrão.\n\n` +
                `Parâmetros utilizados:\n` +
                `- Contraste: 1.5\n` +
                `- Threshold: 120\n\n` +
                `Você pode tentar detectar mesmo assim.\n` +
                `Se não funcionar, tente uma foto com melhor qualidade.`;
            
            alert(message);
            console.log('⚠️ Calibração forçada com parâmetros padrão');
        }
    }
    
    async preprocessReferenceImage(imageData) {
        // Criar canvas para processar imagem de referência
        const img = new Image();
        return new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Desenhar imagem original
                ctx.drawImage(img, 0, 0);
                
                // Aplicar pré-processamento com parâmetros atuais
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Converter para escala de cinza
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    
                    // Aplicar contraste
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * this.calibrationData.contrast + 128));
                    
                    // Aplicar threshold
                    const binary = enhanced > this.calibrationData.threshold ? 255 : 0;
                    
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
    
    calculateDetectionScore(detectedNumbers, expectedNumber) {
        if (!detectedNumbers || detectedNumbers.length === 0) return 0;
        
        // Score principal: número esperado foi detectado?
        let score = 0;
        if (detectedNumbers.includes(expectedNumber)) {
            score += 100; // Bonus por detectar o número correto
        }
        
        // Penalizar muitos números falsos
        const falsePositives = detectedNumbers.filter(num => num !== expectedNumber).length;
        score -= falsePositives * 10;
        
        // Bonus se o número esperado for o primeiro/mais provável
        if (detectedNumbers[0] === expectedNumber) {
            score += 50;
        }
        
        return Math.max(0, score);
    }
    
    setupROICanvas() {
        // Ajustar tamanho do canvas ROI para coincidir com o vídeo
        this.roiCanvas.width = this.video.offsetWidth;
        this.roiCanvas.height = this.video.offsetHeight;
        this.roiCanvas.style.width = this.video.offsetWidth + 'px';
        this.roiCanvas.style.height = this.video.offsetHeight + 'px';
        
        // Redesenhar template da área do número se existir
        this.drawNumberAreaTemplate();
    }
    
    startNumberAreaSelection() {
        // Verificar se tem imagem de calibração salva
        const savedImage = localStorage.getItem('visionkrono_calibration_image');
        
        if (!savedImage) {
            alert('⚠️ IMAGEM DE CALIBRAÇÃO NÃO ENCONTRADA\n\n' +
                  'Você precisa fazer a calibração primeiro:\n\n' +
                  '1. Clique em "Calibrar com Foto"\n' +
                  '2. Faça upload da foto do dorsal\n' +
                  '3. Depois defina a área do número');
            return;
        }
        
        this.savedCalibrationImage = savedImage;
        this.openNumberAreaModal();
    }
    
    openNumberAreaModal() {
        // Mostrar modal
        this.numberAreaModal.style.display = 'flex';
        
        // Carregar imagem no modal
        this.calibrationImage.src = this.savedCalibrationImage;
        
        // Configurar canvas quando imagem carregar
        this.calibrationImage.onload = () => {
            this.setupModalCanvas();
        };
        
        console.log('📋 Modal de definição de área aberto');
    }
    
    setupModalCanvas() {
        // Ajustar canvas para coincidir com a imagem
        const img = this.calibrationImage;
        this.areaCanvas.width = img.offsetWidth;
        this.areaCanvas.height = img.offsetHeight;
        this.areaCanvas.style.width = img.offsetWidth + 'px';
        this.areaCanvas.style.height = img.offsetHeight + 'px';
        
        // Limpar canvas
        this.areaCtx.clearRect(0, 0, this.areaCanvas.width, this.areaCanvas.height);
        
        console.log(`📐 Canvas modal configurado: ${this.areaCanvas.width}x${this.areaCanvas.height}`);
    }
    
    closeModal() {
        this.numberAreaModal.style.display = 'none';
        this.resetModalDrawing();
    }
    
    resetModalDrawing() {
        this.modalDrawing.isDrawing = false;
        this.areaCtx.clearRect(0, 0, this.areaCanvas.width, this.areaCanvas.height);
        this.confirmAreaBtn.disabled = true;
    }
    
    resetNumberArea() {
        this.resetModalDrawing();
    }
    
    // Eventos do mouse no modal
    onModalMouseDown(e) {
        const rect = this.areaCanvas.getBoundingClientRect();
        this.modalDrawing.isDrawing = true;
        this.modalDrawing.startX = e.clientX - rect.left;
        this.modalDrawing.startY = e.clientY - rect.top;
        
        console.log(`🖱️ Início do desenho: (${this.modalDrawing.startX}, ${this.modalDrawing.startY})`);
    }
    
    onModalMouseMove(e) {
        if (!this.modalDrawing.isDrawing) return;
        
        const rect = this.areaCanvas.getBoundingClientRect();
        this.modalDrawing.currentX = e.clientX - rect.left;
        this.modalDrawing.currentY = e.clientY - rect.top;
        
        this.drawModalArea();
    }
    
    onModalMouseUp(e) {
        if (this.modalDrawing.isDrawing) {
            this.modalDrawing.isDrawing = false;
            this.confirmAreaBtn.disabled = false;
            
            console.log(`🖱️ Fim do desenho: (${this.modalDrawing.currentX}, ${this.modalDrawing.currentY})`);
        }
    }
    
    // Touch events para mobile no modal
    onModalTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onModalMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onModalTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onModalMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onModalTouchEnd(e) {
        e.preventDefault();
        this.onModalMouseUp(e);
    }
    
    drawModalArea() {
        // Limpar canvas
        this.areaCtx.clearRect(0, 0, this.areaCanvas.width, this.areaCanvas.height);
        
        // Calcular dimensões do retângulo
        const width = this.modalDrawing.currentX - this.modalDrawing.startX;
        const height = this.modalDrawing.currentY - this.modalDrawing.startY;
        
        // Desenhar retângulo
        this.areaCtx.strokeStyle = '#ff6b35';
        this.areaCtx.lineWidth = 3;
        this.areaCtx.setLineDash([5, 5]);
        this.areaCtx.strokeRect(this.modalDrawing.startX, this.modalDrawing.startY, width, height);
        
        // Adicionar texto
        this.areaCtx.fillStyle = '#ff6b35';
        this.areaCtx.font = '16px Arial';
        this.areaCtx.fillText('Área do Número', this.modalDrawing.startX, this.modalDrawing.startY - 10);
    }
    
    confirmNumberArea() {
        // Calcular área relativa baseada na imagem
        const imgWidth = this.calibrationImage.offsetWidth;
        const imgHeight = this.calibrationImage.offsetHeight;
        
        let x = this.modalDrawing.startX;
        let y = this.modalDrawing.startY;
        let width = this.modalDrawing.currentX - this.modalDrawing.startX;
        let height = this.modalDrawing.currentY - this.modalDrawing.startY;
        
        // Normalizar se necessário
        if (width < 0) {
            x += width;
            width = Math.abs(width);
        }
        if (height < 0) {
            y += height;
            height = Math.abs(height);
        }
        
        // Converter para coordenadas relativas (0-1)
        this.numberArea.x = x / imgWidth;
        this.numberArea.y = y / imgHeight;
        this.numberArea.width = width / imgWidth;
        this.numberArea.height = height / imgHeight;
        this.numberArea.active = true;
        
        // Salvar
        localStorage.setItem('visionkrono_number_area', JSON.stringify(this.numberArea));
        
        console.log('✅ Área do número definida:', this.numberArea);
        
        // Fechar modal
        this.closeModal();
        
        // Atualizar status
        this.updateSetupStatus();
        this.updateStatus(`Template do número definido: ${(this.numberArea.width*100).toFixed(1)}% x ${(this.numberArea.height*100).toFixed(1)}%`);
        
        alert(`✅ Área do Número Definida!\n\n` +
              `Posição: ${(this.numberArea.x*100).toFixed(1)}%, ${(this.numberArea.y*100).toFixed(1)}%\n` +
              `Tamanho: ${(this.numberArea.width*100).toFixed(1)}% x ${(this.numberArea.height*100).toFixed(1)}%\n\n` +
              `Agora você pode usar "Testar Agora" ou "Iniciar Detecção"!`);
    }
    
    onROIMouseDown(e) {
        if (this.setNumberAreaBtn.disabled) {
            this.isDrawingROI = true;
            const rect = this.video.getBoundingClientRect();
            this.roiStartX = e.clientX - rect.left;
            this.roiStartY = e.clientY - rect.top;
            
            // Salvar coordenadas de tela para calcular área relativa depois
            this.numberArea.startX = this.roiStartX;
            this.numberArea.startY = this.roiStartY;
        }
    }
    
    onROIMouseMove(e) {
        if (this.isDrawingROI) {
            const rect = this.video.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            // Calcular área temporária para visualização
            this.numberArea.tempWidth = currentX - this.roiStartX;
            this.numberArea.tempHeight = currentY - this.roiStartY;
            
            this.drawNumberAreaTemplate();
        }
    }
    
    onROIMouseUp(e) {
        if (this.isDrawingROI) {
            this.isDrawingROI = false;
            this.finishNumberAreaSelection();
        }
    }
    
    // Eventos touch para mobile
    onROITouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onROIMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onROITouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onROIMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onROITouchEnd(e) {
        e.preventDefault();
        this.onROIMouseUp(e);
    }
    
    finishNumberAreaSelection() {
        // Calcular área relativa (0-1) baseada no tamanho da tela
        let width = Math.abs(this.numberArea.tempWidth);
        let height = Math.abs(this.numberArea.tempHeight);
        
        let x = this.numberArea.startX;
        let y = this.numberArea.startY;
        
        // Normalizar coordenadas se necessário
        if (this.numberArea.tempWidth < 0) {
            x += this.numberArea.tempWidth;
        }
        if (this.numberArea.tempHeight < 0) {
            y += this.numberArea.tempHeight;
        }
        
        // Converter para coordenadas relativas (0-1)
        const videoWidth = this.video.offsetWidth;
        const videoHeight = this.video.offsetHeight;
        
        this.numberArea.x = x / videoWidth;
        this.numberArea.y = y / videoHeight;
        this.numberArea.width = width / videoWidth;
        this.numberArea.height = height / videoHeight;
        
        // Verificar se área é válida
        if (this.numberArea.width > 0.05 && this.numberArea.height > 0.05) { // Mínimo 5% da tela
            this.numberArea.active = true;
            this.updateStatus(`Template do número definido: ${(this.numberArea.width*100).toFixed(1)}% x ${(this.numberArea.height*100).toFixed(1)}%`);
            console.log('Template da área do número definido:', this.numberArea);
            
            // Salvar template no localStorage
            localStorage.setItem('visionkrono_number_area', JSON.stringify(this.numberArea));
            
            alert(`✅ Template definido!\n\n` +
                  `Área do número: ${(this.numberArea.width*100).toFixed(1)}% x ${(this.numberArea.height*100).toFixed(1)}%\n` +
                  `Posição: ${(this.numberArea.x*100).toFixed(1)}%, ${(this.numberArea.y*100).toFixed(1)}%\n\n` +
                  `Agora quando detectar dorsais, vai focar apenas nesta área para ler o número.`);
            
            this.updateSetupStatus();
        } else {
            this.updateStatus('Área muito pequena, tente novamente');
            this.numberArea.active = false;
        }
        
        // Desabilitar interação
        this.video.style.pointerEvents = 'none';
        this.roiCanvas.style.pointerEvents = 'none';
        this.setNumberAreaBtn.textContent = 'Definir Área do Número';
        this.setNumberAreaBtn.disabled = false;
        
        this.drawNumberAreaTemplate();
    }
    
    drawNumberAreaTemplate() {
        // Limpar canvas
        this.roiCtx.clearRect(0, 0, this.roiCanvas.width, this.roiCanvas.height);
        
        if (this.numberArea.active || this.isDrawingROI) {
            let x, y, width, height;
            
            if (this.isDrawingROI) {
                // Durante desenho
                x = this.numberArea.startX;
                y = this.numberArea.startY;
                width = this.numberArea.tempWidth || 0;
                height = this.numberArea.tempHeight || 0;
                
                // Normalizar se negativo
                if (width < 0) {
                    x += width;
                    width = Math.abs(width);
                }
                if (height < 0) {
                    y += height;
                    height = Math.abs(height);
                }
            } else {
                // Área definida - converter de relativo para absoluto
                x = this.numberArea.x * this.video.offsetWidth;
                y = this.numberArea.y * this.video.offsetHeight;
                width = this.numberArea.width * this.video.offsetWidth;
                height = this.numberArea.height * this.video.offsetHeight;
            }
            
            // Desenhar retângulo da área do número
            this.roiCtx.strokeStyle = '#ff6b35'; // Laranja para diferenciar
            this.roiCtx.lineWidth = 3;
            this.roiCtx.setLineDash([5, 5]);
            this.roiCtx.strokeRect(x, y, width, height);
            
            // Adicionar texto explicativo
            if (this.numberArea.active) {
                this.roiCtx.fillStyle = '#ff6b35';
                this.roiCtx.font = '14px Arial';
                this.roiCtx.fillText('Template do Número', x, y - 10);
                
                // Mostrar porcentagem
                this.roiCtx.font = '12px Arial';
                this.roiCtx.fillText(`${(this.numberArea.width*100).toFixed(0)}% x ${(this.numberArea.height*100).toFixed(0)}%`, x, y + height + 20);
            }
        }
    }
    
    loadNumberAreaFromStorage() {
        // Carregar template da área do número
        const savedArea = localStorage.getItem('visionkrono_number_area');
        if (savedArea) {
            try {
                this.numberArea = JSON.parse(savedArea);
                console.log('Template da área do número carregado:', this.numberArea);
                this.drawNumberAreaTemplate();
                this.updateSetupStatus();
            } catch (error) {
                console.warn('Erro ao carregar template da área:', error);
            }
        }
    }
    
    loadCalibrationFromStorage() {
        // Carregar calibração salva
        const savedCalibration = localStorage.getItem('visionkrono_calibration');
        if (savedCalibration) {
            try {
                const loaded = JSON.parse(savedCalibration);
                this.calibrationData = { ...this.calibrationData, ...loaded };
                console.log('Calibração carregada:', this.calibrationData);
                this.updateSetupStatus();
            } catch (error) {
                console.warn('Erro ao carregar calibração:', error);
            }
        }
    }
    
    loadSavedCalibrationImage() {
        // Carregar imagem de calibração salva
        const savedImage = localStorage.getItem('visionkrono_calibration_image');
        if (savedImage) {
            this.savedCalibrationImage = savedImage;
            console.log('📸 Imagem de calibração carregada');
        }
    }
    
    drawROI() {
        // Limpar canvas
        this.roiCtx.clearRect(0, 0, this.roiCanvas.width, this.roiCanvas.height);
        
        if (this.roi.active || this.isDrawingROI) {
            // Converter coordenadas do vídeo para canvas
            const scaleX = this.video.offsetWidth / this.video.videoWidth;
            const scaleY = this.video.offsetHeight / this.video.videoHeight;
            
            const x = this.roi.x * scaleX;
            const y = this.roi.y * scaleY;
            const width = this.roi.width * scaleX;
            const height = this.roi.height * scaleY;
            
            // Desenhar retângulo ROI
            this.roiCtx.strokeStyle = '#00ff88';
            this.roiCtx.lineWidth = 3;
            this.roiCtx.setLineDash([10, 5]);
            this.roiCtx.strokeRect(x, y, width, height);
            
            // Desenhar fundo semi-transparente fora da ROI
            this.roiCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.roiCtx.fillRect(0, 0, this.roiCanvas.width, this.roiCanvas.height);
            
            // Limpar área ROI (tornar transparente)
            this.roiCtx.clearRect(x, y, width, height);
            
            // Desenhar borda da ROI novamente
            this.roiCtx.strokeStyle = '#00ff88';
            this.roiCtx.lineWidth = 3;
            this.roiCtx.setLineDash([10, 5]);
            this.roiCtx.strokeRect(x, y, width, height);
            
            // Adicionar texto explicativo
            if (this.roi.active) {
                this.roiCtx.fillStyle = '#00ff88';
                this.roiCtx.font = '16px Arial';
                this.roiCtx.fillText('Área de Detecção', x, y - 10);
            }
        }
    }
    
    loadROIFromStorage() {
        // Carregar ROI salvo
        const savedROI = localStorage.getItem('visionkrono_roi');
        if (savedROI) {
            try {
                this.roi = JSON.parse(savedROI);
                console.log('ROI carregado:', this.roi);
                this.drawROI();
            } catch (error) {
                console.warn('Erro ao carregar ROI:', error);
            }
        }
    }
    
    async captureAndAnalyze() {
        if (!this.video.videoWidth) return;
        
        try {
            // Capturar frame completo
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            console.log('🎥 Capturando frame da câmera para análise...');
            
            // Usar detecção com múltiplas tentativas para melhor precisão
            const detectedNumbers = await this.detectWithMultipleAttempts();
            
            if (detectedNumbers && detectedNumbers.length > 0) {
                console.log('✅ Números detectados na câmera:', detectedNumbers);
                this.processDetections(detectedNumbers);
            } else {
                console.log('⚠️ Nenhum número detectado neste frame');
            }
        } catch (error) {
            console.error('Erro na análise:', error);
        }
    }
    
    async detectWithMultipleAttempts() {
        const allDetectedNumbers = [];
        
        // Lista de parâmetros para tentar (incluindo os calibrados)
        const paramSets = [
            // Usar parâmetros calibrados primeiro
            { contrast: this.calibrationData.contrast, threshold: this.calibrationData.threshold, name: "Calibrados" },
            // Parâmetros alternativos para diferentes condições
            { contrast: 1.0, threshold: 127, name: "Padrão" },
            { contrast: 1.5, threshold: 120, name: "Médio contraste" },
            { contrast: 2.0, threshold: 140, name: "Alto contraste" },
            { contrast: 1.2, threshold: 100, name: "Baixo threshold" },
        ];
        
        console.log(`🔄 Testando ${paramSets.length} configurações diferentes...`);
        
        for (let i = 0; i < paramSets.length; i++) {
            const params = paramSets[i];
            
            try {
                console.log(`🧪 Tentativa ${i + 1}: ${params.name} (contrast=${params.contrast}, threshold=${params.threshold})`);
                
                // Temporariamente usar estes parâmetros
                const originalContrast = this.calibrationData.contrast;
                const originalThreshold = this.calibrationData.threshold;
                
                this.calibrationData.contrast = params.contrast;
                this.calibrationData.threshold = params.threshold;
                
                // Processar com estes parâmetros
                let processedImageData;
                if (this.roi.active) {
                    processedImageData = this.preprocessImageWithROI();
                } else {
                    processedImageData = this.preprocessImage();
                }
                
                // Analisar com Google Vision
                const detectedNumbers = await this.analyzeImage(processedImageData);
                
                console.log(`📊 Resultado tentativa ${i + 1}: [${detectedNumbers.join(', ')}]`);
                
                // Adicionar números únicos à lista
                detectedNumbers.forEach(num => {
                    if (!allDetectedNumbers.includes(num)) {
                        allDetectedNumbers.push(num);
                    }
                });
                
                // Restaurar parâmetros originais
                this.calibrationData.contrast = originalContrast;
                this.calibrationData.threshold = originalThreshold;
                
                // Se encontrou números esperados, pode parar mais cedo
                if (this.calibrationData.expectedNumbers.length > 0) {
                    const foundExpected = detectedNumbers.some(num => 
                        this.calibrationData.expectedNumbers.includes(num)
                    );
                    if (foundExpected) {
                        console.log(`🎯 Encontrou número esperado na tentativa ${i + 1}, parando busca`);
                        break;
                    }
                }
                
                // Pequena pausa entre tentativas
                if (i < paramSets.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                console.warn(`❌ Erro na tentativa ${i + 1}:`, error.message);
            }
        }
        
        // Filtrar e priorizar números
        const filteredNumbers = this.filterAndPrioritizeNumbers(allDetectedNumbers);
        
        console.log(`🏁 Resultado final de todas as tentativas: [${filteredNumbers.join(', ')}]`);
        
        // Atualizar status visual se estiver detectando
        if (this.isDetecting) {
            this.updateDetectionStatus(allDetectedNumbers, filteredNumbers);
        }
        
        return filteredNumbers;
    }
    
    filterAndPrioritizeNumbers(numbers) {
        if (numbers.length === 0) return [];
        
        // Filtrar números válidos
        const validNumbers = numbers.filter(num => num >= 1 && num <= 9999);
        
        // Priorizar números esperados (calibrados)
        const prioritized = [];
        const others = [];
        
        validNumbers.forEach(num => {
            if (this.calibrationData.expectedNumbers.includes(num)) {
                prioritized.push(num);
            } else {
                others.push(num);
            }
        });
        
        // Retornar números esperados primeiro, depois outros
        const result = [...prioritized, ...others];
        
        // Remover duplicatas mantendo ordem
        return [...new Set(result)];
    }
    
    detectMotionAndCapture() {
        if (!this.motionDetection.enabled || !this.video.videoWidth) return;
        
        // Capturar frame atual para análise de movimento
        this.motionCtx.drawImage(this.video, 0, 0, this.motionCanvas.width, this.motionCanvas.height);
        const currentFrame = this.motionCtx.getImageData(0, 0, this.motionCanvas.width, this.motionCanvas.height);
        
        if (this.motionDetection.previousFrame) {
            const motionDetected = this.compareFrames(this.motionDetection.previousFrame, currentFrame);
            
            if (motionDetected) {
                const now = Date.now();
                
                // Verificar cooldown para evitar capturas muito frequentes
                if (now - this.motionDetection.lastMotionTime > this.motionDetection.cooldownPeriod) {
                    this.captureStaticPhoto();
                    this.motionDetection.lastMotionTime = now;
                    console.log('📸 Movimento detectado - foto capturada');
                }
            }
        }
        
        // Salvar frame atual para próxima comparação
        this.motionDetection.previousFrame = currentFrame;
    }
    
    compareFrames(frame1, frame2) {
        const data1 = frame1.data;
        const data2 = frame2.data;
        let changedPixels = 0;
        
        // Comparar apenas uma amostra de pixels para performance (a cada 4 pixels)
        for (let i = 0; i < data1.length; i += 16) { // 4 pixels * 4 components = 16
            const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
            const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
            
            // Calcular diferença de luminosidade
            const diff = Math.abs((r1 + g1 + b1) - (r2 + g2 + b2));
            
            if (diff > this.motionDetection.threshold) {
                changedPixels++;
            }
        }
        
        return changedPixels > this.motionDetection.minChangedPixels;
    }
    
    captureStaticPhoto() {
        // Capturar foto estática de alta qualidade
        const photoCanvas = document.createElement('canvas');
        const photoCtx = photoCanvas.getContext('2d');
        
        photoCanvas.width = this.video.videoWidth;
        photoCanvas.height = this.video.videoHeight;
        
        // Capturar frame atual
        photoCtx.drawImage(this.video, 0, 0, photoCanvas.width, photoCanvas.height);
        
        // Converter para base64
        const photoData = photoCanvas.toDataURL('image/jpeg', 0.95); // Alta qualidade
        
        // Adicionar à fila de processamento
        const capture = {
            id: Date.now(),
            imageData: photoData,
            timestamp: new Date(),
            processed: false
        };
        
        this.motionDetection.captureQueue.push(capture);
        
        // Atualizar status
        this.updateStatus(`Foto capturada - ${this.motionDetection.captureQueue.length} na fila`);
        
        console.log(`📷 Foto ${capture.id} adicionada à fila (${this.motionDetection.captureQueue.length} fotos)`);
    }
    
    startCaptureProcessor() {
        // Processar fila de capturas a cada 2 segundos
        this.captureProcessor = setInterval(() => {
            this.processCaptureQueue();
        }, 2000);
    }
    
    async processCaptureQueue() {
        if (this.motionDetection.isProcessing || this.motionDetection.captureQueue.length === 0) {
            return;
        }
        
        this.motionDetection.isProcessing = true;
        
        // Processar próxima foto da fila
        const capture = this.motionDetection.captureQueue.shift();
        
        console.log(`🔍 Processando foto ${capture.id}...`);
        this.updateStatus(`Analisando foto ${capture.id}...`);
        
        try {
            // Analisar foto estática para múltiplos dorsais
            const detectedNumbers = await this.analyzeStaticPhoto(capture.imageData);
            
            if (detectedNumbers && detectedNumbers.length > 0) {
                console.log(`✅ Foto ${capture.id}: encontrados [${detectedNumbers.join(', ')}]`);
                
                // Processar cada número detectado
                detectedNumbers.forEach(number => {
                    this.processDetection(number, capture.timestamp);
                });
                
                this.updateStatus(`Foto ${capture.id}: ${detectedNumbers.length} dorsais detectados`);
            } else {
                console.log(`⚠️ Foto ${capture.id}: nenhum dorsal detectado`);
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar foto ${capture.id}:`, error);
        }
        
        this.motionDetection.isProcessing = false;
        
        // Se ainda há fotos na fila, atualizar status
        if (this.motionDetection.captureQueue.length > 0) {
            this.updateStatus(`${this.motionDetection.captureQueue.length} fotos aguardando processamento`);
        } else {
            this.updateStatus('Aguardando movimento...');
        }
    }
    
    async analyzeStaticPhoto(imageData) {
        console.log('📊 Analisando foto estática em duas fases...');
        
        // FASE 1: Detectar dorsais na imagem completa
        console.log('🔍 FASE 1: Procurando dorsais na imagem completa...');
        const dorsalRegions = await this.detectDorsalRegions(imageData);
        
        if (dorsalRegions.length === 0) {
            console.log('⚠️ Nenhum dorsal detectado na imagem');
            return [];
        }
        
        console.log(`✅ FASE 1: ${dorsalRegions.length} dorsais encontrados`);
        
        // FASE 2: Extrair números de cada dorsal detectado
        console.log('🔍 FASE 2: Extraindo números de cada dorsal...');
        const allNumbers = [];
        
        for (let i = 0; i < dorsalRegions.length; i++) {
            const region = dorsalRegions[i];
            console.log(`📋 Analisando dorsal ${i + 1}/${dorsalRegions.length}...`);
            
            try {
                // Extrair área do número baseada no template definido
                const numberImage = await this.extractNumberFromDorsal(imageData, region);
                
                // Analisar apenas a área do número
                const numbers = await this.analyzeNumberArea(numberImage);
                
                if (numbers.length > 0) {
                    console.log(`✅ Dorsal ${i + 1}: números [${numbers.join(', ')}]`);
                    allNumbers.push(...numbers);
                } else {
                    console.log(`⚠️ Dorsal ${i + 1}: nenhum número detectado`);
                }
                
                // Pequena pausa entre análises
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.warn(`❌ Erro ao analisar dorsal ${i + 1}:`, error.message);
            }
        }
        
        // Filtrar e retornar números únicos
        const filteredNumbers = this.filterDorsalNumbers(allNumbers);
        console.log(`🏁 RESULTADO FINAL: [${filteredNumbers.join(', ')}]`);
        
        return filteredNumbers;
    }
    
    async detectDorsalRegions(imageData) {
        // FASE 1: Usar Google Vision para detectar texto/objetos na imagem completa
        console.log('🔍 Procurando por dorsais/texto na imagem completa...');
        
        try {
            // Analisar imagem completa para encontrar regiões com texto
            const base64Data = imageData.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: {
                        content: base64Data
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 50
                        },
                        {
                            type: 'OBJECT_LOCALIZATION',
                            maxResults: 20
                        }
                    ]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const result = await response.json();
            return this.extractDorsalRegions(result);
            
        } catch (error) {
            console.error('Erro na detecção de dorsais:', error);
            return [];
        }
    }
    
    extractDorsalRegions(apiResult) {
        const regions = [];
        
        if (apiResult.responses && apiResult.responses.length > 0) {
            const response = apiResult.responses[0];
            
            // Procurar por anotações de texto que podem ser dorsais
            if (response.textAnnotations && response.textAnnotations.length > 0) {
                console.log(`📝 ${response.textAnnotations.length} anotações de texto encontradas`);
                
                // Pular o primeiro (texto completo) e analisar anotações individuais
                response.textAnnotations.slice(1).forEach((annotation, index) => {
                    const text = annotation.description;
                    
                    // Verificar se parece com um número de dorsal
                    if (/^\d{1,4}$/.test(text)) {
                        const vertices = annotation.boundingPoly.vertices;
                        
                        if (vertices && vertices.length >= 4) {
                            // Calcular bounding box
                            const xs = vertices.map(v => v.x || 0);
                            const ys = vertices.map(v => v.y || 0);
                            
                            const region = {
                                id: index,
                                text: text,
                                x: Math.min(...xs),
                                y: Math.min(...ys),
                                width: Math.max(...xs) - Math.min(...xs),
                                height: Math.max(...ys) - Math.min(...ys)
                            };
                            
                            // Expandir região para capturar contexto do dorsal
                            const expandedRegion = this.expandRegionForDorsal(region);
                            regions.push(expandedRegion);
                            
                            console.log(`📍 Dorsal candidato: "${text}" em (${region.x}, ${region.y}) ${region.width}x${region.height}`);
                        }
                    }
                });
            }
            
            // Também verificar objetos localizados que podem ser dorsais
            if (response.localizedObjectAnnotations) {
                response.localizedObjectAnnotations.forEach((obj, index) => {
                    if (obj.name && obj.name.toLowerCase().includes('person')) {
                        // Região de pessoa detectada - pode conter dorsal
                        const box = obj.boundingPoly.normalizedVertices;
                        if (box && box.length >= 4) {
                            // Converter coordenadas normalizadas para pixels (assumindo imagem padrão)
                            const region = {
                                id: `person_${index}`,
                                text: 'person',
                                x: Math.min(...box.map(v => v.x || 0)) * 1000, // Assumindo 1000px de largura
                                y: Math.min(...box.map(v => v.y || 0)) * 1000,
                                width: (Math.max(...box.map(v => v.x || 0)) - Math.min(...box.map(v => v.x || 0))) * 1000,
                                height: (Math.max(...box.map(v => v.y || 0)) - Math.min(...box.map(v => v.y || 0))) * 1000
                            };
                            
                            regions.push(region);
                            console.log(`👤 Pessoa detectada em (${region.x}, ${region.y}) ${region.width}x${region.height}`);
                        }
                    }
                });
            }
        }
        
        console.log(`📊 Total de regiões candidatas: ${regions.length}`);
        return regions;
    }
    
    expandRegionForDorsal(region) {
        // Expandir região do número para capturar todo o dorsal
        const expansion = 2.0; // Multiplicador para expandir área
        
        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;
        
        const newWidth = region.width * expansion;
        const newHeight = region.height * expansion;
        
        return {
            ...region,
            x: Math.max(0, centerX - newWidth / 2),
            y: Math.max(0, centerY - newHeight / 2),
            width: newWidth,
            height: newHeight,
            originalNumber: region
        };
    }
    
    async extractNumberFromDorsal(fullImageData, dorsalRegion) {
        // Extrair área específica do número baseada no template definido
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Se área do número foi definida, usar coordenadas relativas
                if (this.numberArea.active) {
                    // Calcular posição absoluta da área do número dentro do dorsal
                    const numberX = dorsalRegion.x + (dorsalRegion.width * this.numberArea.x);
                    const numberY = dorsalRegion.y + (dorsalRegion.height * this.numberArea.y);
                    const numberWidth = dorsalRegion.width * this.numberArea.width;
                    const numberHeight = dorsalRegion.height * this.numberArea.height;
                    
                    canvas.width = Math.max(50, numberWidth);
                    canvas.height = Math.max(50, numberHeight);
                    
                    console.log(`📏 Template: ${(this.numberArea.x*100).toFixed(1)}%, ${(this.numberArea.y*100).toFixed(1)}%, ${(this.numberArea.width*100).toFixed(1)}%, ${(this.numberArea.height*100).toFixed(1)}%`);
                    console.log(`📐 Dorsal região: (${dorsalRegion.x}, ${dorsalRegion.y}) ${dorsalRegion.width}x${dorsalRegion.height}`);
                    console.log(`🎯 Área calculada do número: (${Math.round(numberX)}, ${Math.round(numberY)}) ${Math.round(numberWidth)}x${Math.round(numberHeight)}`);
                    
                    // Extrair apenas a área do número
                    ctx.drawImage(
                        img,
                        numberX, numberY, numberWidth, numberHeight,
                        0, 0, canvas.width, canvas.height
                    );
                } else {
                    // Se área não definida, usar região central do dorsal (estimativa)
                    const centerX = dorsalRegion.x + dorsalRegion.width * 0.25;
                    const centerY = dorsalRegion.y + dorsalRegion.height * 0.3;
                    const centerWidth = dorsalRegion.width * 0.5;
                    const centerHeight = dorsalRegion.height * 0.4;
                    
                    canvas.width = Math.max(50, centerWidth);
                    canvas.height = Math.max(50, centerHeight);
                    
                    ctx.drawImage(
                        img,
                        centerX, centerY, centerWidth, centerHeight,
                        0, 0, canvas.width, canvas.height
                    );
                    
                    console.log(`📐 Usando área estimada do centro: (${centerX}, ${centerY}) ${centerWidth}x${centerHeight}`);
                }
                
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.src = fullImageData;
        });
    }
    
    async analyzeNumberArea(numberImageData) {
        // Analisar apenas a área extraída do número
        console.log('🔢 Analisando área específica do número...');
        
        try {
            // Aplicar pré-processamento otimizado para números
            const processedImage = await this.preprocessNumberArea(numberImageData);
            
            // Enviar para Google Vision
            const base64Data = processedImage.split(',')[1];
            
            const requestBody = {
                requests: [{
                    image: {
                        content: base64Data
                    },
                    features: [{
                        type: 'TEXT_DETECTION',
                        maxResults: 10
                    }]
                }]
            };
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const result = await response.json();
            return this.extractNumbersFromVision(result);
            
        } catch (error) {
            console.error('Erro na análise da área do número:', error);
            return [];
        }
    }
    
    async preprocessNumberArea(imageData) {
        // Pré-processamento específico para área do número
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                // Aplicar pré-processamento agressivo para números
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Usar parâmetros mais agressivos para área pequena do número
                const contrast = this.calibrationData.contrast * 1.2; // Mais contraste
                const threshold = this.calibrationData.threshold - 20; // Threshold mais baixo
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
                    const binary = enhanced > threshold ? 255 : 0;
                    
                    data[i] = binary;
                    data[i + 1] = binary;
                    data[i + 2] = binary;
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.src = imageData;
        });
    }
    
    async preprocessStaticImage(imageData) {
        // Processar imagem estática completa
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                // Aplicar pré-processamento
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                const contrast = this.calibrationData.contrast;
                const threshold = this.calibrationData.threshold;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
                    const binary = enhanced > threshold ? 255 : 0;
                    
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
    
    async preprocessStaticImageWithROI(imageData) {
        // Processar apenas região ROI da imagem estática
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Definir tamanho baseado na ROI
                canvas.width = Math.max(100, this.roi.width);
                canvas.height = Math.max(100, this.roi.height);
                
                // Extrair apenas área ROI
                ctx.drawImage(
                    img,
                    this.roi.x, this.roi.y, this.roi.width, this.roi.height,
                    0, 0, canvas.width, canvas.height
                );
                
                // Aplicar pré-processamento
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                const contrast = this.calibrationData.contrast;
                const threshold = this.calibrationData.threshold;
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
                    const binary = enhanced > threshold ? 255 : 0;
                    
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
    
    processDetection(number, timestamp) {
        // Processar detecção individual de um dorsal
        const detection = {
            number: number,
            timestamp: timestamp.toISOString(),
            time: timestamp.toLocaleTimeString('pt-BR'),
            latitude: this.currentPosition ? this.currentPosition.latitude : null,
            longitude: this.currentPosition ? this.currentPosition.longitude : null,
            accuracy: this.currentPosition ? this.currentPosition.accuracy : null
        };
        
        // Verificar duplicatas recentes (últimos 5 segundos)
        const recentDetection = this.detections.find(d => 
            d.number === number && 
            (timestamp - new Date(d.timestamp)) < 5000
        );
        
        if (!recentDetection) {
            this.detections.push(detection);
            this.totalDetected++;
            this.updateLastDetection(detection);
            this.updateStats();
            this.flashDetection();
            
            console.log('✅ Dorsal registrado:', detection);
        } else {
            console.log('⚠️ Dorsal duplicado ignorado:', number);
        }
    }
    
    preprocessImageWithROI() {
        // Criar canvas temporário para processar apenas a ROI
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Definir tamanho do canvas como o tamanho da ROI
        tempCanvas.width = Math.max(100, this.roi.width); // Mínimo 100px
        tempCanvas.height = Math.max(100, this.roi.height); // Mínimo 100px
        
        // Extrair apenas a área ROI da imagem original
        tempCtx.drawImage(
            this.canvas,
            this.roi.x, this.roi.y, this.roi.width, this.roi.height,  // Área fonte (ROI)
            0, 0, tempCanvas.width, tempCanvas.height                    // Destino (canvas completo)
        );
        
        // Obter dados da ROI
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Usar parâmetros de calibração
        const contrast = this.calibrationData.contrast;
        const threshold = this.calibrationData.threshold;
        
        console.log(`Pré-processamento ROI com: contraste=${contrast}, threshold=${threshold}`);
        
        // Aplicar filtros apenas na área ROI
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Converter para escala de cinza
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Aumentar contraste
            const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
            
            // Aplicar threshold
            const binary = enhanced > threshold ? 255 : 0;
            
            data[i] = binary;
            data[i + 1] = binary;
            data[i + 2] = binary;
        }
        
        // Aplicar os dados processados
        tempCtx.putImageData(imageData, 0, 0);
        
        // Retornar como base64
        return tempCanvas.toDataURL('image/jpeg', 0.9);
    }
    
    preprocessImage() {
        // Criar canvas temporário para processamento
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Copiar imagem original
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Obter dados da imagem
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Usar parâmetros de calibração se disponíveis
        const contrast = this.calibrationData.contrast;
        const threshold = this.calibrationData.threshold;
        
        console.log(`Pré-processamento com: contraste=${contrast}, threshold=${threshold}`);
        
        // Aplicar filtros para melhorar detecção de texto
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Converter para escala de cinza com pesos otimizados para texto
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Aumentar contraste usando parâmetros calibrados
            const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
            
            // Aplicar threshold calibrado para binarizar (preto/branco)
            const binary = enhanced > threshold ? 255 : 0;
            
            data[i] = binary;     // R
            data[i + 1] = binary; // G
            data[i + 2] = binary; // B
            // Alpha permanece igual
        }
        
        // Aplicar os dados processados
        tempCtx.putImageData(imageData, 0, 0);
        
        // Retornar como base64
        return tempCanvas.toDataURL('image/jpeg', 0.9);
    }
    
    async analyzeImage(imageData) {
        if (!this.apiKey) {
            throw new Error('Google Vision API não configurada');
        }
        
        try {
            // Converter base64 para blob
            const base64Data = imageData.split(',')[1];
            
            // Usar apenas Google Vision API
            return await this.detectWithVertexAI(base64Data);
            
        } catch (error) {
            console.error('Erro na análise da imagem:', error);
            this.updateStatus('Erro na API do Google Vision');
            throw error;
        }
    }
    
    async detectWithVertexAI(base64Data) {
        // Usar Google Cloud Vision API para detecção de texto
        const requestBody = {
            requests: [{
                image: {
                    content: base64Data
                },
                features: [{
                    type: 'TEXT_DETECTION',
                    maxResults: 20
                }]
            }]
        };
        
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Vision API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        return this.extractNumbersFromVision(result);
    }
    
    
    extractNumbersFromVision(apiResult) {
        const numbers = [];
        const allText = [];
        
        console.log('🔍 Resposta completa da Google Vision API:', JSON.stringify(apiResult, null, 2));
        
        if (apiResult.responses && apiResult.responses.length > 0) {
            const response = apiResult.responses[0];
            
            if (response.error) {
                console.error('❌ Erro na API do Google Vision:', response.error);
                throw new Error(`Google Vision API Error: ${response.error.message}`);
            }
            
            if (response.textAnnotations && response.textAnnotations.length > 0) {
                console.log(`📝 ${response.textAnnotations.length} anotações de texto encontradas`);
                
                // O primeiro elemento contém todo o texto detectado
                const fullText = response.textAnnotations[0].description;
                console.log('📄 Texto completo detectado:', `"${fullText}"`);
                allText.push(fullText);
                
                // Também processar anotações individuais
                response.textAnnotations.slice(1).forEach((annotation, index) => {
                    console.log(`📝 Anotação ${index + 1}:`, `"${annotation.description}"`);
                    allText.push(annotation.description);
                });
            } else {
                console.log('⚠️ Nenhuma anotação de texto encontrada na resposta');
            }
        } else {
            console.log('⚠️ Nenhuma resposta encontrada da API');
        }
        
        // Juntar todo o texto detectado
        const fullText = allText.join(' ');
        console.log('🔤 Texto combinado para análise:', `"${fullText}"`);
        
        if (!fullText.trim()) {
            console.log('⚠️ Nenhum texto detectado pela Google Vision API');
            return [];
        }
        
        // Padrões otimizados para dorsais
        const patterns = [
            /\b(\d{1,4})\b/g,           // Números isolados de 1-4 dígitos
            /(\d{2,4})/g,              // Números de 2-4 dígitos (mais restritivo)
            /(?:^|\s)(\d{1,4})(?:\s|$)/g, // Números com espaços ao redor
        ];
        
        console.log('🔍 Aplicando padrões de extração de números...');
        patterns.forEach((pattern, index) => {
            let match;
            console.log(`Padrão ${index + 1}: ${pattern}`);
            while ((match = pattern.exec(fullText)) !== null) {
                const num = parseInt(match[1]);
                if (num >= 1 && num <= 9999) { // Faixa típica de dorsais
                    numbers.push(num);
                    console.log(`  ✅ Encontrado: ${num}`);
                }
            }
        });
        
        console.log('🔢 Números brutos extraídos:', numbers);
        
        // Filtrar e priorizar números mais prováveis de serem dorsais
        const filteredNumbers = this.filterDorsalNumbers(numbers);
        
        console.log('✅ Números filtrados finais:', filteredNumbers);
        return [...new Set(filteredNumbers)]; // Remover duplicatas
    }
    
    
    filterDorsalNumbers(numbers) {
        // Filtrar números que são mais prováveis de serem dorsais
        return numbers.filter(num => {
            // Excluir números muito pequenos ou muito específicos que podem ser ruído
            if (num < 1) return false;
            if (num > 9999) return false;
            
            // Priorizar números de 1-4 dígitos
            const str = num.toString();
            if (str.length >= 1 && str.length <= 4) {
                return true;
            }
            
            return false;
        }).sort((a, b) => {
            // Priorizar números de 2-3 dígitos (mais comuns em dorsais)
            const aLen = a.toString().length;
            const bLen = b.toString().length;
            
            if (aLen >= 2 && aLen <= 3 && (bLen < 2 || bLen > 3)) return -1;
            if (bLen >= 2 && bLen <= 3 && (aLen < 2 || aLen > 3)) return 1;
            
            return a - b;
        });
    }
    
    
    processDetections(numbers) {
        const now = new Date();
        const timestamp = now.toISOString();
        const timeString = now.toLocaleTimeString('pt-BR');
        
        numbers.forEach(number => {
            // Verificar se não foi detectado recentemente (evitar duplicatas)
            const recentDetection = this.detections.find(d => 
                d.number === number && 
                (now - new Date(d.timestamp)) < 10000 // 10 segundos
            );
            
            if (!recentDetection) {
                const detection = {
                    number: number,
                    timestamp: timestamp,
                    time: timeString,
                    latitude: this.currentPosition ? this.currentPosition.latitude : null,
                    longitude: this.currentPosition ? this.currentPosition.longitude : null,
                    accuracy: this.currentPosition ? this.currentPosition.accuracy : null
                };
                
                this.detections.push(detection);
                this.totalDetected++;
                this.updateLastDetection(detection);
                this.updateStats();
                this.flashDetection();
                
                console.log('Dorsal detectado:', detection);
            }
        });
    }
    
    updateLastDetection(detection) {
        const gpsText = detection.latitude ? 
            `GPS: ${detection.latitude.toFixed(6)}, ${detection.longitude.toFixed(6)}` : 
            'GPS: Não disponível';
            
        this.lastDetection.innerHTML = `
            <strong>Dorsal: ${detection.number}</strong><br>
            Hora: ${detection.time}<br>
            ${gpsText}
        `;
    }
    
    updateDetectionStatus(allNumbers, finalNumbers) {
        // Mostrar no painel o que está sendo detectado em tempo real
        if (allNumbers.length > 0) {
            const statusText = `Detectados: [${allNumbers.join(', ')}] → Filtrados: [${finalNumbers.join(', ')}]`;
            this.updateStatus(statusText);
        }
    }
    
    updateStats() {
        this.totalDetectedEl.textContent = this.totalDetected;
    }
    
    flashDetection() {
        document.body.classList.add('detection-found');
        setTimeout(() => {
            document.body.classList.remove('detection-found');
        }, 500);
    }
    
    updateStatus(message) {
        this.status.textContent = message;
    }
    
    updateSetupStatus() {
        const hasAPI = !!this.apiKey;
        const hasNumberArea = this.numberArea.active;
        const hasCalibration = this.calibrationData.expectedNumbers.length > 0;
        
        let status = '';
        let readyCount = 0;
        
        if (hasAPI) {
            status += '✅ API Configurada\n';
            readyCount++;
        } else {
            status += '❌ API Não Configurada\n';
        }
        
        if (hasNumberArea) {
            status += '✅ Área do Número Definida\n';
            readyCount++;
        } else {
            status += '❌ Área do Número NÃO Definida\n';
        }
        
        if (hasCalibration) {
            status += `✅ Calibrado para: ${this.calibrationData.expectedNumbers.join(', ')}\n`;
            readyCount++;
        } else {
            status += '❌ Calibração NÃO FEITA\n';
        }
        
        status += `\nStatus: ${readyCount}/3 obrigatórios`;
        
        this.setupStatus.innerHTML = status.replace(/\n/g, '<br>');
        
        // Habilitar/desabilitar botões baseado no status (agora incluindo calibração)
        const canDetect = hasAPI && hasNumberArea && hasCalibration;
        this.startBtn.disabled = !canDetect || this.isDetecting;
        this.testBtn.disabled = !canDetect;
        
        if (!canDetect) {
            this.startBtn.title = 'Complete todas as configurações obrigatórias primeiro';
            this.testBtn.title = 'Complete todas as configurações obrigatórias primeiro';
        } else {
            this.startBtn.title = '';
            this.testBtn.title = '';
        }
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    
    downloadRecords() {
        if (this.detections.length === 0) {
            alert('Nenhum registro para download');
            return;
        }
        
        // Criar conteúdo do arquivo
        let content = 'REGISTROS DE DORSAIS - VISIONKRONO\n';
        content += '=====================================\n\n';
        
        this.detections.forEach((detection, index) => {
            content += `Registro ${index + 1}:\n`;
            content += `Dorsal: ${detection.number}\n`;
            content += `Data/Hora: ${new Date(detection.timestamp).toLocaleString('pt-BR')}\n`;
            
            if (detection.latitude && detection.longitude) {
                content += `GPS: ${detection.latitude}, ${detection.longitude}\n`;
                content += `Precisão: ${Math.round(detection.accuracy)}m\n`;
            } else {
                content += `GPS: Não disponível\n`;
            }
            
            content += '\n---\n\n';
        });
        
        content += `Total de registros: ${this.detections.length}\n`;
        content += `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        
        // Fazer download do arquivo
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
}

// Inicializar aplicação quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    new Kromi.online();
});
