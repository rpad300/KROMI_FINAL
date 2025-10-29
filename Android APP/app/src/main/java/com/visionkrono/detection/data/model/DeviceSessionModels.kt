package com.visionkrono.detection.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Modelo para criar sessão no banco
 */
@Serializable
data class DeviceSessionRow(
    @SerialName("session_id") val sessionId: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("started_at") val startedAt: String,
    @SerialName("last_heartbeat") val lastHeartbeat: String? = null,
    @SerialName("user_agent") val userAgent: String
)


