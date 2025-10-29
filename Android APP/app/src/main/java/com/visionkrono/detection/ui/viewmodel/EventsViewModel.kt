package com.visionkrono.detection.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.visionkrono.detection.data.model.EventListItem
import com.visionkrono.detection.data.model.EventDevice
import com.visionkrono.detection.data.repository.EventRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class EventsUiState(
    val events: List<EventListItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedEventId: String? = null,
    val selectedEventName: String? = null,
    val selectedDevice: EventDevice? = null,
    val isLoadingDevices: Boolean = false
)

class EventsViewModel(
    private val eventRepository: EventRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EventsUiState())
    val uiState: StateFlow<EventsUiState> = _uiState.asStateFlow()

    init {
        loadEvents()
    }

    /**
     * Carregar lista de eventos
     */
    fun loadEvents() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            eventRepository.listEvents()
                .onSuccess { events ->
                    _uiState.value = _uiState.value.copy(
                        events = events,
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Erro ao carregar eventos"
                    )
                }
        }
    }

    /**
     * Selecionar evento e buscar dispositivo automático
     */
    fun selectEvent(eventId: String, eventName: String, androidId: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                selectedEventId = eventId,
                selectedEventName = eventName,
                isLoadingDevices = true
            )

            // Buscar dispositivo automático
            eventRepository.getDeviceForEvent(eventId, androidId)
                .onSuccess { device ->
                    _uiState.value = _uiState.value.copy(
                        selectedDevice = device,
                        isLoadingDevices = false,
                        error = if (device == null) "Nenhum dispositivo encontrado para este evento" else null
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingDevices = false,
                        error = error.message ?: "Erro ao buscar dispositivo"
                    )
                }
        }
    }

    /**
     * Buscar lista completa de dispositivos do evento
     */
    fun loadEventDevices(eventId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingDevices = true)
            
            eventRepository.getEventDevices(eventId)
                .onSuccess { devices ->
                    // Se há apenas um dispositivo, selecionar automaticamente
                    if (devices.size == 1) {
                        _uiState.value = _uiState.value.copy(
                            selectedDevice = devices[0],
                            isLoadingDevices = false
                        )
                    } else {
                        // Se há múltiplos, mostrar lista para seleção
                        // Por enquanto, pegar o primeiro
                        _uiState.value = _uiState.value.copy(
                            selectedDevice = devices.firstOrNull(),
                            isLoadingDevices = false,
                            error = if (devices.isEmpty()) "Nenhum dispositivo encontrado" else null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingDevices = false,
                        error = error.message ?: "Erro ao carregar dispositivos"
                    )
                }
        }
    }

    /**
     * Resetar seleção
     */
    fun resetSelection() {
        _uiState.value = EventsUiState(events = _uiState.value.events)
    }
}
