// Service worker de FORJA: guarda toda la app para que funcione sin internet.
const VERSION = 'forja-__VERSION__';
const ARCHIVOS = __ARCHIVOS__;
/** Caché aparte para imágenes guardadas al verlas: sobrevive a las actualizaciones de la app. */
const EXTRA = 'forja-extra';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ARCHIVOS.map((url) => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION && c !== EXTRA).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(pedido, { ignoreSearch: true }).then(
      (guardada) =>
        guardada ??
        fetch(pedido).then((respuesta) => {
          // Las imágenes de ejercicios sin traducir se guardan la primera vez que se ven.
          if (respuesta.ok && new URL(pedido.url).pathname.includes('/ejercicios-extra/')) {
            const copia = respuesta.clone();
            caches.open(EXTRA).then((cache) => cache.put(pedido, copia));
          }
          return respuesta;
        }),
    ),
  );
});
