/**
 * ==========================================
 * KROMI CAPABILITY DETECTION
 * ==========================================
 * 
 * Detects device capabilities and applies classes to <body>
 * Does NOT detect device models
 * Uses feature detection and environment cues
 * 
 * Versão: 2.0
 * ========================================== */

(function() {
    'use strict';
    
    /**
     * Detect capabilities and apply feature flags to <body>
     */
    function detectCapabilities() {
        const body = document.body;
        
        // ==========================================
        // OS Detection (not model-based)
        // ==========================================
        
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);
        
        if (isIOS) {
            body.classList.add('os-ios');
        } else if (isAndroid) {
            body.classList.add('os-android');
        }
        
        // ==========================================
        // Display Mode (PWA)
        // ==========================================
        
        if (window.matchMedia('(display-mode: standalone)').matches) {
            body.classList.add('standalone');
        }
        
        // ==========================================
        // Torch/Flash Capability
        // ==========================================
        
        // Check if device has torch support
        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
            // We can only determine torch support after camera access
            // This will be updated when camera is initialized
            detectTorchCapability().then(hasTorch => {
                if (hasTorch) {
                    body.classList.add('has-torch');
                } else {
                    body.classList.add('no-torch');
                }
            });
        } else {
            body.classList.add('no-torch');
        }
        
        // ==========================================
        // Aspect Ratio
        // ==========================================
        
        function updateAspectRatio() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const aspectRatio = width / height;
            
            body.classList.remove('ar-tall', 'ar-medium', 'ar-wide');
            
            if (aspectRatio > 2.1) {
                body.classList.add('ar-tall'); // Very tall (Portrait phones)
            } else if (aspectRatio < 1.7) {
                body.classList.add('ar-wide'); // Wide screens (Tablets in landscape)
            } else {
                body.classList.add('ar-medium'); // Standard
            }
        }
        
        updateAspectRatio();
        window.addEventListener('resize', updateAspectRatio);
        window.addEventListener('orientationchange', updateAspectRatio);
        
        // ==========================================
        // Orientation
        // ==========================================
        
        function updateOrientation() {
            body.classList.remove('portrait', 'landscape');
            
            if (window.innerHeight > window.innerWidth) {
                body.classList.add('portrait');
            } else {
                body.classList.add('landscape');
            }
        }
        
        updateOrientation();
        window.addEventListener('resize', updateOrientation);
        window.addEventListener('orientationchange', function() {
            setTimeout(updateOrientation, 100); // Delay to get correct orientation
        });
        
        // ==========================================
        // Pointer Type
        // ==========================================
        
        if (window.matchMedia('(pointer: coarse)').matches) {
            body.classList.add('pointer-coarse');
        } else if (window.matchMedia('(pointer: fine)').matches) {
            body.classList.add('pointer-fine');
        }
        
        // ==========================================
        // Hover Capability
        // ==========================================
        
        if (window.matchMedia('(hover: none)').matches) {
            body.classList.add('no-hover');
        } else {
            body.classList.add('has-hover');
        }
        
        // ==========================================
        // Performance/Battery Saving Mode
        // ==========================================
        
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            body.classList.add('reduced-motion');
        }
        
        if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) {
            body.classList.add('reduced-transparency');
        }
        
        // Reduce effects on low-end devices
        if (navigator.hardwareConcurrency <= 2) {
            body.classList.add('reduced-effects');
        }
        
        // ==========================================
        // Viewport Size Classification
        // ==========================================
        
        function updateViewportSize() {
            const width = window.innerWidth;
            
            body.classList.remove('viewport-xs', 'viewport-sm', 'viewport-md', 
                                'viewport-lg', 'viewport-xl', 'viewport-xxl');
            
            if (width <= 360) {
                body.classList.add('viewport-xs');
            } else if (width <= 480) {
                body.classList.add('viewport-sm');
            } else if (width <= 768) {
                body.classList.add('viewport-md');
            } else if (width <= 1024) {
                body.classList.add('viewport-lg');
            } else if (width <= 1440) {
                body.classList.add('viewport-xl');
            } else {
                body.classList.add('viewport-xxl');
            }
        }
        
        updateViewportSize();
        window.addEventListener('resize', updateViewportSize);
        
        // ==========================================
        // Console Log (Development)
        // ==========================================
        
        console.log('📱 Kromi Capability Detection:', {
            os: body.classList.contains('os-ios') ? 'iOS' : 
                (body.classList.contains('os-android') ? 'Android' : 'Other'),
            standalone: body.classList.contains('standalone'),
            hasTorch: body.classList.contains('has-torch'),
            aspectRatio: body.classList.contains('ar-tall') ? 'tall' : 
                (body.classList.contains('ar-wide') ? 'wide' : 'medium'),
            orientation: body.classList.contains('portrait') ? 'portrait' : 'landscape',
            pointerType: body.classList.contains('pointer-coarse') ? 'coarse' : 'fine',
            hover: body.classList.contains('has-hover') ? 'yes' : 'no',
            classes: Array.from(body.classList)
        });
    }
    
    /**
     * Detect torch capability (requires camera access)
     */
    async function detectTorchCapability() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return false;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
            
            return !!capabilities.torch;
        } catch (error) {
            console.log('⚠️ Could not detect torch capability:', error.message);
            return false;
        }
    }
    
    /**
     * Update torch capability after camera stream is created
     */
    function updateTorchCapability(stream) {
        try {
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            const body = document.body;
            
            if (capabilities.torch) {
                body.classList.remove('no-torch');
                body.classList.add('has-torch');
            } else {
                body.classList.remove('has-torch');
                body.classList.add('no-torch');
            }
            
            console.log('⚡ Torch capability:', capabilities.torch ? 'available' : 'not available');
        } catch (error) {
            console.log('⚠️ Could not update torch capability:', error);
        }
    }
    
    /**
     * Log telemetry data (optional)
     */
    function logTelemetry() {
        const body = document.body;
        const telemetry = {
            timestamp: new Date().toISOString(),
            os: body.classList.contains('os-ios') ? 'ios' : 
                (body.classList.contains('os-android') ? 'android' : 'other'),
            standalone: body.classList.contains('standalone'),
            hasTorch: body.classList.contains('has-torch'),
            orientation: body.classList.contains('portrait') ? 'portrait' : 'landscape',
            aspectRatio: window.innerWidth / window.innerHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };
        
        // This could be sent to analytics
        console.log('📊 Kromi Telemetry:', telemetry);
        
        return telemetry;
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectCapabilities);
    } else {
        detectCapabilities();
    }
    
    // Expose updateTorchCapability for external use
    window.KromiCapability = {
        updateTorchCapability: updateTorchCapability,
        logTelemetry: logTelemetry
    };
})();

