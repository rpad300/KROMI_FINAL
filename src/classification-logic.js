/**
 * VisionKrono - Lógica de Classificações
 * Centraliza TODA a lógica de cálculo de tempos para classificações
 */

const https = require('https');

class ClassificationLogic {
    constructor(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
    }

    /**
     * Buscar APENAS event_started_at (mais simples e rápido)
     */
    async getEventStartTime(eventId) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/events?id=eq.${eventId}&select=event_started_at&limit=1`;
            const urlObj = new URL(url);
            
            console.log('🔍 getEventStartTime URL:', url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    console.log('📥 getEventStartTime status:', res.statusCode);
                    console.log('📥 getEventStartTime data:', data);
                    
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            console.log('✅ getEventStartTime parsed:', result);
                            resolve(result[0]?.event_started_at || null);
                        } catch (e) {
                            console.error('❌ getEventStartTime parse error:', e);
                            resolve(null);
                        }
                    } else {
                        console.error('❌ getEventStartTime status:', res.statusCode);
                        resolve(null);
                    }
                });
            });
            req.on('error', (error) => {
                console.error('❌ getEventStartTime error:', error);
                resolve(null);
            });
            req.end();
        });
    }

    /**
     * Buscar dados do evento
     */
    async getEventData(eventId) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/events?id=eq.${eventId}&select=event_type,event_started_at,has_lap_counter,distance_km&limit=1`;
            const urlObj = new URL(url);
            
