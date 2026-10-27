import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirApp } from './ayuda.mjs';

test('el ícono de la app es solo la letra, sin borde dorado', async () => {
  const svg = await readFile(new URL('../../public/icons/icono.svg', import.meta.url), 'utf8');
  assert.equal((svg.match(/<rect/g) ?? []).length, 1, 'solo el fondo');
  assert.doesNotMatch(svg, /stroke=/);
});

test('al agregar un ejercicio, el editor vuelve a donde estabas', async () => {
  const app = await abrirApp({ ruta: '#/entrenar/rutina/nueva' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    const agregar = async (busqueda, nombre) => {
      await p.getByRole('button', { name: 'Agregar ejercicio' }).last().click();
      await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill(busqueda);
      await p.getByRole('button', { name: `Agregar ${nombre}`, exact: true }).click();
    };
    await agregar('press banca barra', 'Press de banca con barra');
    await agregar('remo barra', 'Remo con barra');
    await agregar('sentadilla barra', 'Sentadilla con barra');
    await p.getByRole('button', { name: 'Agregar ejercicio' }).last().scrollIntoViewIfNeeded();
    const antes = await p.evaluate(() => window.scrollY);
    assert.ok(antes > 300, `la página debería estar scrolleada (${antes})`);
    await agregar('peso muerto', 'Peso muerto');
    await p.getByText('Peso muerto', { exact: true }).waitFor();
    await p.waitForTimeout(200);
    const despues = await p.evaluate(() => window.scrollY);
    assert.ok(despues >= antes - 20, `volvió arriba: antes ${antes}, después ${despues}`);
    const boton = await p.getByRole('button', { name: 'Agregar ejercicio' }).last().boundingBox();
    const alto = await p.evaluate(() => window.innerHeight);
    assert.ok(boton.y > 0 && boton.y < alto, 'el botón Agregar ejercicio sigue a la vista');
  } finally {
    await app.cerrar();
  }
});

test('los pesos con decimales se ven completos en la sesión', async () => {
  const app = await abrirApp({ ruta: '#/entrenar' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await p.getByRole('button', { name: 'Nueva rutina' }).click();
    await p.getByLabel('Nombre de la rutina').fill('Piernas');
    await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
    await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('prensa');
    await p.getByRole('button', { name: 'Agregar Prensa de piernas', exact: true }).click();
    await p.getByRole('button', { name: 'Guardar rutina' }).click();
    await p.getByRole('article', { name: 'Piernas' }).getByRole('button', { name: /Empezar/ }).click();
    for (const valor of ['22,5', '102,5', '182,5']) {
      const campo = p.getByRole('textbox', { name: 'Peso serie 1 de Prensa de piernas' });
      await campo.fill(valor);
      await campo.blur();
      const { ancho, contenido } = await campo.evaluate((el) => ({ ancho: el.clientWidth, contenido: el.scrollWidth }));
      assert.ok(contenido <= ancho, `"${valor}" no entra: contenido ${contenido}px, campo ${ancho}px`);
    }
    const fila = await p.getByRole('button', { name: 'Completar serie 1 de Prensa de piernas' }).boundingBox();
    assert.ok(fila.x + fila.width <= 390 - 16, 'el botón de completar entra en la pantalla');
  } finally {
    await app.cerrar();
  }
});
