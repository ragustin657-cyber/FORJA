// Utilidades para pruebas en un navegador real (Chromium con tamaño de iPhone).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium, devices } from 'playwright';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export async function iniciarServidor() {
  const servidor = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let archivo = normalize(join(DIST, ruta));
    if (!archivo.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    try {
      if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html');
      const cuerpo = await readFile(archivo);
      res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
      res.end(cuerpo);
    } catch {
      res.writeHead(404); res.end('no encontrado');
    }
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const { port } = servidor.address();
  return { url: `http://127.0.0.1:${port}/`, cerrar: () => new Promise((ok) => servidor.close(ok)) };
}

/** Abre la app en un iPhone simulado. Devuelve { navegador, contexto, pagina, url, cerrar }. */
export async function abrirApp({ ruta = '', conServiceWorker = false } = {}) {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: conServiceWorker ? 'allow' : 'block' });
  // En 127.0.0.1 la app no registra el service worker; con localhost sí.
  if (conServiceWorker) servidor.url = servidor.url.replace('127.0.0.1', 'localhost');
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e));
  await pagina.goto(servidor.url + ruta);
  return {
    navegador, contexto, pagina, errores, url: servidor.url,
    async cerrar() { await navegador.close(); await servidor.cerrar(); },
  };
}

/** Espera hasta que un campo tenga el valor esperado (la pantalla se actualiza un instante después del toque). */
export async function esperarValor(locator, esperado, timeout = 5000) {
  const limite = Date.now() + timeout;
  let actual;
  while (Date.now() < limite) {
    actual = await locator.inputValue();
    if (actual === esperado) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Se esperaba "${esperado}" y quedó "${actual}"`);
}
