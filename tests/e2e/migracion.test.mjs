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
    assert.equal(version, 6);
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});

test('al pasar de la versión 2 a la 3 se conservan el perfil y las rutinas, y aparecen las tablas nuevas', async () => {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    const p = await contexto.newPage();
    await p.goto(servidor.url + 'manifest.webmanifest');
    await p.evaluate(
      () =>
        new Promise((ok, mal) => {
          const pedido = indexedDB.open('forja', 2);
          pedido.onupgradeneeded = () => {
            for (const t of ['ejercicios', 'rutinas', 'sesiones', 'ajustes', 'perfil', 'pesos', 'menus', 'compras']) pedido.result.createObjectStore(t, { keyPath: 'id' });
          };
          pedido.onsuccess = () => {
            const tx = pedido.result.transaction(['rutinas', 'perfil', 'pesos'], 'readwrite');
            tx.objectStore('rutinas').put({ id: 'r1', nombre: 'Rutina de la v2', origen: 'manual', archivado: false, creada: 1, dias: [] });
            tx.objectStore('perfil').put({ id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado', objetivo: 'bajar', comidas: 4, noComoGrupos: [], noComoTexto: [] });
            tx.objectStore('pesos').put({ id: '2026-10-20', fecha: Date.now(), kg: 80 });
            tx.oncomplete = () => {
              pedido.result.close();
              ok();
            };
          };
          pedido.onerror = () => mal(pedido.error);
        }),
    );
    await p.goto(servidor.url + '#/entrenar');
    await p.getByRole('article', { name: 'Rutina de la v2' }).waitFor({ timeout: 8000 });
    await p.goto(servidor.url + '#/nutricion');
    await p.getByText('2.210').first().waitFor({ timeout: 8000 });
    const info = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('forja'); r.onsuccess = () => { ok({ v: r.result.version, tablas: [...r.result.objectStoreNames] }); r.result.close(); }; }));
    assert.equal(info.v, 6);
    assert.ok(info.tablas.includes('registros') && info.tablas.includes('productos'));
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});

test('al pasar de la versión 3 a la 4 se conservan los datos y aparecen las tablas de cuerpo', async () => {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    const p = await contexto.newPage();
    await p.goto(servidor.url + 'manifest.webmanifest');
    await p.evaluate(
      () =>
        new Promise((ok, mal) => {
          const pedido = indexedDB.open('forja', 3);
          pedido.onupgradeneeded = () => {
            for (const t of ['ejercicios', 'rutinas', 'sesiones', 'ajustes', 'perfil', 'pesos', 'menus', 'compras', 'registros', 'productos']) pedido.result.createObjectStore(t, { keyPath: 'id' });
          };
          pedido.onsuccess = () => {
            const tx = pedido.result.transaction(['rutinas', 'perfil', 'pesos', 'registros'], 'readwrite');
            tx.objectStore('rutinas').put({ id: 'r1', nombre: 'Rutina de la v3', origen: 'manual', archivado: false, creada: 1, dias: [] });
            tx.objectStore('perfil').put({ id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado', objetivo: 'bajar', comidas: 4, noComoGrupos: [], noComoTexto: [] });
            tx.objectStore('pesos').put({ id: '2026-10-20', fecha: Date.now(), kg: 80 });
            const d = new Date();
            const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            tx.objectStore('registros').put({ id: 'x', fecha: hoy, tipo: 'cena', origen: 'alimento', refId: 'arroz', cantidad: 100, nombre: 'Arroz de la v3', macros: { kcal: 350, proteina: 7, grasas: 1, carbos: 80 }, creado: 1 });
            tx.oncomplete = () => {
              pedido.result.close();
              ok();
            };
          };
          pedido.onerror = () => mal(pedido.error);
        }),
    );
    await p.goto(servidor.url + '#/entrenar');
    await p.getByRole('article', { name: 'Rutina de la v3' }).waitFor({ timeout: 8000 });
    await p.goto(servidor.url + '#/nutricion/hoy');
    await p.getByText('Arroz de la v3').waitFor({ timeout: 8000 });
    const info = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('forja'); r.onsuccess = () => { ok({ v: r.result.version, tablas: [...r.result.objectStoreNames] }); r.result.close(); }; }));
    assert.equal(info.v, 6);
    for (const t of ['medidas', 'fotos', 'imagenes']) assert.ok(info.tablas.includes(t), t);
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});

