import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

test('una vez abierta, la app funciona sin internet con la biblioteca y sus imágenes', async () => {
  const app = await abrirApp({ conServiceWorker: true });
  const p = app.pagina;
  try {
    await p.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await new Promise((ok) => (reg.active.state === 'activated' ? ok() : reg.active.addEventListener('statechange', ok)));
    });
    await p.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length > 100);
    await app.contexto.setOffline(true);
    await p.goto(app.url + '#/mas/biblioteca/Barbell_Squat');
    await p.getByRole('heading', { name: 'Sentadilla con barra' }).waitFor({ timeout: 5000 });
    await p.waitForFunction(() => [...document.querySelectorAll('img')].length > 0 && [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});
