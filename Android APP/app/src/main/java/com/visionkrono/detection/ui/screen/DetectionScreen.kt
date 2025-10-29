package com.visionkrono.detection.ui.screen

import android.graphics.Bitmap
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.visionkrono.detection.domain.camera.CameraService
import com.visionkrono.detection.domain.camera.CapturedImage
import com.visionkrono.detection.ui.viewmodel.DetectionViewModel

@Composable
fun DetectionScreen(
    viewModel: DetectionViewModel,
    cameraService: CameraService,
    onEndSession: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    val flashEnabled by cameraService.flashEnabled.collectAsState()
    @Suppress("UNUSED_VARIABLE")
    val isInitialized by cameraService.isInitialized.collectAsState()

    // Inicializar câmera quando previewView estiver disponível
    LaunchedEffect(previewView) {
        previewView?.let {
            cameraService.initializeCamera(it, lifecycleOwner)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Preview da câmera com captura automática
        val coroutineScope = rememberCoroutineScope()
        
        CameraPreviewWithAutoCapture(
            cameraService = cameraService,
            onImageCaptured = { capturedImage ->
                // saveImageToBuffer é suspend, precisa coroutine
                coroutineScope.launch {
                    viewModel.saveImageToBuffer(capturedImage)
                }
            },
            isDetecting = uiState.isDetecting
        )

        // Overlay com controles
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Top bar com estatísticas
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Color.Black.copy(alpha = 0.6f),
                        MaterialTheme.shapes.medium
                    )
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "📊 Detecções",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White
                    )
                    Text(
                        text = "${uiState.detectionCount}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }

                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = "🏃 Evento",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White
                    )
                    Text(
                        text = uiState.eventName ?: "Nenhum evento",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Controles laterais
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Botões laterais esquerda
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FloatingActionButton(
                        onClick = { cameraService.toggleFlash() },
                        modifier = Modifier.size(56.dp),
                        containerColor = if (flashEnabled) 
                            MaterialTheme.colorScheme.primary 
                        else 
                            MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Icon(
                            Icons.Default.FlashOn,
                            contentDescription = "Flash",
                            tint = if (flashEnabled) Color.White else Color.Black
                        )
                    }

                    FloatingActionButton(
                        onClick = { /* Switch camera */ },
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(
                            Icons.Default.Cameraswitch,
                            contentDescription = "Trocar Câmera"
                        )
                    }
                }

                // Botões centrais inferiores
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (!uiState.isDetecting) {
                        Button(
                        onClick = {
                            viewModel.startDetection()
                        },
                            modifier = Modifier
                                .width(200.dp)
                                .height(56.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Text("▶️ Iniciar Detecção", fontSize = 16.sp)
                        }
                    } else {
                        Button(
                            onClick = {
                                viewModel.stopDetection()
                            },
                            modifier = Modifier
                                .width(200.dp)
                                .height(56.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error
                            )
                        ) {
                            Text("⏹️ Parar Detecção", fontSize = 16.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedButton(
                        onClick = onEndSession,
                        modifier = Modifier
                            .width(200.dp)
                            .height(48.dp)
                    ) {
                        Text("🚪 Terminar Sessão", fontSize = 14.sp)
                    }
                }

                // Espaço direito (para alinhamento)
                Spacer(modifier = Modifier.width(56.dp))
            }
        }
    }
}
