import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

test('muestra 5 pestañas', async () => {
  const app = await abrirApp();
  try {
    const nav = app.pagina.getByRole('navigation');
    for (const nombre of ['Inicio', 'Entrenar', 'Nutrición', 'Progreso', 'Más']) {
      await nav.getByRole('link', { name: nombre }).waitFor({ timeout: 5000 });
    }
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('tocar Entrenar navega', async () => {
  const app = await abrirApp();
  try {
    const nav = app.pagina.getByRole('navigation');
    await nav.getByRole('link', { name: 'Entrenar' }).click();
    assert.equal(await nav.getByRole('link', { name: 'Entrenar' }).getAttribute('aria-current'), 'page');
    assert.equal(await nav.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current'), null);
    assert.match(app.pagina.url(), /#\/entrenar$/);
  } finally {
    await app.cerrar();
  }
});

test('los botones de la barra miden al menos 48 px', async () => {
  const app = await abrirApp();
  try {
    const caja = await app.pagina.getByRole('navigation').getByRole('link', { name: 'Inicio' }).boundingBox();
    assert.ok(caja.height >= 48, `alto ${caja.height}`);
  } finally {
    await app.cerrar();
  }
});
