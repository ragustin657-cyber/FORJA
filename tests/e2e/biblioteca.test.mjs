import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

test('escribir en el buscador filtra la lista', async () => {
  const app = await abrirApp({ ruta: '#/mas/biblioteca' });
  try {
    const buscador = app.pagina.getByRole('searchbox', { name: 'Buscar ejercicio' });
    await buscador.waitFor({ timeout: 5000 });
    await buscador.fill('press banca');
    const lista = app.pagina.getByRole('list', { name: 'Ejercicios' });
    await lista.getByText('Press de banca con barra', { exact: true }).waitFor({ timeout: 5000 });
    assert.equal(await lista.getByText('Sentadilla con barra', { exact: true }).count(), 0);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('el detalle muestra imágenes, instrucciones y permite marcar favorito', async () => {
  const app = await abrirApp({ ruta: '#/mas/biblioteca/Barbell_Squat' });
  try {
    await app.pagina.getByRole('heading', { name: 'Sentadilla con barra' }).waitFor({ timeout: 5000 });
    const imagenes = app.pagina.locator('img[alt^="Sentadilla con barra"]');
    assert.equal(await imagenes.count(), 2);
    await app.pagina.waitForFunction(() => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0));
    await app.pagina.getByText(/Apoyá la barra sobre los trapecios/).waitFor();
    await app.pagina.getByRole('button', { name: 'Marcar como favorito' }).click();
    await app.pagina.getByRole('button', { name: 'Quitar de favoritos' }).waitFor({ timeout: 5000 });
  } finally {
    await app.cerrar();
  }
});

test('crear un ejercicio propio lo agrega a la biblioteca', async () => {
  const app = await abrirApp({ ruta: '#/mas/biblioteca' });
  try {
    await app.pagina.getByRole('button', { name: 'Crear ejercicio propio' }).click();
    await app.pagina.getByLabel('Nombre', { exact: true }).fill('Remo en máquina del club');
    await app.pagina.getByLabel('Músculo principal').selectOption('lats');
    await app.pagina.getByLabel('Equipo', { exact: true }).selectOption('machine');
    await app.pagina.getByRole('button', { name: 'Guardar ejercicio' }).click();
    await app.pagina.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('club');
    await app.pagina.getByRole('list', { name: 'Ejercicios' }).getByText('Remo en máquina del club').waitFor({ timeout: 5000 });
  } finally {
    await app.cerrar();
  }
});
