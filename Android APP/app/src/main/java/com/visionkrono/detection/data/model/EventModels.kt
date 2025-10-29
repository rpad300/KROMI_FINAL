package com.visionkrono.detection.data.model

import kotlinx.serialization.Serializable

/**
 * Modelo de evento
 */
@Serializable
data class Event(
    val id: String,
    val name: String,
    val startDate: String? = null,
    val endDate: String? = null,
    val status: String? = null
)

/**
 * Modelo simplificado de evento para listagem
 */
@Serializable
data class EventListItem(
    val id: String,
    val name: String,
    val startDate: String? = null,
    val endDate: String? = null,
    val status: String? = null,
    val deviceCount: Int? = null // Número de dispositivos configurados
)

/**
 * Dispositivo disponível no evento
 */
@Serializable
data class EventDevice(
    val deviceId: String,
    val deviceName: String? = null,
    val checkpointName: String? = null,
    val checkpointOrder: Int? = null,
    val devicePin: String? = null,
    val maxSessions: Int = 1,
    val activeSessions: Int = 0
)
