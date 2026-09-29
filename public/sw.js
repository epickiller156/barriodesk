const CACHE_VERSION = "v1.0.1";
const CACHE_NAME = `barriodesk-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/pos",
  "/inventory",
  "/fiado",
  "/cash",
  "/purchases",
  "/reports",
  "/settings",
  "/login",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first for navigation, stale-while-revalidate for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip non-http requests
  if (!request.url.startsWith("http")) return;

  // API calls: Network first, cache for offline
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Navigation requests: Network first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // Static assets: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHES") {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      event.source.postMessage({ type: "CACHES_CLEARED" });
    });
  }
});

// Background Sync for offline sales
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-sales") {
    event.waitUntil(syncPendingSales());
  }
});

async function syncPendingSales() {
  console.log("Syncing pending sales...");
  
  // Obtener ventas pendientes del localStorage
  const pendingSales = JSON.parse(localStorage.getItem("barriodesk_pending_sales") || "[]");
  
  if (pendingSales.length === 0) {
    console.log("No hay ventas pendientes para sincronizar");
    return;
  }
  
  console.log(`Sincronizando ${pendingSales.length} ventas pendientes...`);
  
  let synced = 0;
  let failed = 0;
  const failedSales = [];
  
  for (const sale of pendingSales) {
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });
      
      if (response.ok) {
        synced++;
        console.log(`Venta ${sale.id} sincronizada correctamente`);
      } else {
        failed++;
        failedSales.push(sale);
        console.error(`Error sincronizando venta ${sale.id}:`, response.status);
      }
    } catch (error) {
      failed++;
      failedSales.push(sale);
      console.error(`Error de red sincronizando venta ${sale.id}:`, error);
    }
  }
  
  // Actualizar localStorage con las ventas que fallaron
  if (failedSales.length > 0) {
    localStorage.setItem("barriodesk_pending_sales", JSON.stringify(failedSales));
  } else {
    localStorage.removeItem("barriodesk_pending_sales");
  }
  
  console.log(`Sincronización completada: ${synced} sincronizadas, ${failed} fallidas`);
  
  // Notificar al cliente que la sincronización terminó
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: "SYNC_COMPLETE",
      synced,
      failed,
    });
  });
}

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "BarrioDesk";
  const options = {
    body: data.body || "Tienes una nueva notificación",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
