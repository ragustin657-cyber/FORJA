import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

test('AvisoInstalar se muestra en Safari sin instalar, se cierra y no vuelve al recargar', async () => {
  const app = await abrirApp();
  try {
    const aviso = app.pagina.getByRole('region', { name: 'Instalar FORJA' });
    await aviso.waitFor({ timeout: 5000 });
    const texto = await aviso.textContent();
    assert.match(texto, /Compartir/);
    assert.match(texto, /Agregar a inicio/);
    await aviso.getByRole('button', { name: 'Cerrar aviso' }).click();
    await aviso.waitFor({ state: 'detached', timeout: 5000 });
    await app.pagina.reload();
    await app.pagina.getByText('FORJA', { exact: true }).first().waitFor();
    assert.equal(await app.pagina.getByRole('region', { name: 'Instalar FORJA' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});
