import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { iniciarServidor } from './ayuda.mjs';

/** Abre la app con una cámara simulada. `sinCamara` hace que getUserMedia falle (permiso denegado). */
export async function abrirConCamara({ ruta = '#/progreso/fotos/nueva', sinCamara = false, reloj = false } = {}) {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['camera'] });
  await contexto.addInitScript((sinCamara) => {
    window.__flujos = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      if (sinCamara) throw new DOMException('denegado', 'NotAllowedError');
      const f = await original(c);
      window.__flujos.push(f);
      return f;
    };
  }, sinCamara);
  const p = await contexto.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e));
  p.setDefaultTimeout(8000);
  if (reloj) await p.clock.install();
  await p.goto(servidor.url + ruta);
  return { p, errores, url: servidor.url, async cerrar() { await navegador.close(); await servidor.cerrar(); } };
}

export const fotosGuardadas = (p) =>
  p.evaluate(() => new Promise((ok) => {
    const r = indexedDB.open('forja');
    r.onsuccess = () => {
      const q = r.result.transaction('fotos').objectStore('fotos').getAll();
      q.onsuccess = () => { ok(q.result.map((f) => f.id).sort()); r.result.close(); };
    };
  }));

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const pose = (p, nombre) => p.getByRole('radiogroup', { name: 'Pose' }).getByRole('radio', { name: nombre });

async function sacar(p) {
  await p.getByRole('button', { name: 'Sacar foto' }).click();
  await p.getByRole('button', { name: 'Usar foto' }).click();
}

test('sacar una foto la guarda y pasa a la pose siguiente', async () => {
  const app = await abrirConCamara();
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    assert.equal(await pose(p, 'Frente').getAttribute('aria-checked'), 'true');
    await sacar(p);
    await p.waitForFunction(() => document.querySelector('[role=radio][aria-checked=true]')?.textContent === 'Perfil');
    assert.deepEqual(await fotosGuardadas(p), [`${hoy()}-frente`]);
    // en Perfil no hay foto anterior: silueta; en Frente, la foto anterior
    assert.equal(await p.getByRole('img', { name: 'Foto anterior' }).count(), 0);
    await pose(p, 'Frente').click();
    await p.getByRole('img', { name: 'Foto anterior' }).waitFor();
    await p.getByRole('button', { name: 'Ocultar guía' }).click();
    assert.equal(await p.getByRole('img', { name: 'Foto anterior' }).count(), 0);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('el temporizador de 5 s dispara a los 5 segundos', async () => {
  const app = await abrirConCamara({ reloj: true });
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    await p.getByRole('radiogroup', { name: 'Temporizador' }).getByRole('radio', { name: '5 s' }).click();
    await p.getByRole('button', { name: 'Sacar foto' }).click();
    await p.getByRole('timer').getByText('5').waitFor();
    await p.clock.runFor(4000);
    await p.getByRole('timer').getByText('1').waitFor();
    assert.equal(await p.getByRole('button', { name: 'Usar foto' }).count(), 0);
    await p.clock.runFor(1000);
    await p.getByRole('button', { name: 'Usar foto' }).waitFor();
  } finally {
    await app.cerrar();
  }
});

test('salir a mitad de la cuenta no saca la foto y apaga la cámara', async () => {
  const app = await abrirConCamara({ ruta: '#/progreso' });
  const { p } = app;
  try {
    await p.goto(app.url + '#/progreso/fotos/nueva');
    await p.locator('video').waitFor();
    await p.getByRole('radiogroup', { name: 'Temporizador' }).getByRole('radio', { name: '5 s' }).click();
    await p.getByRole('button', { name: 'Sacar foto' }).click();
    await p.getByRole('timer').waitFor();
    await p.getByRole('button', { name: 'Volver' }).click();
    await p.waitForTimeout(6000);
    assert.deepEqual(await fotosGuardadas(p), []);
    assert.equal(await p.evaluate(() => window.__flujos.length > 0 && window.__flujos.every((f) => f.getTracks().every((t) => t.readyState === 'ended'))), true);
  } finally {
    await app.cerrar();
  }
});

test('tocar la pantalla cancela la cuenta regresiva', async () => {
  const app = await abrirConCamara({ reloj: true });
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    await p.getByRole('radiogroup', { name: 'Temporizador' }).getByRole('radio', { name: '5 s' }).click();
    await p.getByRole('button', { name: 'Sacar foto' }).click();
    await p.getByRole('timer').click();
    await p.clock.runFor(6000);
    assert.equal(await p.getByRole('timer').count(), 0);
    assert.equal(await p.getByRole('button', { name: 'Usar foto' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('repetir la misma pose el mismo día pide confirmar y reemplaza', async () => {
  const app = await abrirConCamara();
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    await sacar(p);
    await pose(p, 'Frente').click();
    await sacar(p);
    const dialogo = p.getByRole('dialog', { name: /¿Reemplazarla\?/ });
    await dialogo.getByText(/Ya hay una foto de frente/).waitFor();
    await dialogo.getByRole('button', { name: 'Reemplazar' }).click();
    await dialogo.waitFor({ state: 'detached' });
    assert.deepEqual(await fotosGuardadas(p), [`${hoy()}-frente`]);
    const imagenes = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const q = r.result.transaction('imagenes').objectStore('imagenes').count(); q.onsuccess = () => ok(q.result); }; }));
    assert.equal(imagenes, 1);
  } finally {
    await app.cerrar();
  }
});

test('elegir de la galería guarda la foto en la fecha elegida', async () => {
  const app = await abrirConCamara();
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    const bytes = await p.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 300; c.height = 400;
      c.getContext('2d').fillRect(0, 0, 50, 50);
      const b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
      return [...new Uint8Array(await b.arrayBuffer())];
    });
    await p.getByLabel('Fecha').fill('2026-10-01');
    await p.locator('input[type=file]').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(bytes) });
    await p.getByRole('button', { name: 'Usar foto' }).click();
    await p.waitForFunction(() => document.querySelector('[role=radio][aria-checked=true]')?.textContent === 'Perfil');
    assert.deepEqual(await fotosGuardadas(p), ['2026-10-01-frente']);
  } finally {
    await app.cerrar();
  }
});

