// Verificação de Stream Real
class StreamChecker {
    constructor() {
        this.checkInterval = null;
    }

    startChecking(deviceId, videoElement) {
        console.log(`🔍 Iniciando verificação de stream para ${deviceId}`);
        
        this.checkInterval = setInterval(() => {
            this.checkStream(deviceId, videoElement);
        }, 2000);
    }

    checkStream(deviceId, videoElement) {
        if (!videoElement) return;

        const hasVideo = videoElement.srcObject && 
                        videoElement.srcObject.getVideoTracks().length > 0;
        
        const isPlaying = !videoElement.paused && 
                         !videoElement.ended && 
                         videoElement.readyState > 2;

        if (hasVideo && isPlaying) {
            console.log(`✅ Stream real funcionando para ${deviceId}`);
            this.showRealStream(deviceId);
        } else {
            console.log(`⚠️ Stream não real para ${deviceId} - mostrando placeholder`);
            this.showPlaceholder(deviceId);
        }
    }

    showRealStream(deviceId) {
        const videoElement = document.getElementById(`stream-${deviceId}`);
        const placeholder = document.getElementById(`placeholder-${deviceId}`);
        
        if (videoElement) videoElement.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }

    showPlaceholder(deviceId) {
        const videoElement = document.getElementById(`stream-${deviceId}`);
        const placeholder = document.getElementById(`placeholder-${deviceId}`);
        
        if (videoElement) videoElement.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }

    stopChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Instância global
window.streamChecker = new StreamChecker();
