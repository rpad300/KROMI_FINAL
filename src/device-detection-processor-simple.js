/**
 * Device Detection Processor - Versão SIMPLES (processamento no servidor)
 * 
 * Em vez de usar RPCs PostgreSQL complexas, processa tudo no Node.js:
 * 1. Buscar registros pending
 * 2. Buscar info do event_devices
 * 3. Inserir em detections OU image_buffer
 * 4. Quando tem dorsal_number: fazer fluxo completo (igual ao Gemini)
 *    - Verificar participante
 *    - Verificar duplicados
 *    - Calcular tempos
 *    - Criar classificação
 * 5. Atualizar status
 */

const { createClient } = require('@supabase/supabase-js');
const ClassificationLogic = require('./classification-logic');
require('dotenv').config();

class DeviceDetectionProcessorSimple {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabase = null;
        this.intervalId = null;
        this.isProcessing = false;
        this.checkInterval = 5000; // 5 segundos
    }

    async init() {
        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            console.error('❌ DeviceDetectionProcessor: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
            return false;
        }
        this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
        // Inicializar ClassificationLogic para cálculo de tempos
        this.classificationLogic = new ClassificationLogic(this.supabaseUrl, this.supabaseServiceKey);
        return true;
    }

    startAutoProcessor() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => this.processPendingDetections(), this.checkInterval);
        console.log(`✅ DeviceDetectionProcessor: Monitoramento ativo a cada ${this.checkInterval / 1000}s`);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 DeviceDetectionProcessor: Parado');
        }
    }

    async processPendingDetections() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            // Buscar registros pending
            const { data: pendingRecords, error: fetchError } = await this.supabase
                .from('device_detections')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(10);

            if (fetchError) {
                console.error('❌ Erro ao buscar registros:', fetchError);
                return;
            }

            if (!pendingRecords || pendingRecords.length === 0) {
                return; // Nada para processar
            }

            let processed = 0;
            let failed = 0;

            for (const record of pendingRecords) {
                const success = await this.processOneRecord(record);
                if (success) {
                    processed++;
                } else {
                    failed++;
                }
            }

            if (processed > 0 || failed > 0) {
                console.log(`✅ Processados: ${processed} | Falhas: ${failed} | Total: ${pendingRecords.length}`);
            }

        } catch (error) {
            console.error('❌ Erro geral:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async processOneRecord(record) {
        try {
            // 1. Marcar como processing
            await this.supabase
                .from('device_detections')
                .update({ status: 'processing' })
                .eq('id', record.id);

            // 2. Buscar info do event_devices
            const { data: eventDevices, error: edError } = await this.supabase
                .from('event_devices')
                .select(`
                    device_id,
                    event_id,
                    checkpoint_order,
                    checkpoint_name,
                    checkpoint_type,
                    events (status)
                `)
                .eq('access_code', record.access_code)
                .single();

            if (edError || !eventDevices) {
                await this.markAsFailed(record.id, 'Dispositivo não encontrado');
                return false;
            }

            // 3. Verificar se evento está ativo
            if (eventDevices.events?.status !== 'active') {
                await this.markAsFailed(record.id, 'Evento não está ativo');
                return false;
            }

            // 4. Atualizar cache em device_detections
            await this.supabase
                .from('device_detections')
                .update({
                    event_id: eventDevices.event_id,
                    device_id: eventDevices.device_id,
                    device_order: eventDevices.checkpoint_order,
                    checkpoint_name: eventDevices.checkpoint_name,
                    checkpoint_type: eventDevices.checkpoint_type
                })
                .eq('id', record.id);

            // 5. Decidir: detections OU image_buffer
            const hasDorsal = record.dorsal_number !== null && record.dorsal_number !== undefined;

            if (hasDorsal) {
                // ✅ FLUXO COMPLETO (igual ao Gemini quando processa image_buffer):
                // 1. Verificar se dorsal é participante
                // 2. Se não for: salvar apenas detecção
                // 3. Se for: salvar detecção, calcular tempos, verificar duplicado, criar classificação
                
                console.log(`🔍 Processando dorsal ${record.dorsal_number} do app nativo...`);
                
                // ✅ PASSO 1: Verificar se dorsal existe nos participantes
                const participantExists = await this.checkParticipantExists(
                    eventDevices.event_id,
                    record.dorsal_number
                );
                
                if (!participantExists) {
                    console.log(`⚠️ Dorsal ${record.dorsal_number} NÃO está registado nos participantes - salvando apenas detecção`);
                    
                    // Salvar APENAS a detecção (sem criar classificação)
                    const { data: detection, error: detError } = await this.supabase
                        .from('detections')
                        .insert({
                            event_id: eventDevices.event_id,
                            number: record.dorsal_number,
                            timestamp: record.captured_at,
                            latitude: record.latitude,
                            longitude: record.longitude,
                            accuracy: record.accuracy,
                            device_type: 'android',
                            session_id: record.session_id,
                            device_id: eventDevices.device_id,
                            device_order: eventDevices.checkpoint_order,
                            checkpoint_time: record.captured_at,
                            proof_image: record.display_image,
                            detection_method: 'native_app'
                        })
                        .select()
                        .single();

                    if (detError) {
                        await this.markAsFailed(record.id, `Erro ao inserir detection: ${detError.message}`);
                        return false;
                    }

                    // Marcar como processed
                    await this.supabase
                        .from('device_detections')
                        .update({
                            status: 'processed',
                            detection_id: detection.id,
                            processed_at: new Date().toISOString(),
                            processing_result: {
                                action: 'direct_detection_no_participant',
                                detection_id: detection.id,
                                checkpoint_order: eventDevices.checkpoint_order,
                                checkpoint_name: eventDevices.checkpoint_name,
                                reason: 'Dorsal não é participante'
                            }
                        })
                        .eq('id', record.id);

                    console.log(`✅ Detecção salva (dorsal ${record.dorsal_number}) mas classificação IGNORADA (não é participante)`);
                    return true;
                }
                
                // ✅ PASSO 2: Participante existe - continuar com fluxo completo
                console.log(`✅ Dorsal ${record.dorsal_number} é participante válido - criando classificação`);
                
                // Salvar detecção primeiro
                const { data: detection, error: detError } = await this.supabase
                    .from('detections')
                    .insert({
                        event_id: eventDevices.event_id,
                        number: record.dorsal_number,
                        timestamp: record.captured_at,
                        latitude: record.latitude,
                        longitude: record.longitude,
                        accuracy: record.accuracy,
                        device_type: 'android',
                        session_id: record.session_id,
                        device_id: eventDevices.device_id,
                        device_order: eventDevices.checkpoint_order,
                        checkpoint_time: record.captured_at,
                        proof_image: record.display_image,
                        detection_method: 'native_app'
                    })
                    .select()
                    .single();

                if (detError) {
                    await this.markAsFailed(record.id, `Erro ao inserir detection: ${detError.message}`);
                    return false;
                }

                if (!detection || !eventDevices.event_id) {
                    console.log('⚠️ Sem detecção salva ou evento, pulando classificação');
                    await this.markAsFailed(record.id, 'Detecção não foi salva corretamente');
                    return false;
                }

                // ✅ PASSO 3: Buscar informações do dispositivo
                const deviceInfo = await this.getDeviceInfo(
                    eventDevices.device_id,
                    eventDevices.event_id
                );
                const deviceOrder = deviceInfo?.checkpoint_order || eventDevices.checkpoint_order;

                // ✅ PASSO 4: Calcular tempos com módulo centralizado
                const times = await this.classificationLogic.calculateClassificationTimes({
                    eventId: eventDevices.event_id,
                    dorsalNumber: record.dorsal_number,
                    deviceOrder: deviceOrder,
                    checkpointTime: record.captured_at,
                    deviceInfo: deviceInfo || {
                        checkpoint_order: eventDevices.checkpoint_order,
                        checkpoint_name: eventDevices.checkpoint_name,
                        checkpoint_type: eventDevices.checkpoint_type
                    }
                });

                if (times.total_time) {
                    console.log(`⏱️ META FINAL: total_time calculado`);
                } else if (times.split_time) {
                    console.log(`ℹ️ Checkpoint intermediário: split_time calculado`);
                }

                // ✅ PASSO 5: Verificar se já existe classificação (evitar duplicados)
                const classificationExists = await this.checkClassificationExists(
                    eventDevices.event_id,
                    record.dorsal_number,
                    deviceOrder
                );

                if (classificationExists) {
                    console.log(`⚠️ Classificação JÁ EXISTE para dorsal ${record.dorsal_number} no checkpoint ${deviceOrder} - IGNORANDO duplicado`);
                    
                    // Marcar como processed mesmo assim (detecção foi salva)
                    await this.supabase
                        .from('device_detections')
                        .update({
                            status: 'processed',
                            detection_id: detection.id,
                            processed_at: new Date().toISOString(),
                            processing_result: {
                                action: 'direct_detection_duplicate',
                                detection_id: detection.id,
                                checkpoint_order: deviceOrder,
                                checkpoint_name: eventDevices.checkpoint_name,
                                reason: 'Classificação duplicada ignorada'
                            }
                        })
                        .eq('id', record.id);
                    
                    return true; // NÃO criar duplicado
                }

                // ✅ PASSO 6: Criar classificação
                await this.saveClassification({
                    event_id: eventDevices.event_id,
                    dorsal_number: record.dorsal_number,
                    device_order: deviceOrder,
                    checkpoint_time: record.captured_at,
                    detection_id: detection.id,
                    total_time: times.total_time,
                    split_time: times.split_time
                });

                console.log(`✅ Classificação criada: dorsal ${record.dorsal_number} no checkpoint ${deviceOrder}`);

                // Marcar como processed
                await this.supabase
                    .from('device_detections')
                    .update({
                        status: 'processed',
                        detection_id: detection.id,
                        processed_at: new Date().toISOString(),
                        processing_result: {
                            action: 'direct_detection_with_classification',
                            detection_id: detection.id,
                            checkpoint_order: deviceOrder,
                            checkpoint_name: eventDevices.checkpoint_name
                        }
                    })
                    .eq('id', record.id);

                return true;

            } else {
                // Inserir em image_buffer
                const { data: buffer, error: bufError } = await this.supabase
                    .from('image_buffer')
                    .insert({
                        event_id: eventDevices.event_id,
                        device_id: eventDevices.device_id,
                        session_id: record.session_id,
                        image_data: record.image_data,
                        display_image: record.display_image,
                        image_metadata: record.image_metadata,
                        captured_at: record.captured_at,
                        latitude: record.latitude,
                        longitude: record.longitude,
                        accuracy: record.accuracy,
                        status: 'pending'
                    })
                    .select()
                    .single();

                if (bufError) {
                    await this.markAsFailed(record.id, `Erro ao inserir buffer: ${bufError.message}`);
                    return false;
                }

                // Marcar como processed
                await this.supabase
                    .from('device_detections')
                    .update({
                        status: 'processed',
                        buffer_id: buffer.id,
                        processed_at: new Date().toISOString(),
                        processing_result: {
                            action: 'sent_to_buffer',
                            buffer_id: buffer.id,
                            checkpoint_order: eventDevices.checkpoint_order,
                            checkpoint_name: eventDevices.checkpoint_name
                        }
                    })
                    .eq('id', record.id);

                return true;
            }

        } catch (error) {
            console.error(`❌ Erro ao processar ${record.id.substring(0, 8)}...:`, error.message);
            console.error('Stack:', error.stack);
            await this.markAsFailed(record.id, error.message);
            return false;
        }
    }

    async markAsFailed(recordId, errorMessage) {
        await this.supabase
            .from('device_detections')
            .update({
                status: 'failed',
                processing_error: errorMessage,
                processed_at: new Date().toISOString()
            })
            .eq('id', recordId);
    }

    /**
     * Verificar se um dorsal existe nos participantes do evento
     */
    async checkParticipantExists(eventId, dorsalNumber) {
        const { data, error } = await this.supabase
            .from('participants')
            .select('id')
            .eq('event_id', eventId)
            .eq('dorsal_number', dorsalNumber)
            .limit(1);
        
        if (error) {
            console.error(`Erro ao verificar participante ${dorsalNumber}:`, error.message);
            return false;
        }
        return data && data.length > 0;
    }

    /**
     * Verificar se já existe classificação para evitar duplicados
     */
    async checkClassificationExists(eventId, dorsalNumber, deviceOrder) {
        const { data, error } = await this.supabase
            .from('classifications')
            .select('id')
            .eq('event_id', eventId)
            .eq('dorsal_number', dorsalNumber)
            .eq('device_order', deviceOrder)
            .limit(1);
        
        if (error) {
            console.error(`Erro ao verificar classificação duplicada ${dorsalNumber}:`, error.message);
            return false;
        }
        return data && data.length > 0;
    }

    /**
     * Buscar informações do dispositivo
     */
    async getDeviceInfo(deviceId, eventId) {
        const { data, error } = await this.supabase
            .from('event_devices')
            .select('checkpoint_order, checkpoint_name, checkpoint_type')
            .eq('device_id', deviceId)
            .eq('event_id', eventId)
            .limit(1)
            .single();
        
        if (error) {
            console.error(`Erro ao buscar device info:`, error.message);
            return null;
        }
        return data;
    }

    /**
     * Salvar classificação
     */
    async saveClassification(classification) {
        const { data, error } = await this.supabase
            .from('classifications')
            .insert(classification)
            .select()
            .single();
        
        if (error) {
            console.error(`❌ Erro ao salvar classificação:`, error.message);
            console.error(`   Dados:`, JSON.stringify(classification));
            throw new Error(`Erro ao salvar classificação: ${error.message}`);
        }
        
        console.log(`✅ Classificação salva: dorsal ${classification.dorsal_number} (trigger calculará tempos)`);
        return data;
    }
}

module.exports = DeviceDetectionProcessorSimple;

