/* Service worker : l'appli s'ouvre sans réseau.
   Avec réseau : les fichiers de l'appli sont pris en ligne (version la plus récente) et la copie
   locale est mise à jour ; si le réseau ne répond pas en 3 s ou est coupé : copie locale.
   Les échanges avec le script Google ne passent jamais par ici. */
const CACHE = "paturage-v9.1.0";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "data/carte.json", "Fond.png", "icon-192.png", "icon-512.png",
  "js/app.js", "js/util.js", "js/geo.js", "js/domain.js", "js/migrate.js", "js/store.js", "js/sync.js", "js/exports.js",
  "js/mapsvg.js", "js/mapgesture.js", "js/icons.js", "js/views.js", "js/demo.js"
];

self.addEventListener("install", (e) => {
  /* cache:"reload" : ne pas reprendre d'anciens fichiers dans le cache HTTP du navigateur */
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function fromNetwork(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(req, { cache: "no-cache" }).then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("google.com") || url.hostname.endsWith("googleusercontent.com")) return;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    if (isFont && hit) return hit; // polices : jamais modifiées
    try {
      const res = await fromNetwork(req, hit ? 3000 : 15000);
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    } catch (_) {
      if (hit) return hit;
      if (req.mode === "navigate") { const idx = await cache.match("index.html"); if (idx) return idx; }
      return Response.error();
    }
  })());
});
