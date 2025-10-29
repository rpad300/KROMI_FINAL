package com.visionkrono.detection.ui.screen

import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import com.visionkrono.detection.domain.camera.CameraService

/**
 * Composable para preview da câmera com captura automática
 */
@Composable
fun CameraPreviewWithAutoCapture(
    cameraService: CameraService,
    onImageCaptured: (com.visionkrono.detection.domain.camera.CapturedImage) -> Unit,
    isDetecting: Boolean
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    val isInitialized by cameraService.isInitialized.collectAsState()

    // Inicializar câmera
    LaunchedEffect(previewView) {
        previewView?.let {
            cameraService.initializeCamera(it, lifecycleOwner)
        }
    }

    // Captura automática quando detecção está ativa
    LaunchedEffect(isDetecting, isInitialized) {
        if (isDetecting && isInitialized) {
            while (isDetecting) {
                kotlinx.coroutines.delay(2000) // A cada 2 segundos
                
                val result = cameraService.capturePhoto()
                result.onSuccess { capturedImage ->
                    onImageCaptured(capturedImage)
                }
            }
        }
    }

    AndroidView(
        factory = { context ->
            PreviewView(context).also { previewView = it }
        },
        modifier = Modifier.fillMaxSize()
    )
}
