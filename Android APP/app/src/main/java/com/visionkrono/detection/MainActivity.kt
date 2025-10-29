package com.visionkrono.detection

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Alignment
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.visionkrono.detection.data.repository.EventRepository
import com.visionkrono.detection.data.repository.SupabaseRepository
import com.visionkrono.detection.domain.camera.CameraService
import com.visionkrono.detection.domain.location.LocationService
import com.visionkrono.detection.ui.screen.DetectionScreen
import com.visionkrono.detection.ui.screen.EventsListScreen
import com.visionkrono.detection.ui.screen.PinScreen
import com.visionkrono.detection.ui.theme.VisionKronoDetectionTheme
import com.visionkrono.detection.ui.viewmodel.DetectionViewModel
import com.visionkrono.detection.ui.viewmodel.DetectionViewModelFactory
import com.visionkrono.detection.ui.viewmodel.EventsViewModel
import com.visionkrono.detection.ui.viewmodel.EventsViewModelFactory

class MainActivity : ComponentActivity() {
    
    // Configuração do Supabase - usando Service Role Key para acesso completo
    private val supabaseUrl = "https://mdrvgbztadnluhrrnlob.supabase.co" // TODO: Configurar
    private val supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcnZnYnp0YWRubHVocnJubG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NDUwNSwiZXhwIjoyMDc2NTcwNTA1fQ.EJrsvG_qaAMPjrjdOV5tFlH4-KzCbctGzbwcLLYlvLo" // TODO: Configurar (Service Role)
    
    // Android ID para identificação automática do dispositivo
    private val androidId = android.provider.Settings.Secure.getString(
        contentResolver,
        android.provider.Settings.Secure.ANDROID_ID
    )
    
    private val eventRepository by lazy {
        EventRepository(supabaseUrl, supabaseServiceKey)
    }
    
    private val supabaseRepository by lazy {
        SupabaseRepository(supabaseUrl, supabaseServiceKey) // Usando Service Role
    }
    
    private val locationService by lazy {
        LocationService(this)
    }
    
    private val cameraService by lazy {
        CameraService(this)
    }
    
    private val eventsViewModelFactory: EventsViewModelFactory by lazy {
        EventsViewModelFactory(eventRepository)
    }
    
    private val eventsViewModel: EventsViewModel by viewModels {
        eventsViewModelFactory
    }
    
    private val detectionViewModelFactory: DetectionViewModelFactory by lazy {
        DetectionViewModelFactory(
            supabaseRepository,
            locationService,
            supabaseUrl,
            supabaseServiceKey
        )
    }
    
    private val detectionViewModel: DetectionViewModel by viewModels {
        detectionViewModelFactory
    }

    @OptIn(ExperimentalPermissionsApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Processar deep link ou parâmetros
        processIntent(intent)
        
        setContent {
            VisionKronoDetectionTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val eventsUiState by eventsViewModel.uiState.collectAsStateWithLifecycle()
                    val detectionUiState by detectionViewModel.uiState.collectAsStateWithLifecycle()
                    
                    // Solicitar permissões (apenas quando necessário)
                    val permissionsState = rememberMultiplePermissionsState(
                        permissions = listOf(
                            Manifest.permission.CAMERA,
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                    
                    // Navegação baseada no estado
                    when {
                        // 1. Lista de eventos
                        eventsUiState.selectedEventId == null -> {
                            EventsListScreen(
                                events = eventsUiState.events,
                                isLoading = eventsUiState.isLoading,
                                onEventSelected = { eventId, eventName ->
                                    // Selecionar evento e buscar dispositivo automaticamente
                                    eventsViewModel.selectEvent(eventId, eventName, androidId)
                                },
                                onRefresh = {
                                    eventsViewModel.loadEvents()
                                }
                            )
                        }
                        
                        // 2. Buscando dispositivo
                        eventsUiState.isLoadingDevices -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    CircularProgressIndicator()
                                    Text("Identificando dispositivo...")
                                }
                            }
                        }
                        
                        // 3. PIN Screen (dispositivo identificado)
                        eventsUiState.selectedDevice != null && !detectionUiState.isPinValidated -> {
                            // Solicitar permissões se necessário e iniciar serviços
                            LaunchedEffect(permissionsState) {
                                if (!permissionsState.allPermissionsGranted) {
                                    permissionsState.launchMultiplePermissionRequest()
                                } else {
                                    detectionViewModel.startLocationUpdates()
                                }
                            }
                            
                            PinScreen(
                                eventId = eventsUiState.selectedEventId,
                                deviceId = eventsUiState.selectedDevice!!.deviceId,
                                onPinValidated = { isValid ->
                                    if (!isValid) {
                                        eventsViewModel.resetSelection()
                                    }
                                },
                                onValidatePin = { pin ->
                                    detectionViewModel.setupEventAndDevice(
                                        eventsUiState.selectedEventId,
                                        eventsUiState.selectedDevice!!.deviceId,
                                        eventsUiState.selectedEventName
                                    )
                                    detectionViewModel.validatePin(
                                        eventsUiState.selectedEventId!!,
                                        eventsUiState.selectedDevice!!.deviceId,
                                        pin
                                    )
                                }
                            )
                        }
                        
                        // 4. Detecção ativa
                        detectionUiState.isPinValidated && detectionUiState.isSessionActive -> {
                            DetectionScreen(
                                viewModel = detectionViewModel,
                                cameraService = cameraService,
                                onEndSession = {
                                    // endSession é suspend, precisa coroutine
                                    lifecycleScope.launch {
                                        detectionViewModel.endSession()
                                        eventsViewModel.resetSelection()
                                    }
                                }
                            )
                        }
                        
                        // 5. Erro
                        eventsUiState.error != null && eventsUiState.selectedDevice == null -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(16.dp),
                                    modifier = Modifier.padding(24.dp)
                                ) {
                                    Text(
                                        text = "❌",
                                        fontSize = 64.sp
                                    )
                                    Text(
                                        text = eventsUiState.error!!,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                    Button(onClick = { eventsViewModel.resetSelection() }) {
                                        Text("Voltar")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    private fun processIntent(intent: Intent?) {
        when {
            intent?.data != null -> {
                // Deep link: visionkrono://detection?event=X&device=Y
                val uri: Uri = intent.data!!
                val eventId = uri.getQueryParameter("event")
                val deviceId = uri.getQueryParameter("device")
                val eventName = uri.getQueryParameter("eventName")
                
                detectionViewModel.setupEventAndDevice(eventId, deviceId, eventName)
            }
            
            intent?.extras != null -> {
                // Parâmetros extras
                val eventId = intent.getStringExtra("event")
                val deviceId = intent.getStringExtra("device")
                val eventName = intent.getStringExtra("eventName")
                
                detectionViewModel.setupEventAndDevice(eventId, deviceId, eventName)
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        processIntent(intent)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        cameraService.release()
        // endSession é suspend, então precisa ser chamado em coroutine
        lifecycleScope.launch {
            detectionViewModel.endSession()
        }
    }
}
