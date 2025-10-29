package com.visionkrono.detection.domain.camera

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.CompletableDeferred
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class CapturedImage(
    val bitmap: Bitmap,
    val timestamp: Long = System.currentTimeMillis()
)

class CameraService(private val context: Context) {
    private var cameraProvider: ProcessCameraProvider? = null
    private var imageCapture: ImageCapture? = null
    private var camera: Camera? = null
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    private val _flashEnabled = MutableStateFlow(false)
    val flashEnabled: StateFlow<Boolean> = _flashEnabled

    private val _isInitialized = MutableStateFlow(false)
    val isInitialized: StateFlow<Boolean> = _isInitialized

    /**
     * Inicializar câmera
     */
    suspend fun initializeCamera(
        previewView: androidx.camera.view.PreviewView,
        lifecycleOwner: LifecycleOwner
    ): Boolean {
        return try {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            val deferred = CompletableDeferred<ProcessCameraProvider>()
            
            cameraProviderFuture.addListener({
                try {
                    val provider = cameraProviderFuture.get()
                    deferred.complete(provider)
                } catch (e: Exception) {
                    deferred.completeExceptionally(e)
                }
            }, ContextCompat.getMainExecutor(context))
            
            cameraProvider = deferred.await()

            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            cameraProvider?.unbindAll()

            camera = cameraProvider?.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageCapture
            )

            _isInitialized.value = true
            true
        } catch (e: Exception) {
            Log.e("CameraService", "Erro ao inicializar câmera", e)
            false
        }
    }

    /**
     * Capturar foto
     */
    suspend fun capturePhoto(): Result<CapturedImage> {
        val imageCapture = imageCapture ?: return Result.failure(
            IllegalStateException("Câmera não inicializada")
        )

        return try {
            val file = java.io.File(
                context.cacheDir,
                "detection_${System.currentTimeMillis()}.jpg"
            )

            val deferred = CompletableDeferred<Result<CapturedImage>>()
            
            imageCapture.takePicture(
                ImageCapture.OutputFileOptions.Builder(file).build(),
                executor,
                object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                        try {
                            val bitmap = android.graphics.BitmapFactory.decodeFile(file.absolutePath)
                            if (bitmap != null) {
                                deferred.complete(Result.success(CapturedImage(bitmap)))
                            } else {
                                deferred.complete(Result.failure(Exception("Falha ao decodificar imagem")))
                            }
                        } catch (e: Exception) {
                            deferred.complete(Result.failure(e))
                        }
                    }

                    override fun onError(exception: ImageCaptureException) {
                        deferred.complete(Result.failure(exception))
                    }
                }
            )
            
            deferred.await()
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Alternar flash
     */
    fun toggleFlash() {
        val camera = camera ?: return
        val torchState = camera.cameraInfo.torchState.value
        camera.cameraControl.enableTorch(torchState != TorchState.ON)
        _flashEnabled.value = torchState != TorchState.ON
    }

    /**
     * Alternar entre câmeras (front/back)
     * TODO: Implementar alternância real entre câmeras
     */
    suspend fun switchCamera(
        @Suppress("UNUSED_PARAMETER") previewView: androidx.camera.view.PreviewView,
        @Suppress("UNUSED_PARAMETER") lifecycleOwner: LifecycleOwner
    ): Boolean {
        // Implementar alternância entre front/back
        // Por enquanto, sempre usa back camera
        return camera != null
    }

    /**
     * Liberar recursos da câmera
     */
    fun release() {
        cameraProvider?.unbindAll()
        executor.shutdown()
        _isInitialized.value = false
    }
}

