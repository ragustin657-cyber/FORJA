import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, esperarValor } from './ayuda.mjs';

const EJ = 'Curl de bíceps con barra';

async function rutinaYEmpezar(p) {
  await p.goto(p.url().split('#')[0] + '#/entrenar');
  await p.getByRole('button', { name: 'Nueva rutina' }).click();
  await p.getByLabel('Nombre de la rutina').fill('Brazos');
  await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
  await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('curl biceps barra');
  await p.getByRole('button', { name: `Agregar ${EJ}`, exact: true }).click();
  await p.getByRole('button', { name: 'Guardar rutina' }).click();
  await p.getByRole('article', { name: 'Brazos' }).getByRole('button', { name: /Empezar/ }).click();
}

test('cambiar el incremento en Ajustes cambia lo que suma el botón +', async () => {
  const app = await abrirApp({ ruta: '#/mas/ajustes' });
  const p = app.pagina;
  try {
    await p.getByRole('radiogroup', { name: 'Incremento de peso' }).getByText('1 kg', { exact: true }).click();
    await p.getByText('Guardado').waitFor({ timeout: 5000 });
    await rutinaYEmpezar(p);
    await p.getByRole('textbox', { name: `Peso serie 1 de ${EJ}` }).fill('20');
    await p.getByRole('button', { name: `Sumar Peso serie 1 de ${EJ}` }).click();
    await esperarValor(p.getByRole('textbox', { name: `Peso serie 1 de ${EJ}` }), '21');
  } finally {
    await app.cerrar();
  }
});

test('después del primer entrenamiento sin copia aparece el recordatorio en Inicio', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    assert.equal(await p.getByText('Hacé tu copia de seguridad').count(), 0);
    await rutinaYEmpezar(p);
    await p.getByRole('textbox', { name: `Peso serie 1 de ${EJ}` }).fill('20');
    await p.getByRole('button', { name: `Completar serie 1 de ${EJ}` }).click();
    await p.getByRole('button', { name: 'Terminar entrenamiento' }).click();
    await p.getByRole('heading', { name: '¡Entrenamiento terminado!' }).waitFor({ timeout: 5000 });
    await p.goto(p.url().split('#')[0] + '#/');
    await p.getByText('Hacé tu copia de seguridad').waitFor({ timeout: 5000 });
    await p.getByRole('link', { name: 'Hacer copia' }).click();
    await p.getByRole('button', { name: 'Exportar copia' }).waitFor({ timeout: 5000 });
  } finally {
    await app.cerrar();
  }
});

test('Más muestra el aviso de salud', async () => {
  const app = await abrirApp({ ruta: '#/mas' });
  try {
    await app.pagina.getByText(/No reemplaza a un médico, nutricionista o entrenador matriculado/).waitFor({ timeout: 5000 });
  } finally {
    await app.cerrar();
  }
});
