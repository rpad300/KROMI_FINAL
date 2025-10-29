package com.visionkrono.detection.ui.viewmodel

import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.visionkrono.detection.data.model.*
import com.visionkrono.detection.data.repository.SupabaseRepository
import com.visionkrono.detection.domain.camera.CapturedImage
import com.visionkrono.detection.domain.location.GPSPosition
import com.visionkrono.detection.domain.location.LocationService
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.UUID

data class DetectionUiState(
    val isDetecting: Boolean = false,
    val detectionCount: Int = 0,
    val eventId: String? = null,
    val deviceId: String? = null,
    val sessionId: String? = null,
    val eventName: String? = null,
    val isPinValidated: Boolean = false,
    val isSessionActive: Boolean = false,
    val error: String? = null,
    val isLoading: Boolean = false
)

class DetectionViewModel(
    private val supabaseRepository: SupabaseRepository,
    private val locationService: LocationService,
    private val supabaseUrl: String,
    private val supabaseServiceKey: String // Service Role Key
) : ViewModel() {

    private val _uiState = MutableStateFlow(DetectionUiState())
    val uiState: StateFlow<DetectionUiState> = _uiState.asStateFlow()

    private var captureJob: Job? = null
    private var heartbeatJob: Job? = null
    private var currentPosition: GPSPosition? = null

    /**
     * Iniciar a atualização da localização GPS periodicamente
     */
    fun startLocationUpdates() {
        viewModelScope.launch {
            updateLocation()
        }
    }

    private suspend fun updateLocation() {
        while (true) {
            try {
                currentPosition = locationService.getCurrentLocation()
                delay(10000) // Atualizar a cada 10 segundos
            } catch (e: Exception) {
                delay(5000)
            }
        }
    }

    /**
     * Validar PIN do dispositivo
     */
    suspend fun validatePin(eventId: String, deviceId: String, pin: String): Boolean {
        if (eventId.isEmpty() || deviceId.isEmpty()) {
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                error = "ID do evento ou do dispositivo está em falta."
            )
            return false
        }
        _uiState.value = _uiState.value.copy(isLoading = true)
        
        return try {
            val deviceInfo = supabaseRepository.getDeviceInfo(eventId, deviceId)
            
            if (deviceInfo == null || deviceInfo.devicePin != pin) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "PIN incorreto"
                )
                return false
            }

            // Verificar limite de sessões
            if (deviceInfo.activeSessions >= deviceInfo.maxSessions) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Limite de sessões atingido"
                )
                return false
            }

            // Criar sessão
            val sessionId = "session-${System.currentTimeMillis()}-${UUID.randomUUID().toString().substring(0, 9)}"
            val userAgent = "VisionKrono-Android"
            
            val sessionResponse = supabaseRepository.createDeviceSession(
                eventId = eventId,
                deviceId = deviceId,
                sessionId = sessionId,
                userAgent = userAgent
            )

            if (!sessionResponse.success) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = sessionResponse.error ?: "Erro ao criar sessão"
                )
                return false
            }

            // Atualizar last_seen
            supabaseRepository.updateDeviceLastSeen(deviceId, userAgent)

            // Iniciar heartbeat
            startHeartbeat(sessionId)

            _uiState.value = _uiState.value.copy(
                eventId = eventId,
                deviceId = deviceId,
                sessionId = sessionId,
                isPinValidated = true,
                isSessionActive = true,
                isLoading = false,
                error = null
            )

            true
        } catch (e: Exception) {
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                error = e.message ?: "Erro desconhecido"
            )
            false
        }
    }

    /**
     * Iniciar detecção
     */
    fun startDetection() {
        if (_uiState.value.isDetecting) return
        if (_uiState.value.eventId == null || _uiState.value.deviceId == null) return

        _uiState.value = _uiState.value.copy(isDetecting = true)
    }

    /**
     * Parar detecção
     */
    fun stopDetection() {
        _uiState.value = _uiState.value.copy(isDetecting = false)
        captureJob?.cancel()
    }

    /**
     * Salvar imagem capturada no buffer
     */
    suspend fun saveImageToBuffer(image: CapturedImage) {
        val state = _uiState.value
        if (state.eventId == null || state.deviceId == null || state.sessionId == null) {
            return
        }

        try {
            // Converter bitmap para base64
            val bitmap = image.bitmap
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream) // AI version 70%
            val aiVersion = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)

            outputStream.reset()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream) // Display version 90%
            val displayVersion = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)

            val now = Instant.now().toString()

            val entry = ImageBufferEntry(
                eventId = state.eventId,
                deviceId = state.deviceId,
                sessionId = state.sessionId,
                imageData = aiVersion,
                displayImage = displayVersion,
                imageMetadata = ImageMetadata(
                    width = bitmap.width,
                    height = bitmap.height,
                    deviceType = "android",
                    timestamp = now
                ),
                capturedAt = now,
                latitude = currentPosition?.latitude,
                longitude = currentPosition?.longitude,
                accuracy = currentPosition?.accuracy,
                status = "pending"
            )

            val result = supabaseRepository.saveImageToBuffer(entry)
            
            result.onSuccess {
                _uiState.value = _uiState.value.copy(
                    detectionCount = _uiState.value.detectionCount + 1
                )
            }.onFailure {
                // Erro será tratado na UI
            }
        } catch (e: Exception) {
            // Erro ao processar imagem
        }
    }

    /**
     * Iniciar heartbeat da sessão
     */
    private fun startHeartbeat(sessionId: String) {
        heartbeatJob?.cancel()
        heartbeatJob = viewModelScope.launch {
            while (true) {
                delay(30000) // A cada 30 segundos
                supabaseRepository.updateSessionHeartbeat(sessionId)
            }
        }
    }

    /**
     * Encerrar sessão
     */
    suspend fun endSession() {
        val state = _uiState.value
        if (state.eventId == null || state.deviceId == null || state.sessionId == null) {
            return
        }

        stopDetection()
        heartbeatJob?.cancel()

        supabaseRepository.endSession(
            eventId = state.eventId,
            deviceId = state.deviceId,
            sessionId = state.sessionId
        )

        _uiState.value = DetectionUiState()
    }

    /**
     * Configurar evento e dispositivo via deep link ou parâmetros
     */
    fun setupEventAndDevice(eventId: String?, deviceId: String?, eventName: String?) {
        _uiState.value = _uiState.value.copy(
            eventId = eventId,
            deviceId = deviceId,
            eventName = eventName
        )
    }

    override fun onCleared() {
        super.onCleared()
        captureJob?.cancel()
        heartbeatJob?.cancel()
    }
}