            console.log('🔍 getEventData URL:', url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    console.log('📥 getEventData status:', res.statusCode);
                    console.log('📥 getEventData data:', data);
                    
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            console.log('✅ getEventData result:', result);
                            resolve(result[0] || null);
                        } catch (e) {
                            console.error('❌ getEventData parse error:', e);
                            resolve(null);
                        }
                    } else {
                        console.error('❌ getEventData status não 200');
                        resolve(null);
                    }
                });
            });
            req.on('error', (error) => {
                console.error('❌ getEventData request error:', error);
                resolve(null);
            });
            req.end();
        });
    }

    /**
     * Buscar dados do checkpoint/dispositivo
     */
    async getCheckpointData(eventId, deviceOrder) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/event_devices?event_id=eq.${eventId}&checkpoint_order=eq.${deviceOrder}&select=checkpoint_type,checkpoint_name,checkpoint_order&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result[0] || null);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.end();
        });
    }

    /**
     * Verificar quantos checkpoints o evento tem
     */
    async getTotalCheckpoints(eventId) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/event_devices?event_id=eq.${eventId}&select=checkpoint_order&order=checkpoint_order.desc&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result[0]?.checkpoint_order || 1);
                        } catch (e) {
                            resolve(1);
                        }
                    } else {
                        resolve(1);
                    }
                });
            }).on('error', () => resolve(1));
        });
    }

    /**
     * Buscar checkpoint anterior do mesmo atleta
     */
    async getPreviousCheckpoint(eventId, dorsalNumber, deviceOrder) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/classifications?event_id=eq.${eventId}&dorsal_number=eq.${dorsalNumber}&device_order=lt.${deviceOrder}&select=checkpoint_time&order=device_order.desc&limit=1`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result[0]?.checkpoint_time || null);
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }

    /**
     * Buscar todas as classificações do evento (para calcular ranking)
     */
    async getAllClassifications(eventId) {
        return new Promise((resolve) => {
            const url = `${this.supabaseUrl}/rest/v1/classifications?event_id=eq.${eventId}&select=*&order=total_time.asc`;
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve([]);
                        }
                    } else {
                        resolve([]);
                    }
                });
            }).on('error', () => resolve([]));
        });
    }

    /**
     * Calcular ranking e estatísticas (migrado da VIEW)
     */
    async calculateRankingAndStats(eventId, classifications) {
        // Agrupar por dorsal e pegar melhor tempo
        const dorsalBestTimes = {};
        classifications.forEach(c => {
            if (c.total_time && !c.is_penalty) {
                const key = c.dorsal_number;
                if (!dorsalBestTimes[key] || c.total_time < dorsalBestTimes[key]) {
                    dorsalBestTimes[key] = c.total_time;
                }
            }
        });

        // Ordenar por tempo
        const sorted = Object.entries(dorsalBestTimes)
            .sort((a, b) => a[1] - b[1]);

        // Calcular posições e gaps
        const rankings = {};
        let position = 1;
        let previousTime = null;

        sorted.forEach(([dorsal, time]) => {
            const gapToLeader = previousTime ? time - sorted[0][1] : null;
            
            rankings[dorsal] = {
                position: position++,
                best_time: time,
                gap_to_leader: gapToLeader
            };
            
            previousTime = time;
        });

        return {
            rankings,
            total_athletes: sorted.length,
            fastest_time: sorted[0]?.[1] || null
        };
    }

    /**
     * Calcular velocidade média (migrado da VIEW)
     */
    calculateAverageSpeed(totalTimeSeconds, distanceKm) {
        if (!totalTimeSeconds || totalTimeSeconds <= 0 || !distanceKm) return null;
        // km/h = (distância_km * 3600) / tempo_segundos
        const speed = (distanceKm * 3600) / totalTimeSeconds;
        return speed.toFixed(2); // 2 casas decimais
    }

    /**
     * Converter interval PostgreSQL para formato legível
     */
    formatInterval(interval) {
        if (!interval) return '--:--:--';
        
        // Parse "X seconds" ou objeto interval ou "HH:MM:SS"
        let totalSeconds = 0;
        
        if (typeof interval === 'string') {
            // Parse "HH:MM:SS" (PostgreSQL format)
            const timeMatch = interval.match(/^(\d+):(\d+):(\d+)$/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseInt(timeMatch[3]);
                totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
            } else {
                // Parse "X seconds"
                const secondsMatch = interval.match(/(\d+)\s*seconds?/);
                if (secondsMatch) {
                    totalSeconds = parseInt(secondsMatch[1]);
                }
            }
        } else if (interval.seconds) {
            totalSeconds = interval.seconds;
        }
        
        if (totalSeconds === 0) return '--:--:--';
        
        // Converter para dias, horas, minutos, segundos
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // Formato: "X days HH:MM:SS" ou "HH:MM:SS"
        if (days > 0) {
            return `${days} days ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    /**
     * CALCULAR TEMPOS DE CLASSIFICAÇÃO
     * Esta é a função principal que implementa TODA a lógica
     * 
     * @param params.deviceInfo - Dados do dispositivo JÁ carregados (opcional, evita queries)
     * @param params.eventData - Dados do evento JÁ carregados (opcional, evita queries)
     */
    async calculateClassificationTimes(params) {
        const {
            eventId,
            dorsalNumber,
            deviceOrder,
            checkpointTime,
            deviceInfo = null,  // NOVO: aceita dados já carregados
            eventData = null     // NOVO: aceita dados já carregados
        } = params;

        // SIMPLIFICADO: Usar apenas deviceInfo passado
        const checkpointType = deviceInfo?.checkpoint_type || 'finish';
        
        // DEBUG
        console.log('🔍 calculateClassificationTimes SIMPLIFICADO:');
        console.log('   deviceInfo:', deviceInfo);
        console.log('   checkpointType:', checkpointType);
        
        // Para eventos simples (1 checkpoint finish) → calcular total_time
        // Para eventos complexos, o trigger SQL fará o resto
        
        // Buscar event_started_at APENAS se for finish
        let eventStartTime = null;
        if (checkpointType === 'finish') {
            console.log('🔍 Buscando event_started_at...');
            
            // Usar função do background-processor que sabemos que funciona
            eventStartTime = await this.getEventStartTime(eventId);
            
            console.log('   eventStartTime retornado:', eventStartTime);
        }
        
        const isFinish = (checkpointType === 'finish' || checkpointType === 'final');
        
        console.log('🔍 Decisão final:');
        console.log('   isFinish:', isFinish);
        console.log('   eventStartTime:', eventStartTime);
        
        let totalTime = null;
        let splitTime = null;

        // ============================================================
        // LÓGICA SIMPLIFICADA
        // ============================================================
        
        if (isFinish && eventStartTime) {
            // META/finish → calcular tempo total
            const checkpointDate = new Date(checkpointTime);
            const startDate = new Date(eventStartTime);
            const diffMs = checkpointDate - startDate;
            const totalSeconds = Math.floor(diffMs / 1000);
            
            totalTime = `${totalSeconds} seconds`;
            splitTime = totalTime;
            
            console.log('✅ CALCULADO: total_time =', totalTime);
        } else {
            console.log('⚠️ NÃO calculado: isFinish=', isFinish, 'eventStartTime=', eventStartTime);
        }

        return {
            total_time: totalTime,
            split_time: splitTime,
            metadata: {
                event_type: 'running',
                checkpoint_type: checkpointType,
                is_last_checkpoint: isFinish,
                has_lap_counter: false,
                total_checkpoints: 1
            }
        };

        // ============================================================
        // CÓDIGO ANTIGO COMENTADO (para referência futura)
        // ============================================================
        /*
        if (hasLapCounter) {
            // ====================
            // EVENTOS COM VOLTAS
            // ====================
            if (checkpointType === 'lap_counter') {
                // Volta: split_time = tempo desde última volta
                if (previousCheckpointTime) {
                    const diffMs = new Date(checkpointTime) - new Date(previousCheckpointTime);
                    const seconds = Math.floor(diffMs / 1000);
                    splitTime = `${seconds} seconds`;
                } else if (eventStartTime) {
                    // Primeira volta
                    const diffMs = new Date(checkpointTime) - new Date(eventStartTime);
                    const seconds = Math.floor(diffMs / 1000);
                    splitTime = `${seconds} seconds`;
                }
            }
            
            if (isLastCheckpoint && eventStartTime) {
                // META FINAL: tempo total
                const diffMs = new Date(checkpointTime) - new Date(eventStartTime);
                const seconds = Math.floor(diffMs / 1000);
                totalTime = `${seconds} seconds`;
                if (!splitTime) splitTime = totalTime;
            }
            
        } else if (eventType === 'triathlon' || eventType === 'duathlon') {
            // ====================
            // TRIATLO / DUATLO
            // ====================
            // Metas de atividades: swimming_finish, cycling_finish, running_finish
            
            // Split time sempre (tempo da atividade)
            if (previousCheckpointTime) {
                const diffMs = new Date(checkpointTime) - new Date(previousCheckpointTime);
                const seconds = Math.floor(diffMs / 1000);
                splitTime = `${seconds} seconds`;
            } else if (eventStartTime) {
                const diffMs = new Date(checkpointTime) - new Date(eventStartTime);
                const seconds = Math.floor(diffMs / 1000);
                splitTime = `${seconds} seconds`;
            }
            
            // Total time APENAS no último checkpoint (running_finish geralmente)
            if (isLastCheckpoint && eventStartTime) {
                const diffMs = new Date(checkpointTime) - new Date(eventStartTime);
                const seconds = Math.floor(diffMs / 1000);
                totalTime = `${seconds} seconds`;
            }
            
        } else {
            // ====================
            // EVENTOS SIMPLES (corrida, ciclismo, etc)
            // ====================
            
            if (checkpointType === 'intermediate' || checkpointType === 'timing') {
                // Checkpoints intermediários: split_time apenas
                if (previousCheckpointTime) {
                    const diffMs = new Date(checkpointTime) - new Date(previousCheckpointTime);
                    const seconds = Math.floor(diffMs / 1000);
                    splitTime = `${seconds} seconds`;
                } else if (eventStartTime) {
                    const diffMs = new Date(checkpointTime) - new Date(eventStartTime);
                    const seconds = Math.floor(diffMs / 1000);
                    splitTime = `${seconds} seconds`;
                }
            }
            
            if (isLastCheckpoint && eventStartTime) {
                // META FINAL: tempo total
                const diffMs = new Date(checkpointTime) - new Date(eventStartTime);
                const seconds = Math.floor(diffMs / 1000);
                totalTime = `${seconds} seconds`;
                
                if (previousCheckpointTime) {
                    const diffMs = new Date(checkpointTime) - new Date(previousCheckpointTime);
                    const seconds = Math.floor(diffMs / 1000);
                    splitTime = `${seconds} seconds`;
                } else {
                    splitTime = totalTime;
                }
            }
        }
        */

        // Nunca chega aqui (return acima)
        /*
        return {
            total_time: totalTime,
            split_time: splitTime,
            metadata: {
                event_type: eventType,
                checkpoint_type: checkpointType,
                is_last_checkpoint: isLastCheckpoint,
                has_lap_counter: hasLapCounter,
                total_checkpoints: totalCheckpoints
            }
        };
        */
    }

    /**
     * Processar classificações completas com ranking
     * (substitui a VIEW event_classifications)
     */
    async processCompleteClassifications(eventId) {
        // Buscar evento com distance_km
        const eventData = await this.getEventData(eventId);
        const distanceKm = parseFloat(eventData?.distance_km) || 10.0;
        
        console.log('📊 processCompleteClassifications:');
        console.log('   eventData:', eventData);
        console.log('   distanceKm:', distanceKm);
        
        // Buscar todas as classificações
        const classifications = await this.getAllClassifications(eventId);
        
        // Calcular rankings
        const stats = await this.calculateRankingAndStats(eventId, classifications);
        
        // Enriquecer cada classificação com dados calculados
        const enriched = classifications
            .filter(c => c.total_time) // Apenas com tempo final
            .map(c => {
                const ranking = stats.rankings[c.dorsal_number];
                const totalSeconds = this.intervalToSeconds(c.total_time);
                const gapSeconds = this.intervalToSeconds(ranking?.gap_to_leader);
                const avgSpeed = this.calculateAverageSpeed(totalSeconds, distanceKm);
                
                console.log(`📊 Dorsal ${c.dorsal_number}:`, {
                    totalSeconds,
                    distanceKm,
                    avgSpeed
                });
                
                return {
                    ...c,
                    position: ranking?.position || null,
                    gap_to_leader: ranking?.gap_to_leader || null,
                    avg_speed_kmh: avgSpeed,
                    total_athletes: stats.total_athletes,
                    fastest_time: stats.fastest_time,
                    // Formatar tempos para exibição
                    total_time_formatted: this.formatInterval(c.total_time),
                    gap_to_leader_formatted: gapSeconds > 0 ? this.formatInterval(ranking?.gap_to_leader) : '--'
                };
            })
            .sort((a, b) => (a.position || 999) - (b.position || 999));
        
        return enriched;
    }

    /**
     * Converter interval PostgreSQL para segundos
     */
    intervalToSeconds(interval) {
        if (!interval) return 0;
        
        if (typeof interval === 'string') {
            // Parse "HH:MM:SS" (PostgreSQL format)
            const timeMatch = interval.match(/^(\d+):(\d+):(\d+)$/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseInt(timeMatch[3]);
                return (hours * 3600) + (minutes * 60) + seconds;
            }
            
            // Parse "X seconds"
            const secondsMatch = interval.match(/(\d+)\s*seconds?/);
            if (secondsMatch) return parseInt(secondsMatch[1]);
            
            // Parse "X days HH:MM:SS"
            const daysMatch = interval.match(/(\d+)\s*days?\s+(\d+):(\d+):(\d+)/);
            if (daysMatch) {
                const days = parseInt(daysMatch[1]);
                const hours = parseInt(daysMatch[2]);
                const minutes = parseInt(daysMatch[3]);
                const seconds = parseInt(daysMatch[4]);
                return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
            }
        }
        
        return 0;
    }

    /**
     * PROCESSAR ATIVIDADES (Triatlo/Duatlo)
     * Migrado de: process_activity_detection trigger
     */
    async processActivityDetection(detectionData) {
        const { event_id, dorsal_number, checkpoint_time, device_id, detection_id } = detectionData;
        
        // Buscar modalidade do evento
        const eventData = await this.getEventData(event_id);
        const eventModality = eventData?.event_type;
        
        // Só processar para Triatlo/Duatlo
        if (eventModality !== 'triathlon' && eventModality !== 'duathlon') {
            return;
        }
        
        // Buscar tipo de checkpoint
        const checkpointData = await this.getCheckpointData(event_id, 1); // Simplificado
        const checkpointType = checkpointData?.checkpoint_type;
        
        // Determinar atividade
        let activityName = null;
        if (checkpointType === 'swimming_finish') activityName = 'Natação';
        else if (checkpointType === 'cycling_finish') activityName = 'Ciclismo';
        else if (checkpointType === 'running_finish') activityName = 'Corrida';
        else return;
        
        // Calcular tempo da atividade
        let previousActivityTime = null;
        
        if (activityName === 'Natação') {
            previousActivityTime = eventData?.event_started_at;
        } else {
            // Buscar fim da atividade anterior
            // (Implementação simplificada - pode expandir depois)
            previousActivityTime = eventData?.event_started_at;
        }
        
        // Calcular duração
        const duration = previousActivityTime ? 
            new Date(checkpoint_time) - new Date(previousActivityTime) : 0;
        
        const durationSeconds = Math.floor(duration / 1000);
        
        // Retornar dados para inserir em activity_times (se a tabela existir)
        return {
            event_id,
            dorsal_number,
            activity_name: activityName,
            activity_time: `${durationSeconds} seconds`,
            checkpoint_time,
            device_id,
            detection_id
        };
    }

    /**
     * PROCESSAR VOLTAS
     * Migrado de: process_lap_detection trigger
     */
    async processLapDetection(detectionData) {
        const { event_id, dorsal_number, checkpoint_time, device_id, detection_id } = detectionData;
        
        // Verificar se evento tem contador de voltas
        const eventData = await this.getEventData(event_id);
        if (!eventData?.has_lap_counter) {
            return null;
        }
        
        // Verificar se checkpoint é lap_counter
        // (simplificado - expandir depois se necessário)
        
        // Calcular número da volta
        // Buscar última volta (simplificado - implementação completa depois)
        const lapNumber = 1; // Placeholder
        
        // Calcular tempo da volta
        const lapTime = eventData?.event_started_at ?
            new Date(checkpoint_time) - new Date(eventData.event_started_at) : 0;
        
        const lapTimeSeconds = Math.floor(lapTime / 1000);
        
        // Calcular velocidade da volta (se temos distância)
        const lapDistance = 1; // km - buscar de event_lap_config
        const lapSpeed = lapTimeSeconds > 0 ?
            (lapDistance / lapTimeSeconds) * 3600 : null;
        
        // Retornar dados para inserir em lap_data
        return {
            event_id,
            dorsal_number,
            lap_number: lapNumber,
            lap_time: `${lapTimeSeconds} seconds`,
            lap_speed_kmh: lapSpeed,
            checkpoint_time,
            device_id,
            detection_id
        };
    }
}

module.exports = ClassificationLogic;


