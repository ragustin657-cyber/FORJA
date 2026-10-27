import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

/** Completa "Mi plan" con los datos de ejemplo (hombre, 30 años, 180 cm, 80 kg, moderado, bajar, 4 comidas). */
export async function cargarPlan(p, { peso = '80', altura = '180' } = {}) {
  await p.goto(p.url().split('#')[0] + '#/nutricion');
  await p.getByRole('button', { name: 'Armá tu plan' }).click();
  await p.getByRole('radiogroup', { name: 'Sexo' }).getByText('Hombre', { exact: true }).click();
  await p.getByLabel('Fecha de nacimiento').fill('1996-05-10');
  await p.getByLabel('Altura (cm)').fill(altura);
  await p.getByLabel('Peso (kg)').fill(peso);
  await p.getByRole('radiogroup', { name: 'Actividad' }).getByText('Moderado', { exact: true }).click();
  await p.getByRole('radiogroup', { name: 'Objetivo' }).getByText('Bajar grasa', { exact: true }).click();
  await p.getByRole('button', { name: 'Guardar mi plan' }).click();
}

test('sin perfil, Nutrición invita a armar el plan', async () => {
  const app = await abrirApp({ ruta: '#/nutricion' });
  try {
    await app.pagina.getByRole('button', { name: 'Armá tu plan' }).waitFor({ timeout: 5000 });
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('al completar el perfil se ven las calorías, la proteína y la explicación', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    const numeros = p.getByRole('region', { name: 'Tus números' });
    await numeros.getByText('2.210', { exact: true }).waitFor();
    await numeros.getByText('160 g', { exact: true }).waitFor();
    await numeros.getByText('Tu cuerpo gasta unas 2.760 kcal por día.').waitFor();
    await numeros.getByText(/valores aproximados/i).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('una altura fuera de rango no se guarda', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p, { altura: '100' });
    await p.getByText('La altura tiene que estar entre 120 y 230 cm.').waitFor();
    assert.equal(await p.getByRole('region', { name: 'Tus números' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('el peso acepta coma decimal', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p, { peso: '80,5' });
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await p.getByRole('link', { name: 'Mi plan' }).click();
    assert.equal(await p.getByLabel('Peso (kg)').inputValue(), '80,5');
  } finally {
    await app.cerrar();
  }
});

test('si cambia el plan con un menú armado, avisa y deja rehacerlo', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await p.getByRole('link', { name: 'Mi plan' }).click();
    await p.getByLabel('Peso (kg)').fill('78');
    await p.getByRole('button', { name: 'Guardar mi plan' }).click();
    await p.getByText('Tu plan cambió').waitFor();
    await p.getByRole('button', { name: 'Rehacer el menú' }).click();
    await p.getByText('Tu plan cambió').waitFor({ state: 'detached' });
  } finally {
    await app.cerrar();
  }
});
