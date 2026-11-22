/* Service worker : l'appli s'ouvre sans réseau.
   Fichiers de l'appli : servis depuis le cache, mis à jour en arrière-plan.
   Les échanges avec le script Google ne passent jamais par le cache. */
const CACHE = "paturage-v9.0.1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "data/carte.json", "Fond.png", "icon-192.png", "icon-512.png",
  "js/app.js", "js/util.js", "js/geo.js", "js/domain.js", "js/migrate.js", "js/store.js", "js/sync.js", "js/exports.js",
  "js/mapsvg.js", "js/icons.js", "js/views.js", "js/demo.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("google.com") || url.hostname.endsWith("googleusercontent.com")) return;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === "navigate" ? cache.match("index.html") : Response.error());
  }));
});
