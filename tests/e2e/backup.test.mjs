import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

test('exportar copia descarga un .zip con la fecha', async () => {
  const app = await abrirApp({ ruta: '#/mas/backup' });
  try {
    const descarga = app.pagina.waitForEvent('download');
    await app.pagina.getByRole('button', { name: 'Exportar copia' }).click();
    const d = await descarga;
    assert.match(d.suggestedFilename(), /^forja-\d{4}-\d{2}-\d{2}\.zip$/);
    await app.pagina.getByText(/Última copia: hoy/).waitFor({ timeout: 5000 });
  } finally {
    await app.cerrar();
  }
});

test('restaurar un archivo dañado muestra el error y no pide confirmar', async () => {
  const app = await abrirApp({ ruta: '#/mas/backup' });
  try {
    await app.pagina.locator('input[type=file]').setInputFiles({ name: 'x.zip', mimeType: 'application/zip', buffer: Buffer.from('basura') });
    await app.pagina.getByText('El archivo está dañado.').waitFor({ timeout: 5000 });
    assert.equal(await app.pagina.getByRole('button', { name: 'Restaurar copia' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('restaurar una copia válida muestra el resumen y pide confirmación', async () => {
  const app = await abrirApp({ ruta: '#/mas/backup' });
  try {
    const descarga = app.pagina.waitForEvent('download');
    await app.pagina.getByRole('button', { name: 'Exportar copia' }).click();
    const ruta = await (await descarga).path();
    await app.pagina.locator('input[type=file]').setInputFiles(ruta);
    await app.pagina.getByText(/0 entrenamientos/).waitFor({ timeout: 5000 });
    await app.pagina.getByText(/reemplaza todos tus datos actuales/).waitFor();
    await app.pagina.getByRole('button', { name: 'Restaurar copia' }).click();
    await app.pagina.getByText('¡Listo! Tus datos se restauraron.').waitFor({ timeout: 5000 });
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

/** Guarda una foto de prueba directo en IndexedDB (la app ya abrió la base). */
async function fotoDePrueba(p, id) {
  await p.evaluate(
    (id) =>
      new Promise((ok) => {
        const r = indexedDB.open('forja');
        r.onsuccess = () => {
          const tx = r.result.transaction(['fotos', 'imagenes'], 'readwrite');
          const jpg = new Blob([new Uint8Array(150_000)], { type: 'image/jpeg' });
          tx.objectStore('imagenes').put({ id, imagen: jpg, miniatura: new Blob([new Uint8Array(10_000)], { type: 'image/jpeg' }) });
          tx.objectStore('fotos').put({ id, fecha: id.slice(0, 10), pose: 'frente', creado: 1 });
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      }),
    id,
  );
}

test('con fotos, exportar pregunta si incluirlas y la copia las trae', async () => {
  const app = await abrirApp({ ruta: '#/mas/backup' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await p.getByRole('button', { name: 'Exportar copia' }).waitFor();
    await fotoDePrueba(p, '2026-10-13-frente');
    await p.reload();
    await p.getByRole('button', { name: 'Exportar copia' }).click();
    const pregunta = p.getByRole('region', { name: '¿Incluir fotos?' });
    await pregunta.getByText(/Tenés 1 foto de progreso \(≈ 0,2 MB\)/).waitFor();
    const descarga = p.waitForEvent('download');
    await pregunta.getByRole('button', { name: /Con fotos/ }).click();
    const ruta = await (await descarga).path();
    await p.locator('input[type=file]').setInputFiles(ruta);
    await p.getByText(/1 foto\b/).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('restaurar una copia sin fotos avisa que se conservan las del iPhone', async () => {
  const app = await abrirApp({ ruta: '#/mas/backup' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await p.getByRole('button', { name: 'Exportar copia' }).waitFor();
    await fotoDePrueba(p, '2026-10-13-frente');
    await p.reload();
    await p.getByRole('button', { name: 'Exportar copia' }).click();
    const descarga = p.waitForEvent('download');
    await p.getByRole('region', { name: '¿Incluir fotos?' }).getByRole('button', { name: 'Sin fotos' }).click();
    await p.locator('input[type=file]').setInputFiles(await (await descarga).path());
    await p.getByText('Esta copia no tiene fotos: se conservan las que ya tenés.').waitFor();
  } finally {
    await app.cerrar();
  }
});
