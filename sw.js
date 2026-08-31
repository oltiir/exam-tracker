/* UBT Exam Tracker — simple offline cache */
const CACHE = "exam-tracker-v16";
const ASSETS = [
  "./", "./index.html", "./app.css", "./app.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"
];
/* Google Fonts responses get cached too, so type works offline after first visit */
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          const url = new URL(e.request.url);
          const cacheable = res && (
            (res.ok && url.origin === location.origin) ||
            (FONT_HOSTS.includes(url.hostname) && (res.ok || res.type === "opaque"))
          );
          if (cacheable) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
