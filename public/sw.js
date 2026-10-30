/* ورد الحفظ — Service Worker
 * استراتيجية التخزين:
 * - قشرة التطبيق: الشبكة أولاً مع الرجوع إلى النسخة المخزنة.
 * - بيانات القرآن: من الكاش مع تحديث في الخلفية (stale-while-revalidate).
 * - ملفات البناء والأيقونات: الكاش أولاً.
 */

const VERSION = "quran-revise-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-quran`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/quran/surahs.json",
  "/quran/meta.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      await Promise.allSettled(SHELL_URLS.map((url) => shell.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.startsWith(VERSION))
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(cacheName, request, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  if (response) return response;

  return new Response(
    JSON.stringify({ error: "بيانات القرآن غير متاحة دون اتصال بعد. افتح التطبيق مرة واحدة متصلاً." }),
    {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/quran/")) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(SHELL_CACHE, request, "/offline.html"));
    return;
  }

  const destination = request.destination;
  const cacheableAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    destination === "script" ||
    destination === "style" ||
    destination === "font" ||
    destination === "image";

  if (cacheableAsset) {
    event.respondWith(cacheFirst(ASSET_CACHE, request));
  }
});