test('al pasar de la versión 4 a la 5 se conservan medidas y fotos, y aparece la tabla de metas', async () => {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    const p = await contexto.newPage();
    await p.goto(servidor.url + 'manifest.webmanifest');
    await p.evaluate(
      () =>
        new Promise((ok, mal) => {
          const pedido = indexedDB.open('forja', 4);
          pedido.onupgradeneeded = () => {
            for (const t of ['ejercicios', 'rutinas', 'sesiones', 'ajustes', 'perfil', 'pesos', 'menus', 'compras', 'registros', 'productos', 'medidas', 'fotos', 'imagenes']) pedido.result.createObjectStore(t, { keyPath: 'id' });
          };
          pedido.onsuccess = () => {
            const tx = pedido.result.transaction(['medidas', 'fotos', 'imagenes'], 'readwrite');
            tx.objectStore('medidas').put({ id: '2026-10-20', fecha: Date.now() - 86400000, brazo: 36 });
            tx.objectStore('fotos').put({ id: '2026-10-20-frente', fecha: '2026-10-20', pose: 'frente', creado: 1 });
            tx.objectStore('imagenes').put({ id: '2026-10-20-frente', imagen: new Blob(['x'], { type: 'image/jpeg' }), miniatura: new Blob(['x'], { type: 'image/jpeg' }) });
            tx.oncomplete = () => { pedido.result.close(); ok(); };
          };
          pedido.onerror = () => mal(pedido.error);
        }),
    );
    await p.goto(servidor.url + '#/progreso');
    await p.getByText('Brazo 36 cm').waitFor({ timeout: 8000 });
    await p.getByRole('link', { name: 'Fotos del 20/10/2026' }).waitFor({ timeout: 8000 });
    const info = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('forja'); r.onsuccess = () => { ok({ v: r.result.version, tablas: [...r.result.objectStoreNames] }); r.result.close(); }; }));
    assert.equal(info.v, 6);
    assert.ok(info.tablas.includes('metas'));
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});

test('al pasar de la versión 5 a la 6 se conservan las metas y aparece la tabla de planes', async () => {
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    const p = await contexto.newPage();
    await p.goto(servidor.url + 'manifest.webmanifest');
    await p.evaluate(
      () =>
        new Promise((ok, mal) => {
          const pedido = indexedDB.open('forja', 5);
          pedido.onupgradeneeded = () => {
            for (const t of ['ejercicios', 'rutinas', 'sesiones', 'ajustes', 'perfil', 'pesos', 'menus', 'compras', 'registros', 'productos', 'medidas', 'fotos', 'imagenes', 'metas']) pedido.result.createObjectStore(t, { keyPath: 'id' });
          };
          pedido.onsuccess = () => {
            const tx = pedido.result.transaction(['metas', 'rutinas'], 'readwrite');
            tx.objectStore('rutinas').put({ id: 'r1', nombre: 'Rutina de la v5', origen: 'manual', archivado: false, creada: 1, dias: [] });
            tx.objectStore('metas').put({ id: 'Barbell_Squat', peso: 140, reps: 1, creada: 1 });
            tx.oncomplete = () => { pedido.result.close(); ok(); };
          };
          pedido.onerror = () => mal(pedido.error);
        }),
    );
    await p.goto(servidor.url + '#/entrenar');
    await p.getByRole('article', { name: 'Rutina de la v5' }).waitFor({ timeout: 8000 });
    const info = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const db = r.result; const q = db.transaction('metas').objectStore('metas').count(); q.onsuccess = () => { ok({ v: db.version, tablas: [...db.objectStoreNames], metas: q.result }); db.close(); }; }; }));
    assert.equal(info.v, 6);
    assert.ok(info.tablas.includes('planes'));
    assert.equal(info.metas, 1);
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});
