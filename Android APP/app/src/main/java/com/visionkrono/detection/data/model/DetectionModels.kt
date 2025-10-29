package com.visionkrono.detection.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Modelo de dados para detecção
 */
@Serializable
data class Detection(
    val id: String? = null,
    val number: Int? = null,
    val timestamp: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracy: Double? = null,
    val deviceType: String = "android",
    val sessionId: String,
    val eventId: String,
    val deviceId: String,
    val proofImage: String? = null,
    val dorsalRegion: String? = null,
    val detectionMethod: String = "AI"
)

/**
 * Modelo para entrada no buffer de imagens
 */
@Serializable
data class ImageBufferEntry(
    val id: String? = null,
    @SerialName("event_id") val eventId: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("session_id") val sessionId: String,
    @SerialName("image_data") val imageData: String, // Base64
    @SerialName("display_image") val displayImage: String? = null, // Base64
    @SerialName("image_metadata") val imageMetadata: ImageMetadata,
    @SerialName("captured_at") val capturedAt: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracy: Double? = null,
    val status: String = "pending"
)

@Serializable
data class ImageMetadata(
    val width: Int,
    val height: Int,
    @SerialName("device_type") val deviceType: String = "android",
    val timestamp: String
)

/**
 * Modelo de sessão do dispositivo
 */
@Serializable
data class DeviceSession(
    val id: String? = null,
    val sessionId: String,
    val eventId: String,
    val deviceId: String,
    val isActive: Boolean = true,
    val startedAt: String,
    val endedAt: String? = null,
    val lastHeartbeat: String? = null,
    val userAgent: String
)

/**
 * Modelo de dispositivo
 */
@Serializable
data class DeviceInfo(
    val id: String,
    val devicePin: String? = null,
    val checkpointName: String? = null,
    val maxSessions: Int = 1,
    val activeSessions: Int = 0
)

/**
 * Modelo de evento
 */
@Serializable
data class EventInfo(
    val id: String,
    val name: String
)

/**
 * Resposta da API de criação de sessão
 */
@Serializable
data class SessionResponse(
    val success: Boolean,
    val sessionId: String? = null,
    val currentActive: Int = 0,
    val maxAllowed: Int = 1,
    val error: String? = null
)

/**
 * Configuração do Supabase
 */
data class SupabaseConfig(
    val url: String,
    val anonKey: String
)
