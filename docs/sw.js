/* تحديث رقم الإصدار مع أي إصدار منشور لضمان تنشيط عامل خدمة جديد فوراً. */
const CACHE_NAME = "aqb9-static-2026-08-23-16";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/styles.css",
  "./assets/performance.css",
  "./assets/reference-ui.css",
  "./assets/files-edge-to-edge.css",
  "./assets/home-edge-cards.css",
  "./assets/touch-neutral.css",
  "./assets/access-code-sheet.css",
  "./assets/app-theme.css",
  "./assets/protection.js",
  "./assets/app.js",
  "./assets/app-theme.js",
  "./assets/aqb9-logo.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("aqb9-static-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await caches.match(request)) || (request.mode === "navigate" ? await cache.match("./index.html") : Response.error());
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
