package com.visionkrono.detection.data.repository

import com.visionkrono.detection.data.model.*
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

class SupabaseRepository(
    private val supabaseUrl: String,
    private val supabaseServiceKey: String // Usando Service Role Key
) {
    private val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = supabaseUrl,
        supabaseKey = supabaseServiceKey // Service Role Key permite acesso completo
    ) {
        install(Postgrest)
    }

    /**
     * Buscar informações do dispositivo no evento
     */
    suspend fun getDeviceInfo(eventId: String, deviceId: String): DeviceInfo? {
        return withContext(Dispatchers.IO) {
            try {
                val response = client.from("event_devices")
                    .select {
                        filter {
                            eq("event_id", eventId)
                            eq("device_id", deviceId)
                        }
                    }
                    .decodeSingle<EventDeviceRow>()
                
                DeviceInfo(
                    id = response.deviceId,
                    devicePin = response.devicePin,
                    checkpointName = response.checkpointName,
                    maxSessions = response.maxSessions ?: 1,
                    activeSessions = response.activeSessions ?: 0
                )
            } catch (e: Exception) {
                null
            }
        }
    }

    /**
     * Criar sessão do dispositivo
     * Nota: Implementação alternativa sem RPC (pode ser necessário usar HTTP direto)
     */
    suspend fun createDeviceSession(
        eventId: String,
        deviceId: String,
        sessionId: String,
        userAgent: String
    ): SessionResponse {
        return withContext(Dispatchers.IO) {
            try {
                // Verificar limite de sessões primeiro
                val deviceInfo = getDeviceInfo(eventId, deviceId)
                if (deviceInfo != null && deviceInfo.activeSessions >= deviceInfo.maxSessions) {
                    return@withContext SessionResponse(
                        success = false,
                        error = "Max sessions exceeded",
                        maxAllowed = deviceInfo.maxSessions
                    )
                }

                // Criar sessão diretamente na tabela device_sessions
                val now = java.time.Instant.now().toString()
                val sessionData = DeviceSessionRow(
                    sessionId = sessionId,
                    eventId = eventId,
                    deviceId = deviceId,
                    isActive = true,
                    startedAt = now,
                    lastHeartbeat = now,
                    userAgent = userAgent
                )

                client.from("device_sessions")
                    .insert(sessionData) {
                        select(Columns.ALL)
                    }

                // Atualizar contador de sessões ativas
                val newCount = (deviceInfo?.activeSessions ?: 0) + 1
                client.from("event_devices")
                    .update(mapOf("active_sessions" to newCount)) {
                        filter {
                            eq("event_id", eventId)
                            eq("device_id", deviceId)
                        }
                    }

                SessionResponse(
                    success = true,
                    sessionId = sessionId,
                    currentActive = newCount,
                    maxAllowed = deviceInfo?.maxSessions ?: 1
                )
            } catch (e: Exception) {
                SessionResponse(
                    success = false,
                    error = e.message ?: "Erro desconhecido"
                )
            }
        }
    }

    /**
     * Atualizar heartbeat da sessão
     * Implementação alternativa sem RPC
     */
    suspend fun updateSessionHeartbeat(sessionId: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                client.from("device_sessions")
                    .update(mapOf("last_heartbeat" to java.time.Instant.now().toString())) {
                        filter {
                            eq("session_id", sessionId)
                        }
                    }
                true
            } catch (e: Exception) {
                false
            }
        }
    }

    /**
     * Encerrar sessão
     */
    suspend fun endSession(
        eventId: String,
        deviceId: String,
        sessionId: String
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // Marcar sessão como inativa
                client.from("device_sessions")
                    .update(
                        mapOf(
                            "is_active" to false,
                            "ended_at" to java.time.Instant.now().toString()
                        )
                    ) {
                        filter {
                            eq("event_id", eventId)
                            eq("device_id", deviceId)
                            eq("session_id", sessionId)
                        }
                    }
                
                // Decrementar contador
                val currentData = client.from("event_devices")
                    .select {
                        filter {
                            eq("event_id", eventId)
                            eq("device_id", deviceId)
                        }
                    }
                    .decodeSingle<EventDeviceRow>()
                
                val newCount = maxOf(0, (currentData.activeSessions ?: 1) - 1)
                
                client.from("event_devices")
                    .update(
                        mapOf("active_sessions" to newCount)
                    ) {
                        filter {
                            eq("event_id", eventId)
                            eq("device_id", deviceId)
                        }
                    }
                
                true
            } catch (e: Exception) {
                false
            }
        }
    }

    /**
     * Salvar imagem no buffer
     */
    suspend fun saveImageToBuffer(entry: ImageBufferEntry): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val response = client.from("image_buffer")
                    .insert(entry) {
                        select(Columns.ALL)
                    }
                    .decodeSingle<ImageBufferRow>()
                
                Result.success(response.id)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * Atualizar last_seen do dispositivo
     */
    suspend fun updateDeviceLastSeen(deviceId: String, userAgent: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                client.from("devices")
                    .update(
                        mapOf(
                            "last_seen" to java.time.Instant.now().toString(),
                            "user_agent" to userAgent
                        )
                    ) {
                        filter {
                            eq("id", deviceId)
                        }
                    }
                true
            } catch (e: Exception) {
                false
            }
        }
    }

    @Serializable
    private data class EventDeviceRow(
        @SerialName("device_id") val deviceId: String,
        @SerialName("device_pin") val devicePin: String?,
        @SerialName("checkpoint_name") val checkpointName: String?,
        @SerialName("max_sessions") val maxSessions: Int?,
        @SerialName("active_sessions") val activeSessions: Int?
    )

    @Serializable
    private data class ImageBufferRow(
        val id: String
    )
}
