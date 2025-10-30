/**
 * Kromi.online Service Worker
 * PWA offline support e cache management
 */

const CACHE_NAME = 'visionkrono-v1';
const urlsToCache = [
  '/',
  '/index-kromi.html',
  '/events-pwa.html',
  '/detection-kromi.html',
  '/calibration-kromi.html',
  '/classifications-kromi.html',
  '/participants-kromi.html',
  '/image-processor-kromi.html',
  '/database-management-kromi.html',
  '/kromi-design-system.css',
  '/navigation.js',
  '/supabase.js',
  '/livestream-viewer.js',
  '/livestream-client.js',
  '/livestream-viewer.js',
  '/gemini-queue.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalado');
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Ativado');
      return self.clients.claim();
    })
  );
});

// Estratégia de cache: Network First para dados dinâmicos, Cache First para assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorar requests para Socket.IO
  if (url.pathname.startsWith('/socket.io/')) {
    return;
  }
  
  // Ignorar requests para APIs externas
  if (!url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Network First para API e dados dinâmicos
  if (url.pathname.startsWith('/api/') || url.search.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache First para assets estáticos
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Só cachear respostas válidas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

