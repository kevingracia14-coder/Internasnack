/* Interna Snack Service Worker — Offline-First PWA Support */
const CACHE_NAME = "interna-snack-core-c81699f9"; // AUTO-VERSIONED BY bundle_data.py
const RUNTIME_CACHE = "interna-snack-runtime-c81699f9"; // AUTO-VERSIONED BY bundle_data.py

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./tailwind.min.css",
  "./styles.css",
  "./gamification.js",
  "./data.js?v=c81699f9", // AUTO-VERSIONED BY bundle_data.py
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./src/core/runtime.js",
  "./src/core/app.js",
  "./src/widgets/viz-shared.js",
  "./src/widgets/tropik.js",
  "./src/widgets/kardiologi.js",
  "./src/widgets/nefrologi.js",
  "./src/widgets/pulmonologi.js",
  "./src/widgets/geh.js",
  "./src/widgets/endokrin.js",
  "./src/widgets/hom.js",
  "./src/widgets/reumatologi.js",
  "./src/widgets/geriatri.js",
  "./src/widgets/alergi.js",
  "./src/widgets/psikosomatik.js",
  "./src/widgets/registry.js"
];

const EXTERNAL_CACHE_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "unpkg.com"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isCacheableResponse(res) {
  return res && (res.ok || res.type === "opaque");
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkRes = await networkPromise;
  if (networkRes) return networkRes;

  if (request.mode === "navigate") {
    const fallback = await caches.match("./index.html");
    if (fallback) return fallback;
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // External CDN dependencies (Tailwind Play CDN, Google Fonts, PeerJS)
  if (url.origin !== self.location.origin) {
    if (EXTERNAL_CACHE_HOSTS.has(url.hostname)) {
      event.respondWith(
        cacheFirst(request, RUNTIME_CACHE).catch(() =>
          caches.match(request).then((res) => res || new Response("", { status: 504, statusText: "Offline" }))
        )
      );
    }
    return;
  }

  // Heavy data bundle & static icons: Cache-First for instant offline boot & zero wasted bandwidth
  if (url.pathname.endsWith("/data.js") || url.pathname.includes("/icons/")) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // App shell (HTML, CSS, JS, manifest): Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
});
