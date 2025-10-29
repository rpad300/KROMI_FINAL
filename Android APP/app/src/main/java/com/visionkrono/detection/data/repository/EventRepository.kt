package com.visionkrono.detection.data.repository

import com.visionkrono.detection.data.model.*
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

class EventRepository(
    private val supabaseUrl: String,
    private val supabaseServiceKey: String // Usando Service Role Key
) {
    private val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = supabaseUrl,
        supabaseKey = supabaseServiceKey
    ) {
        install(Postgrest)
    }

    /**
     * Listar todos os eventos disponíveis
     */
    suspend fun listEvents(): Result<List<EventListItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val events = client.from("events")
                    .select {
                        // Buscar apenas eventos ativos ou futuros
                        // Você pode adicionar filtros aqui se necessário
                    }
                    .decodeList<EventRow>()

                // Para cada evento, buscar número de dispositivos
                val eventsWithCount = events.map { event ->
                    val deviceCount = try {
                        client.from("event_devices")
                            .select {
                                filter {
                                    eq("event_id", event.id)
                                }
                            }
                            .decodeList<EventDeviceRow>()
                            .size
                    } catch (e: Exception) {
                        0
                    }

                    EventListItem(
                        id = event.id,
                        name = event.name,
                        startDate = event.startDate,
                        endDate = event.endDate,
                        status = event.status,
                        deviceCount = deviceCount
                    )
                }

                Result.success(eventsWithCount)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * Buscar dispositivos disponíveis para um evento
     */
    suspend fun getEventDevices(eventId: String): Result<List<EventDevice>> {
        return withContext(Dispatchers.IO) {
            try {
                val devices = client.from("event_devices")
                    .select {
                        filter {
                            eq("event_id", eventId)
                        }
                    }
                    .decodeList<EventDeviceRow>()
                    .sortedBy { it.checkpointOrder ?: Int.MAX_VALUE }

                val eventDevices = devices.map { device ->
                    EventDevice(
                        deviceId = device.deviceId,
                        deviceName = device.deviceName,
                        checkpointName = device.checkpointName,
                        checkpointOrder = device.checkpointOrder,
                        devicePin = device.devicePin,
                        maxSessions = device.maxSessions ?: 1,
                        activeSessions = device.activeSessions ?: 0
                    )
                }

                Result.success(eventDevices)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * Identificar dispositivo automático (primeiro disponível ou pelo Android ID)
     */
    suspend fun getDeviceForEvent(
        eventId: String,
        @Suppress("UNUSED_PARAMETER") androidId: String? = null
    ): Result<EventDevice?> {
        return withContext(Dispatchers.IO) {
            try {
                val devices = client.from("event_devices")
                    .select {
                        filter {
                            eq("event_id", eventId)
                        }
                    }
                    .decodeList<EventDeviceRow>()
                    .sortedBy { it.checkpointOrder ?: Int.MAX_VALUE }
                    .take(1)

                if (devices.isNotEmpty()) {
                    val device = devices[0]
                    Result.success(
                        EventDevice(
                            deviceId = device.deviceId,
                            deviceName = device.deviceName,
                            checkpointName = device.checkpointName,
                            checkpointOrder = device.checkpointOrder,
                            devicePin = device.devicePin,
                            maxSessions = device.maxSessions ?: 1,
                            activeSessions = device.activeSessions ?: 0
                        )
                    )
                } else {
                    Result.success(null)
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    @Serializable
    private data class EventRow(
        val id: String,
        val name: String,
        @SerialName("start_date") val startDate: String? = null,
        @SerialName("end_date") val endDate: String? = null,
        val status: String? = null
    )

    @Serializable
    private data class EventDeviceRow(
        @SerialName("device_id") val deviceId: String,
        @SerialName("device_name") val deviceName: String? = null,
        @SerialName("checkpoint_name") val checkpointName: String? = null,
        @SerialName("checkpoint_order") val checkpointOrder: Int? = null,
        @SerialName("device_pin") val devicePin: String? = null,
        @SerialName("max_sessions") val maxSessions: Int? = null,
        @SerialName("active_sessions") val activeSessions: Int? = null
    )
}
