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
