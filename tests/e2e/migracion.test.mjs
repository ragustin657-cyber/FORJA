import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { iniciarServidor } from './ayuda.mjs';

test('al actualizar la base de datos se conservan las rutinas de la versión anterior', async () => {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    const p = await contexto.newPage();
    await p.goto(servidor.url + 'manifest.webmanifest');
    await p.evaluate(
      () =>
        new Promise((ok, mal) => {
          const pedido = indexedDB.open('forja', 1);
          pedido.onupgradeneeded = () => {
            for (const t of ['ejercicios', 'rutinas', 'sesiones', 'ajustes']) pedido.result.createObjectStore(t, { keyPath: 'id' });
          };
          pedido.onsuccess = () => {
            const tx = pedido.result.transaction('rutinas', 'readwrite');
            tx.objectStore('rutinas').put({ id: 'r1', nombre: 'Mi rutina vieja', origen: 'manual', archivado: false, creada: 1, dias: [] });
            tx.oncomplete = () => {
              pedido.result.close();
              ok();
            };
          };
          pedido.onerror = () => mal(pedido.error);
        }),
    );
    await p.goto(servidor.url + '#/entrenar');
    await p.getByRole('article', { name: 'Mi rutina vieja' }).waitFor({ timeout: 8000 });
    const version = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('forja'); r.onsuccess = () => { ok(r.result.version); r.result.close(); }; }));
    assert.equal(version, 2);
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});