test('sin permiso de cámara avisa y deja elegir de la galería', async () => {
  const app = await abrirConCamara({ sinCamara: true });
  const { p } = app;
  try {
    await p.getByText(/No pudimos usar la cámara/).waitFor();
    await p.getByText('Elegir de la galería').waitFor();
    assert.equal(await p.getByRole('button', { name: 'Sacar foto' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('si la app pasa a segundo plano durante la cuenta, se cancela', async () => {
  const app = await abrirConCamara({ reloj: true });
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    await p.getByRole('radiogroup', { name: 'Temporizador' }).getByRole('radio', { name: '10 s' }).click();
    await p.getByRole('button', { name: 'Sacar foto' }).click();
    await p.getByRole('timer').waitFor();
    assert.equal(await p.getByRole('button', { name: 'Cambiar cámara' }).count(), 0);
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.getByRole('timer').waitFor({ state: 'detached' });
    await p.clock.runFor(11000);
    assert.equal(await p.getByRole('button', { name: 'Usar foto' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('una foto con fecha futura no se guarda', async () => {
  const app = await abrirConCamara();
  const { p } = app;
  try {
    await p.getByRole('button', { name: 'Sacar foto' }).click();
    await p.getByLabel('Fecha').fill('2099-01-01');
    await p.getByRole('button', { name: 'Usar foto' }).click();
    await p.getByText('Elegí una fecha de hoy o anterior.').waitFor();
    assert.deepEqual(await fotosGuardadas(p), []);
  } finally {
    await app.cerrar();
  }
});

test('si el navegador no acepta la orientación EXIF, la galería usa otro camino', async () => {
  const app = await abrirConCamara();
  const { p } = app;
  try {
    await p.locator('video').waitFor();
    await p.evaluate(() => {
      const original = window.createImageBitmap;
      window.createImageBitmap = (fuente, ...resto) => {
        if (fuente instanceof Blob) return Promise.reject(new TypeError('opción no soportada'));
        return original(fuente, ...resto);
      };
    });
    const bytes = await p.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 300; c.height = 400;
      c.getContext('2d').fillRect(0, 0, 50, 50);
      const b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
      return [...new Uint8Array(await b.arrayBuffer())];
    });
    await p.locator('input[type=file]').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(bytes) });
    await p.getByRole('button', { name: 'Usar foto' }).click();
    await p.waitForFunction(() => document.querySelector('[role=radio][aria-checked=true]')?.textContent === 'Perfil');
    assert.equal((await fotosGuardadas(p)).length, 1);
  } finally {
    await app.cerrar();
  }
});
