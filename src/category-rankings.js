class CategoryRankingsManager {
    constructor() {
        this.supabaseClient = null;
        this.selectedEventId = null;
        this.classifications = [];
        this.categories = [];
        this.currentView = 'general'; // 'general' ou 'category'
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        await this.initSupabase();
        await this.loadEvents();
    }
    
    setupElements() {
        this.eventSelect = document.getElementById('eventSelect');
        this.eventInfo = document.getElementById('eventInfo');
        this.eventName = document.getElementById('eventName');
        this.eventType = document.getElementById('eventType');
        this.eventDistance = document.getElementById('eventDistance');
        this.totalAthletes = document.getElementById('totalAthletes');
        
        this.refreshBtn = document.getElementById('refreshBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.toggleViewBtn = document.getElementById('toggleViewBtn');
        
        this.categorySelector = document.getElementById('categorySelector');
        this.categorySelect = document.getElementById('categorySelect');
        
        this.generalRanking = document.getElementById('generalRanking');
        this.generalRankingBody = document.getElementById('generalRankingBody');
        
        this.categoryRankings = document.getElementById('categoryRankings');
        this.categoryRankingsContainer = document.getElementById('categoryRankingsContainer');
    }
    
    setupEventListeners() {
        this.eventSelect.addEventListener('change', () => this.onEventSelect());
        this.refreshBtn.addEventListener('click', () => this.loadClassifications());
        this.exportBtn.addEventListener('click', () => this.exportRankings());
        this.toggleViewBtn.addEventListener('click', () => this.toggleView());
        this.categorySelect.addEventListener('change', () => this.filterByCategory());
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
                .select('id, name, is_active, event_type, distance_km')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.eventSelect.innerHTML = '<option value="">-- Selecionar Evento --</option>';
            events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = `${event.name} ${event.is_active ? '(ativo)' : ''}`;
                this.eventSelect.appendChild(option);
            });
            
            console.log(`📅 ${events.length} eventos carregados`);
        } catch (error) {
            console.error('❌ Erro ao carregar eventos:', error);
        }
    }
    
    async onEventSelect() {
        this.selectedEventId = this.eventSelect.value;
        
        if (this.selectedEventId) {
            this.eventInfo.style.display = 'block';
            this.categorySelector.style.display = 'block';
            await this.loadEventInfo();
            await this.loadClassifications();
        } else {
            this.eventInfo.style.display = 'none';
            this.categorySelector.style.display = 'none';
        }
    }
    
    async loadEventInfo() {
        try {
            const { data: event, error } = await this.supabaseClient
                .from('events')
                .select('name, event_type, distance_km')
                .eq('id', this.selectedEventId)
                .single();
            
            if (error) throw error;
            
            this.eventName.textContent = event.name;
            this.eventType.textContent = this.getEventTypeLabel(event.event_type);
            this.eventDistance.textContent = `${event.distance_km} km`;
        } catch (error) {
            console.error('❌ Erro ao carregar informações do evento:', error);
        }
    }
    
    getEventTypeLabel(eventType) {
        const labels = {
            'running': '🏃 Corrida',
            'cycling': '🚴 Ciclismo',
            'btt': '🚵 BTT',
            'triathlon': '🏊 Triatlo',
            'walking': '🚶 Caminhada'
        };
        return labels[eventType] || eventType;
    }
    
    async loadClassifications() {
        try {
            const { data: classifications, error } = await this.supabaseClient
                .from('event_classifications')
                .select('*')
                .eq('event_id', this.selectedEventId)
                .order('position');
            
            if (error) throw error;
            
            this.classifications = classifications || [];
            this.categories = [...new Set(this.classifications.map(c => c.category).filter(Boolean))];
            
            this.updateCategorySelector();
            this.updateTotalAthletes();
            this.renderRankings();
            
            console.log(`📊 ${this.classifications.length} classificações carregadas`);
        } catch (error) {
            console.error('❌ Erro ao carregar classificações:', error);
        }
    }
    
    updateCategorySelector() {
        this.categorySelect.innerHTML = '<option value="">Todas as Categorias</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categorySelect.appendChild(option);
        });
    }
    
    updateTotalAthletes() {
        this.totalAthletes.textContent = this.classifications.length;
    }
    
    renderRankings() {
        if (this.currentView === 'general') {
            this.renderGeneralRanking();
        } else {
            this.renderCategoryRankings();
        }
    }
    
    renderGeneralRanking() {
        const filteredClassifications = this.getFilteredClassifications();
        
        this.generalRankingBody.innerHTML = filteredClassifications.map(classification => {
            const gapTime = this.formatGapTime(classification.gap_to_leader, classification.position);
            const pace = this.formatPace(classification.pace_per_km_seconds, classification.event_type);
            const avgSpeed = this.formatSpeed(classification.avg_speed_kmh);
            const status = this.getClassificationStatus(classification);
            
            return `
                <tr>
                    <td class="${this.getPositionClass(classification.position)}">${classification.position}</td>
                    <td>${classification.dorsal_number}</td>
                    <td class="participant-name">${classification.full_name || 'N/A'}</td>
                    <td class="team-name">${classification.team_name || 'N/A'}</td>
                    <td><span class="category-badge">${classification.category || 'Open'}</span></td>
                    <td>${this.formatTime(classification.total_time)}</td>
                    <td class="gap-time ${classification.position === 1 ? 'leader' : ''}">${gapTime}</td>
                    <td class="pace-display">${pace}</td>
                    <td class="avg-speed">${avgSpeed}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                </tr>
            `;
        }).join('');
    }
    
    renderCategoryRankings() {
        const filteredClassifications = this.getFilteredClassifications();
        const categoriesData = this.groupByCategory(filteredClassifications);
        
        this.categoryRankingsContainer.innerHTML = Object.entries(categoriesData).map(([category, participants]) => {
            const categoryIcon = this.getCategoryIcon(category);
            const bestTime = participants[0]?.total_time;
            const totalParticipants = participants.length;
            const completedParticipants = participants.filter(p => !p.is_penalty).length;
            
            return `
                <div class="category-card">
                    <h3>
                        <span class="category-icon">${categoryIcon}</span>
                        ${category}
                    </h3>
                    <div class="category-stats">
                        <div class="category-stat">
                            <div class="category-stat-label">Participantes</div>
                            <div class="category-stat-value">${totalParticipants}</div>
                        </div>
                        <div class="category-stat">
                            <div class="category-stat-label">Completaram</div>
                            <div class="category-stat-value">${completedParticipants}</div>
                        </div>
                        <div class="category-stat">
                            <div class="category-stat-label">Melhor Tempo</div>
                            <div class="category-stat-value">${this.formatTime(bestTime)}</div>
                        </div>
                    </div>
                    <table class="category-table">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Dorsal</th>
                                <th>Nome</th>
                                <th>Equipa</th>
                                <th>Tempo</th>
                                <th>Gap</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${participants.map((participant, index) => {
                                const gapTime = this.formatGapTime(participant.gap_to_leader, participant.category_position);
                                const status = this.getClassificationStatus(participant);
                                
                                return `
                                    <tr>
                                        <td class="${this.getPositionClass(participant.category_position)}">${participant.category_position}</td>
                                        <td>${participant.dorsal_number}</td>
                                        <td class="participant-name">${participant.full_name || 'N/A'}</td>
                                        <td class="team-name">${participant.team_name || 'N/A'}</td>
                                        <td>${this.formatTime(participant.total_time)}</td>
                                        <td class="gap-time ${participant.category_position === 1 ? 'leader' : ''}">${gapTime}</td>
                                        <td><span class="status-badge ${status.class}">${status.text}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');
    }
    
    getFilteredClassifications() {
        const selectedCategory = this.categorySelect.value;
        if (selectedCategory) {
            return this.classifications.filter(c => c.category === selectedCategory);
        }
        return this.classifications;
    }
    
    groupByCategory(classifications) {
        return classifications.reduce((groups, classification) => {
            const category = classification.category || 'Open';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(classification);
            return groups;
        }, {});
    }
    
    getCategoryIcon(category) {
        if (category.includes('M')) return '👨';
        if (category.includes('F')) return '👩';
        return '🏃';
    }
    
    toggleView() {
        this.currentView = this.currentView === 'general' ? 'category' : 'general';
        
        if (this.currentView === 'general') {
            this.generalRanking.style.display = 'block';
            this.categoryRankings.style.display = 'none';
            this.toggleViewBtn.textContent = '🏅 Ver por Categoria';
        } else {
            this.generalRanking.style.display = 'none';
            this.categoryRankings.style.display = 'block';
            this.toggleViewBtn.textContent = '🏆 Ver Geral';
        }
        
        this.renderRankings();
    }
    
    filterByCategory() {
        this.renderRankings();
    }
    
    formatTime(timeInterval) {
        if (!timeInterval) return '--:--:--';
        
        const totalMs = this.parseInterval(timeInterval);
        if (totalMs <= 0) return '--:--:--';
        
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    formatGapTime(gapInterval, position) {
        if (position === 1) {
            return '--:--';
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
    
    formatPace(paceSeconds, eventType) {
        if (!paceSeconds || paceSeconds <= 0 || eventType !== 'running') {
            return '--';
        }
        
        const minutes = Math.floor(paceSeconds / 60);
        const seconds = Math.floor(paceSeconds % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    formatSpeed(speedKmh) {
        if (!speedKmh || speedKmh <= 0) {
            return '--';
        }
        
        return speedKmh.toFixed(1);
    }
    
    parseInterval(interval) {
        if (!interval) return 0;
        
        if (typeof interval === 'string') {
            // Formato PostgreSQL interval
            const match = interval.match(/(\d+):(\d+):(\d+\.?\d*)/);
            if (match) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseFloat(match[3]);
                return (hours * 3600 + minutes * 60 + seconds) * 1000;
            }
        }
        
        return 0;
    }
    
    getClassificationStatus(classification) {
        if (classification.is_penalty) {
            return { class: 'status-penalty', text: 'PENALIDADE' };
        }
        
        if (classification.total_time) {
            return { class: 'status-completed', text: 'COMPLETO' };
        }
        
        return { class: 'status-in-progress', text: 'EM ANDAMENTO' };
    }
    
    getPositionClass(position) {
        if (position === 1) return 'pos-gold';
        if (position === 2) return 'pos-silver';
        if (position === 3) return 'pos-bronze';
        return '';
    }
    
    exportRankings() {
        const filteredClassifications = this.getFilteredClassifications();
        
        const headers = [
            'Posição',
            'Dorsal',
            'Nome',
            'Equipa',
            'Categoria',
            'Tempo Total',
            'Gap',
            'Ritmo',
            'Velocidade',
            'Status'
        ];
        
        const rows = filteredClassifications.map(c => [
            c.position,
            c.dorsal_number,
            c.full_name || 'N/A',
            c.team_name || 'N/A',
            c.category || 'Open',
            this.formatTime(c.total_time),
            this.formatGapTime(c.gap_to_leader, c.position),
            this.formatPace(c.pace_per_km_seconds, c.event_type),
            this.formatSpeed(c.avg_speed_kmh),
            c.is_penalty ? 'PENALIDADE' : 'COMPLETO'
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rankings_evento_${this.selectedEventId}.csv`;
        link.click();
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.categoryRankingsManager = new CategoryRankingsManager();
});
