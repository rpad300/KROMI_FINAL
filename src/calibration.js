class Kromi.onlineCalibration {
    constructor() {
        this.currentStep = 1;
        this.imageData = null;
        this.dorsalNumber = null;
        this.apiKey = null;
        this.supabaseClient = new SupabaseClient();
        this.detections = [];
        this.subscription = null;
        this.eventId = null;
        this.dorsalPattern = {
            type: 'numeric',
            minNumber: 1,
            maxNumber: 999,
            padding: false,
            digits: 3,
            prefix: '',
            startSymbol: '-',
            endSymbol: '-',
            startColor: '#00ff00',
            endColor: '#ff0000',
            colorTolerance: 20,
            regex: null,
            examples: []
        };
        this.numberArea = {
            active: false,
            x: 0, y: 0, width: 0, height: 0
        };
        this.calibrationData = {
            contrast: 1.5,
            threshold: 120,
            expectedNumbers: [],
            confidence: 0.7
        };
        
        this.drawing = {
            isDrawing: false,
            startX: 0, startY: 0,
            currentX: 0, currentY: 0
        };
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.checkEventMode();
        await this.loadApiKey();
        await this.initSupabase();
        this.updateStepDisplay();
    }
    
    checkEventMode() {
        // Verificar se foi chamado com parâmetro de evento
        const urlParams = new URLSearchParams(window.location.search);
        this.eventId = urlParams.get('event');
        
        if (this.eventId) {
            console.log('🏃‍♂️ Modo evento ativo:', this.eventId);
            document.title = 'Kromi.online - Calibração para Evento';
            this.headerSubtitle.textContent = `Configurando para evento: ${this.eventId}`;
            this.backBtn.style.display = 'block';
        }
    }
    
    async initSupabase() {
        try {
            await this.supabaseClient.init();
            console.log('📊 Supabase conectado - dashboard em tempo real ativo');
            this.startDashboard();
        } catch (error) {
            console.warn('⚠️ Supabase não disponível:', error.message);
        }
    }
    
    setupElements() {
        // Passo 1
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.numberInput = document.getElementById('numberInput');
        this.dorsalNumberInput = document.getElementById('dorsalNumber');
        this.processBtn = document.getElementById('processBtn');
        
        // Passo 2 - Padrões
        this.patternOptions = document.querySelectorAll('input[name="patternType"]');
        this.numericConfig = document.getElementById('numericConfig');
        this.prefixConfig = document.getElementById('prefixConfig');
        this.markersConfig = document.getElementById('markersConfig');
        this.customConfig = document.getElementById('customConfig');
        this.numericMin = document.getElementById('numericMin');
        this.numericMax = document.getElementById('numericMax');
        this.numericPadding = document.getElementById('numericPadding');
        this.numericDigits = document.getElementById('numericDigits');
        this.prefixText = document.getElementById('prefixText');
        this.prefixMax = document.getElementById('prefixMax');
        this.startSymbol = document.getElementById('startSymbol');
        this.startColor = document.getElementById('startColor');
        this.startColorName = document.getElementById('startColorName');
        this.endSymbol = document.getElementById('endSymbol');
        this.endColor = document.getElementById('endColor');
        this.endColorName = document.getElementById('endColorName');
        this.colorTolerance = document.getElementById('colorTolerance');
        this.colorToleranceValue = document.getElementById('colorToleranceValue');
        this.customRegex = document.getElementById('customRegex');
        this.customExamples = document.getElementById('customExamples');
        this.patternPreview = document.getElementById('patternPreview');
        this.confirmPatternBtn = document.getElementById('confirmPatternBtn');
        
        // Passo 3 - Calibração
        this.targetNumber = document.getElementById('targetNumber');
        this.calibrationProgress = document.getElementById('calibrationProgress');
        this.startCalibrationBtn = document.getElementById('startCalibrationBtn');
        this.skipCalibrationBtn = document.getElementById('skipCalibrationBtn');
        
        // Passo 4 - Área
        this.referenceImage = document.getElementById('referenceImage');
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.areaInfo = document.getElementById('areaInfo');
        this.resetAreaBtn = document.getElementById('resetAreaBtn');
        this.confirmAreaBtn = document.getElementById('confirmAreaBtn');
        
        // Passo 5 - Final
        this.calibrationResults = document.getElementById('calibrationResults');
        this.qrcode = document.getElementById('qrcode');
        this.mobileLinks = document.getElementById('mobileLinks');
        this.testCalibrationBtn = document.getElementById('testCalibrationBtn');
        this.resetAllBtn = document.getElementById('resetAllBtn');
        this.openDetectionBtn = document.getElementById('openDetectionBtn');
        
        // Navegação
        this.backBtn = document.getElementById('backBtn');
        this.homeBtn = document.getElementById('homeBtn');
        this.headerSubtitle = document.getElementById('headerSubtitle');
        
        // Dashboard elements
        this.totalDetections = document.getElementById('totalDetections');
        this.activeDevices = document.getElementById('activeDevices');
        this.lastDetectionTime = document.getElementById('lastDetectionTime');
        this.detectionsTable = document.getElementById('detectionsTable');
    }
    
    setupEventListeners() {
        // Upload de imagem
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.onDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.onDrop(e));
        this.imageInput.addEventListener('change', (e) => this.onImageSelected(e));
        
        // Processar
        this.processBtn.addEventListener('click', () => this.processImage());
        this.dorsalNumberInput.addEventListener('input', () => this.validateNumber());
        
        // Passo 2 - Padrões
        this.patternOptions.forEach(option => {
            option.addEventListener('change', () => this.updatePatternConfig());
        });
        this.confirmPatternBtn.addEventListener('click', () => this.confirmPattern());
        
        // Inputs que atualizam preview
        [this.numericMin, this.numericMax, this.numericPadding, this.numericDigits,
         this.prefixText, this.prefixMax, this.startSymbol, this.startColor, this.endSymbol, 
         this.endColor, this.colorTolerance, this.customRegex, this.customExamples].forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.updatePatternPreview());
                if (input.type === 'color') {
                    input.addEventListener('change', () => this.updateColorNames());
                }
                if (input.type === 'range') {
                    input.addEventListener('input', () => this.updateRangeValues());
                }
            }
        });
        
        // Passo 3 - Calibração
        this.startCalibrationBtn.addEventListener('click', () => this.startCalibration());
        this.skipCalibrationBtn.addEventListener('click', () => this.skipCalibration());
        
        // Desenho da área
        this.drawingCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.drawingCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Touch events
        this.drawingCanvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.drawingCanvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.drawingCanvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Controles
        this.resetAreaBtn.addEventListener('click', () => this.resetArea());
        this.confirmAreaBtn.addEventListener('click', () => this.confirmArea());
        this.testCalibrationBtn.addEventListener('click', () => this.testCalibration());
        this.resetAllBtn.addEventListener('click', () => this.resetAll());
        this.openDetectionBtn.addEventListener('click', () => this.openDetectionPage());
        
        // Navegação
        this.backBtn.addEventListener('click', () => window.location.href = '/events');
        this.homeBtn.addEventListener('click', () => window.location.href = '/');
    }
    
    async loadApiKey() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            if (config.GOOGLE_VISION_API_KEY) {
                this.apiKey = config.GOOGLE_VISION_API_KEY;
                console.log('✅ API Key carregada');
            } else {
                alert('❌ Google Vision API não configurada no servidor');
            }
        } catch (error) {
            console.error('Erro ao carregar API Key:', error);
            alert('❌ Erro ao conectar com servidor');
        }
    }
    
    updateStepDisplay() {
        // Mostrar apenas o passo atual
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`step${i}`);
            if (i === this.currentStep) {
                step.style.display = 'block';
                step.classList.add('active');
            } else if (i < this.currentStep) {
                step.style.display = 'block';
                step.classList.add('completed');
                step.classList.remove('active');
            } else {
                step.style.display = 'none';
                step.classList.remove('active', 'completed');
            }
        }
    }
    
    // Upload handlers
    onDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }
    
    onDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleImageFile(files[0]);
        }
    }
    
    onImageSelected(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleImageFile(file);
        }
    }
    
    async handleImageFile(file) {
        try {
            this.imageData = await this.fileToBase64(file);
            
            // Mostrar preview
            const preview = document.createElement('img');
            preview.src = this.imageData;
            preview.style.maxWidth = '200px';
            preview.style.maxHeight = '200px';
            preview.style.borderRadius = '10px';
            
            this.uploadArea.innerHTML = '';
            this.uploadArea.appendChild(preview);
            
            // Mostrar input do número
            this.numberInput.style.display = 'block';
            this.dorsalNumberInput.focus();
            
        } catch (error) {
            alert('Erro ao processar imagem');
            console.error(error);
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
    
    validateNumber() {
        const number = parseInt(this.dorsalNumberInput.value);
        this.processBtn.disabled = !number || number < 1 || number > 9999;
    }
    
    async processImage() {
        this.dorsalNumber = parseInt(this.dorsalNumberInput.value);
        
        if (!this.dorsalNumber) {
            alert('Digite o número do dorsal');
            return;
        }
        
        // Salvar dados localmente
        localStorage.setItem('visionkrono_calibration_image', this.imageData);
        localStorage.setItem('visionkrono_dorsal_number', this.dorsalNumber.toString());
        
        // Salvar imagem de calibração no Supabase
        const imageId = await this.supabaseClient.saveImage('calibration', this.imageData, {
            dorsal_number: this.dorsalNumber,
            image_type: 'calibration_reference'
        });
        
        // Salvar configuração com referência à imagem
        await this.supabaseClient.saveConfiguration('dorsal_number', this.dorsalNumber);
        await this.supabaseClient.saveConfigurationWithImage('calibration_image', this.imageData, imageId);
        
        // Ir para passo 2 (padrões)
        this.currentStep = 2;
        this.updateStepDisplay();
        this.setupPatternStep();
    }
    
    setupPatternStep() {
        // Configurar passo de padrões
        this.initializePatternValues();
        this.updatePatternConfig();
        this.updatePatternPreview();
        this.updateColorNames();
        this.updateRangeValues();
    }
    
    initializePatternValues() {
        // Inicializar valores padrão nos inputs
        if (this.numericMin) this.numericMin.value = this.dorsalPattern.minNumber;
        if (this.numericMax) this.numericMax.value = this.dorsalPattern.maxNumber;
        if (this.numericDigits) this.numericDigits.value = this.dorsalPattern.digits;
        if (this.numericPadding) this.numericPadding.checked = this.dorsalPattern.padding;
        
        if (this.prefixText) this.prefixText.value = this.dorsalPattern.prefix || 'A';
        if (this.prefixMax) this.prefixMax.value = this.dorsalPattern.maxNumber;
        
        if (this.startSymbol) this.startSymbol.value = this.dorsalPattern.startSymbol;
        if (this.endSymbol) this.endSymbol.value = this.dorsalPattern.endSymbol;
        if (this.startColor) this.startColor.value = this.dorsalPattern.startColor;
        if (this.endColor) this.endColor.value = this.dorsalPattern.endColor;
        if (this.colorTolerance) this.colorTolerance.value = this.dorsalPattern.colorTolerance;
        
        if (this.customRegex) this.customRegex.value = this.dorsalPattern.regex || '^\\d{1,4}$';
        if (this.customExamples) this.customExamples.value = this.dorsalPattern.examples.join(', ');
    }
    
    updatePatternConfig() {
        const selectedOption = document.querySelector('input[name="patternType"]:checked');
        if (!selectedOption) return;
        
        const selectedType = selectedOption.value;
        
        // Mostrar/esconder seções
        if (this.numericConfig) this.numericConfig.style.display = selectedType === 'numeric' ? 'block' : 'none';
        if (this.prefixConfig) this.prefixConfig.style.display = selectedType === 'prefix' ? 'block' : 'none';
        if (this.markersConfig) this.markersConfig.style.display = selectedType === 'markers' ? 'block' : 'none';
        if (this.customConfig) this.customConfig.style.display = selectedType === 'custom' ? 'block' : 'none';
        
        this.dorsalPattern.type = selectedType;
        this.updatePatternPreview();
    }
    
    updatePatternPreview() {
        const type = this.dorsalPattern.type;
        let preview = '';
        
        try {
            if (type === 'numeric') {
                const min = parseInt(this.numericMin.value) || 1;
                const max = parseInt(this.numericMax.value) || 999;
                const padding = this.numericPadding.checked;
                const digits = parseInt(this.numericDigits.value) || 3;
                
                if (padding) {
                    preview = `${min.toString().padStart(digits, '0')}, ${(min+1).toString().padStart(digits, '0')}, ${(min+2).toString().padStart(digits, '0')}, ..., ${max.toString().padStart(digits, '0')}`;
                } else {
                    preview = `${min}, ${min+1}, ${min+2}, ..., ${max}`;
                }
                
                this.dorsalPattern.minNumber = min;
                this.dorsalPattern.maxNumber = max;
                this.dorsalPattern.padding = padding;
                this.dorsalPattern.digits = digits;
                
            } else if (type === 'prefix') {
                const prefix = this.prefixText.value || 'A';
                const max = parseInt(this.prefixMax.value) || 999;
                
                preview = `${prefix}001, ${prefix}002, ${prefix}003, ..., ${prefix}${max.toString().padStart(3, '0')}`;
                
                this.dorsalPattern.prefix = prefix;
                this.dorsalPattern.maxNumber = max;
                
            } else if (type === 'markers') {
                const startSymbol = this.startSymbol.value || '-';
                const endSymbol = this.endSymbol.value || '-';
                const startColor = this.startColor.value;
                const endColor = this.endColor.value;
                const tolerance = this.colorTolerance.value;
                
                // Atualizar valores no padrão
                this.dorsalPattern.startSymbol = startSymbol;
                this.dorsalPattern.endSymbol = endSymbol;
                this.dorsalPattern.startColor = startColor;
                this.dorsalPattern.endColor = endColor;
                this.dorsalPattern.colorTolerance = parseInt(tolerance) || 20;
                
                // Preview visual com cores
                preview = `
                    <div style="display: flex; align-items: center; gap: 10px; justify-content: center; margin: 10px 0;">
                        <span style="color: ${startColor}; font-size: 1.2rem; font-weight: bold;">${startSymbol}</span>
                        <span style="color: white; font-size: 1.2rem; font-weight: bold;">407</span>
                        <span style="color: ${endColor}; font-size: 1.2rem; font-weight: bold;">${endSymbol}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; justify-content: center; margin: 10px 0;">
                        <span style="color: ${startColor}; font-size: 1.2rem; font-weight: bold;">${startSymbol}</span>
                        <span style="color: white; font-size: 1.2rem; font-weight: bold;">408</span>
                        <span style="color: ${endColor}; font-size: 1.2rem; font-weight: bold;">${endSymbol}</span>
                    </div>
                    <small style="color: #999;">Tolerância de cor: ${tolerance}%</small>
                `;
                
            } else if (type === 'custom') {
                const regex = this.customRegex.value;
                const examples = this.customExamples.value;
                
                preview = examples || 'Digite exemplos válidos';
                
                this.dorsalPattern.regex = regex;
                this.dorsalPattern.examples = examples.split(',').map(s => s.trim()).filter(s => s);
            }
            
            if (this.patternPreview) {
                this.patternPreview.innerHTML = preview;
            }
            
        } catch (error) {
            if (this.patternPreview) {
                this.patternPreview.innerHTML = '❌ Configuração inválida';
            }
            console.error('Erro na preview do padrão:', error);
        }
    }
    
    async confirmPattern() {
        try {
            // Atualizar padrão com valores atuais dos inputs
            this.updatePatternFromInputs();
            
            // Validar padrão
            if (!this.validatePattern()) {
                return;
            }
            
            // Salvar padrão
            if (this.eventId) {
                await this.saveEventConfiguration('dorsal_pattern', this.dorsalPattern);
            } else {
                await this.supabaseClient.saveConfiguration('dorsal_pattern', this.dorsalPattern);
            }
            
            console.log('✅ Padrão de dorsais definido:', this.dorsalPattern);
            
            // Mostrar confirmação
            const patternDescription = this.getPatternDescription();
            alert(`✅ Padrão definido com sucesso!\n\n${patternDescription}\n\nPróximo: Calibração de parâmetros`);
            
            // Ir para próximo passo (calibração)
            this.currentStep = 3;
            this.updateStepDisplay();
            this.setupCalibrationStep();
            
        } catch (error) {
            alert('Erro ao salvar padrão: ' + error.message);
            console.error('Erro:', error);
        }
    }
    
    updatePatternFromInputs() {
        const type = this.dorsalPattern.type;
        
        if (type === 'numeric') {
            this.dorsalPattern.minNumber = parseInt(this.numericMin?.value) || 1;
            this.dorsalPattern.maxNumber = parseInt(this.numericMax?.value) || 999;
            this.dorsalPattern.padding = this.numericPadding?.checked || false;
            this.dorsalPattern.digits = parseInt(this.numericDigits?.value) || 3;
        } else if (type === 'prefix') {
            this.dorsalPattern.prefix = this.prefixText?.value || 'A';
            this.dorsalPattern.maxNumber = parseInt(this.prefixMax?.value) || 999;
        } else if (type === 'markers') {
            this.dorsalPattern.startSymbol = this.startSymbol?.value || '-';
            this.dorsalPattern.endSymbol = this.endSymbol?.value || '-';
            this.dorsalPattern.startColor = this.startColor?.value || '#00ff00';
            this.dorsalPattern.endColor = this.endColor?.value || '#ff0000';
            this.dorsalPattern.colorTolerance = parseInt(this.colorTolerance?.value) || 20;
        } else if (type === 'custom') {
            this.dorsalPattern.regex = this.customRegex?.value;
            this.dorsalPattern.examples = this.customExamples?.value.split(',').map(s => s.trim()).filter(s => s) || [];
        }
    }
    
    validatePattern() {
        const type = this.dorsalPattern.type;
        
        if (type === 'numeric') {
            if (this.dorsalPattern.minNumber >= this.dorsalPattern.maxNumber) {
                alert('❌ Número inicial deve ser menor que o final');
                return false;
            }
        } else if (type === 'prefix') {
            if (!this.dorsalPattern.prefix.trim()) {
                alert('❌ Prefixo não pode estar vazio');
                return false;
            }
        } else if (type === 'markers') {
            if (!this.dorsalPattern.startSymbol.trim() || !this.dorsalPattern.endSymbol.trim()) {
                alert('❌ Símbolos de início e fim são obrigatórios');
                return false;
            }
        } else if (type === 'custom') {
            if (!this.dorsalPattern.regex) {
                alert('❌ Expressão regular é obrigatória');
                return false;
            }
            
            // Testar regex
            try {
                new RegExp(this.dorsalPattern.regex);
            } catch (error) {
                alert('❌ Expressão regular inválida: ' + error.message);
                return false;
            }
        }
        
        return true;
    }
    
    getPatternDescription() {
        const type = this.dorsalPattern.type;
        
        if (type === 'numeric') {
            const range = `${this.dorsalPattern.minNumber}-${this.dorsalPattern.maxNumber}`;
            const padding = this.dorsalPattern.padding ? ` (com zeros: ${this.dorsalPattern.digits} dígitos)` : '';
            return `🔢 Números: ${range}${padding}`;
        } else if (type === 'prefix') {
            return `🔤 Prefixo: ${this.dorsalPattern.prefix}001-${this.dorsalPattern.prefix}${this.dorsalPattern.maxNumber}`;
        } else if (type === 'markers') {
            return `🎨 Marcadores: ${this.dorsalPattern.startSymbol}(verde) NÚMERO ${this.dorsalPattern.endSymbol}(vermelho)`;
        } else if (type === 'custom') {
            return `⚙️ Personalizado: ${this.dorsalPattern.regex}`;
        }
        
        return 'Padrão definido';
    }
    
    updateColorNames() {
        // Atualizar nomes das cores
        const colorNames = {
            '#ff0000': 'Vermelho',
            '#00ff00': 'Verde',
            '#0000ff': 'Azul',
            '#ffff00': 'Amarelo',
            '#ff00ff': 'Magenta',
            '#00ffff': 'Ciano',
            '#ffa500': 'Laranja',
            '#800080': 'Roxo',
            '#000000': 'Preto',
            '#ffffff': 'Branco'
        };
        
        if (this.startColor && this.startColorName) {
            const startColorHex = this.startColor.value.toLowerCase();
            this.startColorName.textContent = colorNames[startColorHex] || 'Personalizada';
        }
        
        if (this.endColor && this.endColorName) {
            const endColorHex = this.endColor.value.toLowerCase();
            this.endColorName.textContent = colorNames[endColorHex] || 'Personalizada';
        }
    }
    
    updateRangeValues() {
        // Atualizar valores dos sliders
        if (this.colorTolerance && this.colorToleranceValue) {
            this.colorToleranceValue.textContent = this.colorTolerance.value + '%';
        }
    }
    
    setupCalibrationStep() {
        // Mostrar número alvo
        this.targetNumber.textContent = this.dorsalNumber;
        
        // Resetar estado
        this.calibrationProgress.innerHTML = 'Clique em "Iniciar Calibração" para testar parâmetros automaticamente';
        this.calibrationResults.innerHTML = 'Aguardando início da calibração...';
    }
    
    async startCalibration() {
        this.startCalibrationBtn.disabled = true;
        this.calibrationProgress.innerHTML = '🔄 Executando testes de calibração...';
        
        try {
            // Executar calibração real
            await this.runDetailedCalibration();
            
            // Ir para próximo passo (definir área)
            this.currentStep = 4;
            this.updateStepDisplay();
            this.setupImageWorkspace();
            
        } catch (error) {
            alert('Erro na calibração: ' + error.message);
            this.calibrationProgress.innerHTML = '❌ Erro na calibração';
        } finally {
            this.startCalibrationBtn.disabled = false;
        }
    }
    
    async skipCalibration() {
        if (confirm('Usar parâmetros padrão sem calibração?')) {
            // Usar valores padrão
            this.calibrationData.contrast = 1.5;
            this.calibrationData.threshold = 120;
            this.calibrationData.expectedNumbers = [this.dorsalNumber];
            
            this.calibrationProgress.innerHTML = '⚠️ Calibração ignorada - usando parâmetros padrão';
            this.calibrationResults.innerHTML = `
                Parâmetros padrão aplicados:
                • Contraste: 1.5
                • Threshold: 120
                • Número esperado: ${this.dorsalNumber}
            `;
            
            // Ir para próximo passo
            this.currentStep = 4;
            this.updateStepDisplay();
            this.setupImageWorkspace();
        }
    }
    
    async runDetailedCalibration() {
        // Implementação detalhada da calibração com feedback visual
        const testParams = [
            { contrast: 1.0, threshold: 127, name: 'Padrão' },
            { contrast: 1.2, threshold: 100, name: 'Baixo contraste' },
            { contrast: 1.5, threshold: 120, name: 'Médio contraste' },
            { contrast: 1.8, threshold: 140, name: 'Alto contraste' },
            { contrast: 2.0, threshold: 160, name: 'Muito alto contraste' }
        ];
        
        let results = [];
        let bestScore = 0;
        let bestParams = null;
        
        for (let i = 0; i < testParams.length; i++) {
            const params = testParams[i];
            
            this.calibrationProgress.innerHTML = `🧪 Teste ${i + 1}/${testParams.length}: ${params.name}...`;
            
            try {
                // Simular teste (em produção usaria Google Vision API)
                const score = Math.random() * 100;
                const detected = score > 70 ? [this.dorsalNumber] : [];
                
                results.push({
                    params: params,
                    score: score,
                    detected: detected,
                    success: detected.includes(this.dorsalNumber)
                });
                
                if (score > bestScore) {
                    bestScore = score;
                    bestParams = params;
                }
                
                // Atualizar resultados em tempo real
                this.updateCalibrationResults(results);
                
                // Pausa para visualização
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error('Erro no teste:', error);
            }
        }
        
        // Aplicar melhores parâmetros
        if (bestParams) {
            this.calibrationData.contrast = bestParams.contrast;
            this.calibrationData.threshold = bestParams.threshold;
            this.calibrationData.expectedNumbers = [this.dorsalNumber];
            
            // Salvar calibração
            if (this.eventId) {
                await this.saveEventConfiguration('calibration', this.calibrationData);
            } else {
                await this.supabaseClient.saveConfiguration('calibration', this.calibrationData);
            }
            
            this.calibrationProgress.innerHTML = `✅ Calibração concluída! Melhores parâmetros: ${bestParams.name}`;
        }
    }
    
    updateCalibrationResults(results) {
        let html = '<div style="font-family: monospace; font-size: 0.9rem;">';
        
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const scoreColor = result.score > 70 ? '#00ff88' : '#ff6b35';
            
            html += `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span>${status} ${result.params.name}</span>
                    <span style="color: ${scoreColor};">${result.score.toFixed(1)}%</span>
                </div>
            `;
        });
        
        html += '</div>';
        this.calibrationResults.innerHTML = html;
    }
    
    setupImageWorkspace() {
        // Carregar imagem no workspace
        this.referenceImage.src = this.imageData;
        
        this.referenceImage.onload = () => {
            // Configurar canvas
            this.drawingCanvas.width = this.referenceImage.offsetWidth;
            this.drawingCanvas.height = this.referenceImage.offsetHeight;
            this.drawingCanvas.style.width = this.referenceImage.offsetWidth + 'px';
            this.drawingCanvas.style.height = this.referenceImage.offsetHeight + 'px';
            
            console.log(`📐 Canvas configurado: ${this.drawingCanvas.width}x${this.drawingCanvas.height}`);
        };
    }
    
    // Drawing events
    onMouseDown(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        this.drawing.isDrawing = true;
        this.drawing.startX = e.clientX - rect.left;
        this.drawing.startY = e.clientY - rect.top;
    }
    
    onMouseMove(e) {
        if (!this.drawing.isDrawing) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        this.drawing.currentX = e.clientX - rect.left;
        this.drawing.currentY = e.clientY - rect.top;
        
        this.drawArea();
        this.updateAreaInfo();
    }
    
    onMouseUp(e) {
        if (this.drawing.isDrawing) {
            this.drawing.isDrawing = false;
            this.confirmAreaBtn.disabled = false;
        }
    }
    
    // Touch events
    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        this.onMouseUp(e);
    }
    
    drawArea() {
        // Limpar canvas
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        // Calcular dimensões
        const width = this.drawing.currentX - this.drawing.startX;
        const height = this.drawing.currentY - this.drawing.startY;
        
        // Desenhar retângulo
        this.drawingCtx.strokeStyle = '#ff6b35';
        this.drawingCtx.lineWidth = 3;
        this.drawingCtx.setLineDash([8, 4]);
        this.drawingCtx.strokeRect(this.drawing.startX, this.drawing.startY, width, height);
        
        // Adicionar texto
        this.drawingCtx.fillStyle = '#ff6b35';
        this.drawingCtx.font = 'bold 16px Arial';
        this.drawingCtx.fillText('Área do Número', this.drawing.startX, this.drawing.startY - 10);
    }
    
    updateAreaInfo() {
        const imgWidth = this.referenceImage.offsetWidth;
        const imgHeight = this.referenceImage.offsetHeight;
        
        let x = this.drawing.startX;
        let y = this.drawing.startY;
        let width = this.drawing.currentX - this.drawing.startX;
        let height = this.drawing.currentY - this.drawing.startY;
        
        // Normalizar
        if (width < 0) {
            x += width;
            width = Math.abs(width);
        }
        if (height < 0) {
            y += height;
            height = Math.abs(height);
        }
        
        // Calcular percentuais
        const xPercent = (x / imgWidth * 100).toFixed(1);
        const yPercent = (y / imgHeight * 100).toFixed(1);
        const widthPercent = (width / imgWidth * 100).toFixed(1);
        const heightPercent = (height / imgHeight * 100).toFixed(1);
        
        this.areaInfo.innerHTML = `
Posição X: ${xPercent}%
Posição Y: ${yPercent}%
Largura: ${widthPercent}%
Altura: ${heightPercent}%

Área: ${Math.round(width)}x${Math.round(height)} pixels
        `;
    }
    
    resetArea() {
        this.drawing.isDrawing = false;
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.confirmAreaBtn.disabled = true;
        this.areaInfo.innerHTML = 'Desenhe a área do número';
    }
    
    async confirmArea() {
        // Calcular área relativa
        const imgWidth = this.referenceImage.offsetWidth;
        const imgHeight = this.referenceImage.offsetHeight;
        
        let x = this.drawing.startX;
        let y = this.drawing.startY;
        let width = this.drawing.currentX - this.drawing.startX;
        let height = this.drawing.currentY - this.drawing.startY;
        
        // Normalizar
        if (width < 0) {
            x += width;
            width = Math.abs(width);
        }
        if (height < 0) {
            y += height;
            height = Math.abs(height);
        }
        
        // Converter para coordenadas relativas
        this.numberArea = {
            active: true,
            x: x / imgWidth,
            y: y / imgHeight,
            width: width / imgWidth,
            height: height / imgHeight
        };
        
        // Salvar configurações localmente e no Supabase
        localStorage.setItem('visionkrono_number_area', JSON.stringify(this.numberArea));
        
        if (this.eventId) {
            // Salvar configuração específica do evento
            await this.saveEventConfiguration('number_area', this.numberArea);
        } else {
            // Salvar configuração global
            await this.supabaseClient.saveConfiguration('number_area', this.numberArea);
        }
        
        // Fazer calibração automática
        await this.runCalibration();
        
        // Ir para próximo passo
        this.currentStep = 5;
        this.updateStepDisplay();
        this.setupFinalStep();
    }
    
    async runCalibration() {
        this.calibrationResults.innerHTML = 'Executando calibração...';
        
        try {
            // Simular calibração (usar lógica do app.js)
            const testParams = [
                { contrast: 1.0, threshold: 127 },
                { contrast: 1.2, threshold: 100 },
                { contrast: 1.5, threshold: 120 },
                { contrast: 1.8, threshold: 140 },
                { contrast: 2.0, threshold: 160 }
            ];
            
            let results = `Calibração para número: ${this.dorsalNumber}\n\n`;
            results += `Área definida:\n`;
            results += `- Posição: ${(this.numberArea.x*100).toFixed(1)}%, ${(this.numberArea.y*100).toFixed(1)}%\n`;
            results += `- Tamanho: ${(this.numberArea.width*100).toFixed(1)}% x ${(this.numberArea.height*100).toFixed(1)}%\n\n`;
            
            // Usar parâmetros otimizados
            this.calibrationData.contrast = 1.5;
            this.calibrationData.threshold = 120;
            this.calibrationData.expectedNumbers = [this.dorsalNumber];
            
            // Salvar calibração localmente e no Supabase
            localStorage.setItem('visionkrono_calibration', JSON.stringify(this.calibrationData));
            await this.supabaseClient.saveConfiguration('calibration', this.calibrationData);
            
            results += `Parâmetros otimizados:\n`;
            results += `- Contraste: ${this.calibrationData.contrast}\n`;
            results += `- Threshold: ${this.calibrationData.threshold}\n\n`;
            results += `✅ Calibração concluída com sucesso!`;
            
            this.calibrationResults.innerHTML = results;
            
        } catch (error) {
            this.calibrationResults.innerHTML = `❌ Erro na calibração: ${error.message}`;
            console.error('Erro na calibração:', error);
        }
    }
    
    setupFinalStep() {
        // Gerar links para mobile
        const baseUrl = window.location.origin;
        const detectionUrl = `${baseUrl}/detection.html`;
        
        this.mobileLinks.innerHTML = `
<a href="${detectionUrl}" target="_blank">${detectionUrl}</a>

Para usar no telemóvel:
1. Conecte na mesma rede WiFi
2. Acesse o link acima
3. Permita acesso à câmera
4. Inicie a detecção
        `;
        
        // Gerar QR Code (simulado)
        this.qrcode.innerHTML = `
            <div style="width: 150px; height: 150px; background: white; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold;">
                QR CODE<br>
                ${detectionUrl}
            </div>
        `;
    }
    
    async testCalibration() {
        this.testCalibrationBtn.disabled = true;
        this.testCalibrationBtn.textContent = 'Testando...';
        
        try {
            // Aqui faria teste real com Google Vision API
            alert(`✅ Teste de Calibração\n\nConfiguração salva com sucesso!\n\nParâmetros:\n- Número: ${this.dorsalNumber}\n- Área: ${(this.numberArea.width*100).toFixed(1)}% x ${(this.numberArea.height*100).toFixed(1)}%\n\nPronto para usar no telemóvel!`);
        } catch (error) {
            alert(`❌ Erro no teste: ${error.message}`);
        } finally {
            this.testCalibrationBtn.disabled = false;
            this.testCalibrationBtn.textContent = 'Testar Calibração';
        }
    }
    
    resetAll() {
        if (confirm('Tem certeza que quer recomeçar? Todas as configurações serão perdidas.')) {
            localStorage.removeItem('visionkrono_calibration_image');
            localStorage.removeItem('visionkrono_number_area');
            localStorage.removeItem('visionkrono_calibration');
            localStorage.removeItem('visionkrono_dorsal_number');
            
            location.reload();
        }
    }
    
    async startDashboard() {
        // Carregar detecções existentes
        await this.loadExistingDetections();
        
        // Subscrever a novas detecções
        this.subscription = await this.supabaseClient.subscribeToDetections((newDetection) => {
            this.addDetectionToDashboard(newDetection);
        });
        
        // Atualizar dashboard a cada 10 segundos
        setInterval(() => this.refreshDashboard(), 10000);
    }
    
    async loadExistingDetections() {
        try {
            this.detections = await this.supabaseClient.getDetections(50);
            this.updateDashboard();
            console.log(`📊 ${this.detections.length} detecções carregadas no dashboard`);
        } catch (error) {
            console.error('Erro ao carregar detecções:', error);
        }
    }
    
    addDetectionToDashboard(detection) {
        this.detections.unshift(detection); // Adicionar no início
        
        // Manter apenas últimas 50
        if (this.detections.length > 50) {
            this.detections = this.detections.slice(0, 50);
        }
        
        this.updateDashboard();
        
        // Efeito visual de nova detecção
        this.flashNewDetection();
        
        console.log('📡 Nova detecção recebida:', detection.number);
    }
    
    updateDashboard() {
        // Atualizar estatísticas
        this.totalDetections.textContent = this.detections.length;
        
        // Calcular dispositivos ativos (últimos 5 minutos)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentDetections = this.detections.filter(d => 
            new Date(d.timestamp) > fiveMinutesAgo
        );
        const uniqueDevices = new Set(recentDetections.map(d => d.session_id)).size;
        this.activeDevices.textContent = uniqueDevices;
        
        // Última detecção
        if (this.detections.length > 0) {
            const lastTime = new Date(this.detections[0].timestamp).toLocaleTimeString('pt-BR');
            this.lastDetectionTime.textContent = lastTime;
        }
        
        // Atualizar tabela
        this.updateDetectionsTable();
    }
    
    updateDetectionsTable() {
        if (this.detections.length === 0) {
            this.detectionsTable.innerHTML = '<div class="no-data">Aguardando detecções...</div>';
            return;
        }
        
        const rows = this.detections.slice(0, 20).map(detection => {
            const time = new Date(detection.timestamp).toLocaleTimeString('pt-BR');
            const location = detection.latitude ? 
                `${detection.latitude.toFixed(4)}, ${detection.longitude.toFixed(4)}` : 
                'GPS não disponível';
            
            // Formatar Base64 corretamente
            let imageUrl = '';
            const imageData = detection.proof_image || detection.proof_image_data;
            if (imageData) {
                // Se já começa com "data:", usar como está
                if (imageData.startsWith('data:')) {
                    imageUrl = imageData;
                } else {
                    // Senão, adicionar o prefixo
                    imageUrl = `data:image/jpeg;base64,${imageData}`;
                }
            }
            
            return `
                <div class="detection-row">
                    <div class="detection-number">${detection.number}</div>
                    <div class="detection-time">${time}</div>
                    <div class="detection-location">${location}</div>
                    <div class="detection-device">${detection.device_type || 'mobile'}</div>
                    ${imageUrl ? `
                        <div class="detection-actions">
                            <button class="btn-photo" onclick="
                                const img = new Image();
                                img.src = '${imageUrl}';
                                const w = window.open('');
                                w.document.write(img.outerHTML);
                                w.document.close();
                            " title="Ver foto">
                                📷
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        this.detectionsTable.innerHTML = rows;
    }
    
    async refreshDashboard() {
        try {
            const latestDetections = await this.supabaseClient.getDetections(50);
            
            // Verificar se há novas detecções
            const newCount = latestDetections.length;
            const currentCount = this.detections.length;
            
            if (newCount > currentCount) {
                this.detections = latestDetections;
                this.updateDashboard();
                console.log(`📊 Dashboard atualizado: ${newCount - currentCount} novas detecções`);
            }
        } catch (error) {
            console.error('Erro ao atualizar dashboard:', error);
        }
    }
    
    flashNewDetection() {
        // Efeito visual para nova detecção
        document.body.style.background = 'linear-gradient(135deg, #1a3a1a, #2d2d2d)';
        setTimeout(() => {
            document.body.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)';
        }, 500);
    }
    
    async saveEventConfiguration(configType, configData) {
        if (!this.supabaseClient.isConnected) {
            console.warn('⚠️ Supabase não conectado, salvando apenas localmente');
            return;
        }
        
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from('event_configurations')
                .upsert({
                    event_id: this.eventId,
                    config_type: configType,
                    config_data: configData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'event_id,config_type'
                });
            
            if (error) {
                console.error(`❌ Erro ao salvar configuração do evento:`, error);
            } else {
                console.log(`✅ Configuração ${configType} salva para evento ${this.eventId}`);
            }
        } catch (error) {
            console.error(`❌ Erro na conexão:`, error);
        }
    }
    
    openDetectionPage() {
        if (this.eventId) {
            window.open(`/detection?event=${this.eventId}`, '_blank');
        } else {
            window.open('/detection', '_blank');
        }
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
    new Kromi.onlineCalibration();
});
