// Campus Connect — Service Worker
// Strategy:
//  - App shell (HTML/CSS/JS/icons) -> cache-first, so the app loads instantly offline
//  - API calls (/api/*) -> network-first, NEVER cached long-term, so live data (posts,
//    stats, chat) always stays fresh. Existing data flow is untouched.
//  - Navigation requests that fail offline -> fall back to /offline.html
//  - Push notifications -> show system notification + handle click (NAYA)

const CACHE_VERSION = "campus-connect-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  // Activate the new SW immediately instead of waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("campus-connect-") && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/");
}

function isStaticAsset(request) {
  return ["style", "script", "image", "font"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept POST/PUT/DELETE (posts, likes, uploads etc.)

  const url = new URL(request.url);

  // Never cache API/socket traffic — always hit the network so data stays live.
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ offline: true }), {
        headers: { "Content-Type": "application/json" },
        status: 503,
      }))
    );
    return;
  }

  // Navigation requests (page loads) — network first, offline page fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Static assets — cache-first, then update cache in background (stale-while-revalidate).
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// Allows the app to trigger "skip waiting" from the UI (used by the update toast).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// === 🛑 NAYA: PUSH NOTIFICATION AANE PE SYSTEM NOTIFICATION DIKHANA ===
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: "Campus Connect", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Campus Connect";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// === 🛑 NAYA: NOTIFICATION PE CLICK KARNE PE APP/TAB khol dena ===
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
