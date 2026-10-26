import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirApp, esperarValor } from './ayuda.mjs';

async function crearRutina(p, nombre, ejercicios) {
  await p.goto(p.url().split('#')[0] + '#/entrenar');
  await p.getByRole('button', { name: 'Nueva rutina' }).click();
  await p.getByLabel('Nombre de la rutina').fill(nombre);
  for (const [busqueda, exacto] of ejercicios) {
    await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
    await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill(busqueda);
    await p.getByRole('button', { name: `Agregar ${exacto}`, exact: true }).click();
  }
}

test('doble toque en Empezar crea un solo entrenamiento', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Doble', [['remo barra', 'Remo con barra']]);
    await p.getByRole('button', { name: 'Guardar rutina' }).click();
    await p.getByRole('article', { name: 'Doble' }).getByRole('button', { name: /Empezar/ }).dblclick();
    await p.getByRole('textbox', { name: 'Peso serie 1 de Remo con barra' }).fill('50');
    await p.getByRole('button', { name: 'Completar serie 1 de Remo con barra' }).click();
    await p.getByRole('button', { name: 'Terminar entrenamiento' }).click();
    await p.getByRole('heading', { name: '¡Entrenamiento terminado!' }).waitFor({ timeout: 5000 });
    await p.goto(p.url().split('#')[0] + '#/entrenar');
    await p.getByRole('article', { name: 'Doble' }).waitFor({ timeout: 5000 });
    assert.equal(await p.getByText('Tenés un entrenamiento en curso').count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('borrar un número en el editor y escribir otro no agrega dígitos', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Edición', [['remo barra', 'Remo con barra']]);
    const campo = p.getByRole('textbox', { name: 'Reps mínimas de Remo con barra' });
    await campo.click();
    await campo.press('End');
    await campo.press('Backspace');
    await campo.type('6');
    await esperarValor(campo, '6');
    await campo.blur();
    await esperarValor(campo, '6');
  } finally {
    await app.cerrar();
  }
});

test('vaciar un campo del editor y salir vuelve al mínimo', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Vacío', [['remo barra', 'Remo con barra']]);
    const campo = p.getByRole('textbox', { name: 'Series de Remo con barra' });
    await campo.fill('');
    await campo.blur();
    await esperarValor(campo, '1');
  } finally {
    await app.cerrar();
  }
});

test('el sonido del temporizador se habilita con el toque de completar serie', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await p.evaluate(() => {
      const Original = window.AudioContext;
      window.__audio = [];
      window.AudioContext = class extends Original {
        constructor(...a) {
          super(...a);
          window.__audio.push(navigator.userActivation.isActive);
        }
      };
    });
    await crearRutina(p, 'Sonido', [['remo barra', 'Remo con barra']]);
    await p.getByRole('button', { name: 'Guardar rutina' }).click();
    await p.getByRole('article', { name: 'Sonido' }).getByRole('button', { name: /Empezar/ }).click();
    await p.getByRole('textbox', { name: 'Peso serie 1 de Remo con barra' }).fill('50');
    await p.getByRole('button', { name: 'Completar serie 1 de Remo con barra' }).click();
    await p.getByRole('timer').waitFor({ timeout: 5000 });
    const creados = await p.evaluate(() => window.__audio);
    assert.ok(creados.length >= 1, 'no se creó el audio');
    assert.equal(creados[0], true, 'el audio se creó fuera de un toque');
  } finally {
    await app.cerrar();
  }
});

test('en un ejercicio con peso corporal se completa la serie sin cargar peso', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Barra', [['dominadas supinas', 'Dominadas supinas']]);
    await p.getByRole('button', { name: 'Guardar rutina' }).click();
    await p.getByRole('article', { name: 'Barra' }).getByRole('button', { name: /Empezar/ }).click();
    await p.getByText('Peso corporal: cargá peso solo si usás lastre').waitFor({ timeout: 5000 });
    await p.getByRole('button', { name: 'Completar serie 1 de Dominadas supinas' }).click();
    await p.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas supinas' }).waitFor({ timeout: 5000 });
    assert.equal(await p.getByText('Cargá el peso y las repeticiones antes de completar la serie.').count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('el service worker descarga archivos frescos al actualizarse', async () => {
  const sw = await readFile(new URL('../../dist/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /cache: 'reload'/);
});
