import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirApp } from './ayuda.mjs';

test('App muestra el logo FORJA', async () => {
  const app = await abrirApp();
  try {
    await app.pagina.getByText('FORJA', { exact: true }).first().waitFor({ timeout: 5000 });
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('el build genera manifest y service worker', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../dist/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'FORJA');
  assert.equal(manifest.short_name, 'FORJA');
  assert.equal(manifest.lang, 'es-AR');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#7A1F2B');
  assert.equal(manifest.background_color, '#141012');
  const sw = await readFile(new URL('../../dist/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /app\.js/);
});
