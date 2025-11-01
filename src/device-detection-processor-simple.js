/**
 * Device Detection Processor - Versão SIMPLES (processamento no servidor)
 * 
 * Em vez de usar RPCs PostgreSQL complexas, processa tudo no Node.js:
 * 1. Buscar registros pending
 * 2. Buscar info do event_devices
 * 3. Inserir em detections OU image_buffer
 * 4. Atualizar status
 */

const { createClient } = require('@supabase/supabase-js');
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
                // Inserir em detections
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
                            action: 'direct_detection',
                            detection_id: detection.id,
                            checkpoint_order: eventDevices.checkpoint_order,
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
}

module.exports = DeviceDetectionProcessorSimple;

