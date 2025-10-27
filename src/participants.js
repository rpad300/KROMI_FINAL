class ParticipantsManager {
    constructor() {
        this.supabaseClient = null;
        this.selectedEventId = null;
        this.participants = [];
        this.currentParticipant = null;
        
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
        this.eventConfigSection = document.getElementById('eventConfigSection');
        this.eventType = document.getElementById('eventType');
        this.distanceKm = document.getElementById('distanceKm');
        this.hasCategories = document.getElementById('hasCategories');
        this.saveEventConfig = document.getElementById('saveEventConfig');
        
        this.uploadArea = document.getElementById('uploadArea');
        this.csvFile = document.getElementById('csvFile');
        this.downloadTemplate = document.getElementById('downloadTemplate');
        
        this.addParticipant = document.getElementById('addParticipant');
        this.exportParticipants = document.getElementById('exportParticipants');
        this.clearParticipants = document.getElementById('clearParticipants');
        this.participantsBody = document.getElementById('participantsBody');
        
        this.participantModal = document.getElementById('participantModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.closeModal = document.getElementById('closeModal');
        this.participantForm = document.getElementById('participantForm');
        this.saveParticipant = document.getElementById('saveParticipant');
        this.cancelParticipant = document.getElementById('cancelParticipant');
    }
    
    setupEventListeners() {
        this.eventSelect.addEventListener('change', () => this.onEventSelect());
        this.saveEventConfig.addEventListener('click', () => this.saveEventConfiguration());
        
        this.uploadArea.addEventListener('click', () => this.csvFile.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.csvFile.addEventListener('change', (e) => this.handleFileSelect(e));
        this.downloadTemplate.addEventListener('click', () => this.downloadTemplate());
        
        this.addParticipant.addEventListener('click', () => this.openAddParticipantModal());
        this.exportParticipants.addEventListener('click', () => this.exportParticipantsToCsv());
        this.clearParticipants.addEventListener('click', () => this.clearAllParticipants());
        
        this.closeModal.addEventListener('click', () => this.closeParticipantModal());
        this.cancelParticipant.addEventListener('click', () => this.closeParticipantModal());
        this.saveParticipant.addEventListener('click', () => this.saveParticipantData());
        
        // Fechar modal clicando fora
        this.participantModal.addEventListener('click', (e) => {
            if (e.target === this.participantModal) {
                this.closeParticipantModal();
            }
        });
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
                .select('id, name, is_active, event_type, distance_km, has_categories')
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
            this.eventConfigSection.style.display = 'block';
            await this.loadEventConfiguration();
            await this.loadParticipants();
        } else {
            this.eventConfigSection.style.display = 'none';
        }
    }
    
    async loadEventConfiguration() {
        try {
            const { data: event, error } = await this.supabaseClient
                .from('events')
                .select('event_type, distance_km, has_categories')
                .eq('id', this.selectedEventId)
                .single();
            
            if (error) throw error;
            
            this.eventType.value = event.event_type || 'running';
            this.distanceKm.value = event.distance_km || 10.0;
            this.hasCategories.checked = event.has_categories !== false;
        } catch (error) {
            console.error('❌ Erro ao carregar configuração do evento:', error);
        }
    }
    
    async saveEventConfiguration() {
        try {
            const { error } = await this.supabaseClient
                .from('events')
                .update({
                    event_type: this.eventType.value,
                    distance_km: parseFloat(this.distanceKm.value),
                    has_categories: this.hasCategories.checked
                })
                .eq('id', this.selectedEventId);
            
            if (error) throw error;
            
            alert('✅ Configuração salva com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar configuração:', error);
            alert('❌ Erro ao salvar configuração');
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processCsvFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processCsvFile(file);
        }
    }
    
    async processCsvFile(file) {
        try {
            const text = await file.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            // Validar headers
            const requiredHeaders = ['dorsal_number', 'full_name', 'birth_date', 'gender'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                alert(`❌ Headers obrigatórios em falta: ${missingHeaders.join(', ')}`);
                return;
            }
            
            const participants = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const participant = {};
                    
                    headers.forEach((header, index) => {
                        participant[header] = values[index] || '';
                    });
                    
                    // Validar dados obrigatórios
                    if (participant.dorsal_number && participant.full_name && participant.birth_date && participant.gender) {
                        participants.push({
                            event_id: this.selectedEventId,
                            dorsal_number: parseInt(participant.dorsal_number),
                            full_name: participant.full_name,
                            birth_date: participant.birth_date,
                            gender: participant.gender.toUpperCase(),
                            team_name: participant.team_name || null
                        });
                    }
                }
            }
            
            if (participants.length > 0) {
                await this.saveParticipants(participants);
            } else {
                alert('❌ Nenhum participante válido encontrado no arquivo');
            }
        } catch (error) {
            console.error('❌ Erro ao processar arquivo CSV:', error);
            alert('❌ Erro ao processar arquivo CSV');
        }
    }
    
    async saveParticipants(participants) {
        try {
            const { error } = await this.supabaseClient
                .from('participants')
                .upsert(participants, { onConflict: 'event_id,dorsal_number' });
            
            if (error) throw error;
            
            alert(`✅ ${participants.length} participantes carregados com sucesso!`);
            await this.loadParticipants();
        } catch (error) {
            console.error('❌ Erro ao salvar participantes:', error);
            alert('❌ Erro ao salvar participantes');
        }
    }
    
    downloadTemplate() {
        const csvContent = [
            'dorsal_number,full_name,birth_date,gender,team_name',
            '1,João Silva,1985-03-15,M,Clube Atlético',
            '2,Maria Santos,1990-07-22,F,Equipa Speed',
            '3,Pedro Costa,1978-11-08,M,Clube Atlético',
            '4,Ana Oliveira,1995-05-30,F,Equipa Speed'
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_participantes.csv';
        link.click();
    }
    
    async loadParticipants() {
        try {
            const { data: participants, error } = await this.supabaseClient
                .from('participants')
                .select('*')
                .eq('event_id', this.selectedEventId)
                .order('dorsal_number');
            
            if (error) throw error;
            
            this.participants = participants || [];
            this.renderParticipants();
        } catch (error) {
            console.error('❌ Erro ao carregar participantes:', error);
        }
    }
    
    renderParticipants() {
        this.participantsBody.innerHTML = this.participants.map(participant => `
            <tr>
                <td>${participant.dorsal_number}</td>
                <td>${participant.full_name}</td>
                <td>${participant.birth_date}</td>
                <td>${participant.gender}</td>
                <td>${participant.team_name || 'N/A'}</td>
                <td><span class="category-badge">${participant.category || 'Open'}</span></td>
                <td>
                    <button class="btn-edit" onclick="window.participantsManager.editParticipant('${participant.id}')">✏️</button>
                    <button class="btn-delete" onclick="window.participantsManager.deleteParticipant('${participant.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    }
    
    openAddParticipantModal() {
        this.currentParticipant = null;
        this.modalTitle.textContent = 'Adicionar Participante';
        this.participantForm.reset();
        this.participantModal.style.display = 'flex';
    }
    
    editParticipant(participantId) {
        const participant = this.participants.find(p => p.id === participantId);
        if (participant) {
            this.currentParticipant = participant;
            this.modalTitle.textContent = 'Editar Participante';
            
            document.getElementById('modalDorsal').value = participant.dorsal_number;
            document.getElementById('modalName').value = participant.full_name;
            document.getElementById('modalBirthDate').value = participant.birth_date;
            document.getElementById('modalGender').value = participant.gender;
            document.getElementById('modalTeam').value = participant.team_name || '';
            
            this.participantModal.style.display = 'flex';
        }
    }
    
    async deleteParticipant(participantId) {
        if (confirm('Tem certeza que deseja excluir este participante?')) {
            try {
                const { error } = await this.supabaseClient
                    .from('participants')
                    .delete()
                    .eq('id', participantId);
                
                if (error) throw error;
                
                await this.loadParticipants();
            } catch (error) {
                console.error('❌ Erro ao excluir participante:', error);
                alert('❌ Erro ao excluir participante');
            }
        }
    }
    
    closeParticipantModal() {
        this.participantModal.style.display = 'none';
        this.currentParticipant = null;
    }
    
    async saveParticipantData() {
        try {
            const participantData = {
                event_id: this.selectedEventId,
                dorsal_number: parseInt(document.getElementById('modalDorsal').value),
                full_name: document.getElementById('modalName').value,
                birth_date: document.getElementById('modalBirthDate').value,
                gender: document.getElementById('modalGender').value,
                team_name: document.getElementById('modalTeam').value || null
            };
            
            if (this.currentParticipant) {
                // Editar
                const { error } = await this.supabaseClient
                    .from('participants')
                    .update(participantData)
                    .eq('id', this.currentParticipant.id);
                
                if (error) throw error;
            } else {
                // Adicionar
                const { error } = await this.supabaseClient
                    .from('participants')
                    .insert(participantData);
                
                if (error) throw error;
            }
            
            this.closeParticipantModal();
            await this.loadParticipants();
        } catch (error) {
            console.error('❌ Erro ao salvar participante:', error);
            alert('❌ Erro ao salvar participante');
        }
    }
    
    exportParticipantsToCsv() {
        const csvContent = [
            'dorsal_number,full_name,birth_date,gender,team_name,category',
            ...this.participants.map(p => 
                `${p.dorsal_number},${p.full_name},${p.birth_date},${p.gender},${p.team_name || ''},${p.category || ''}`
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `participantes_evento_${this.selectedEventId}.csv`;
        link.click();
    }
    
    async clearAllParticipants() {
        if (confirm('Tem certeza que deseja excluir TODOS os participantes deste evento?')) {
            try {
                const { error } = await this.supabaseClient
                    .from('participants')
                    .delete()
                    .eq('event_id', this.selectedEventId);
                
                if (error) throw error;
                
                await this.loadParticipants();
                alert('✅ Todos os participantes foram excluídos');
            } catch (error) {
                console.error('❌ Erro ao limpar participantes:', error);
                alert('❌ Erro ao limpar participantes');
            }
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.participantsManager = new ParticipantsManager();
});
