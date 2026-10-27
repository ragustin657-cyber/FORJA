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

const kcalDe = (texto) => Number(texto.replace(/[^\d]/g, ''));

test('Nutrición muestra el menú de hoy con sus 4 comidas', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    const hoy = p.getByRole('region', { name: 'Menú de hoy' });
    for (const t of ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']) await hoy.getByText(t, { exact: true }).waitFor();
    assert.equal(await hoy.getByText(/kcal/).count() >= 4, true);
  } finally {
    await app.cerrar();
  }
});

test('la semana muestra cada día dentro de ±5 % y se puede cambiar un plato', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('link', { name: 'Semana completa' }).click();
    await p.getByRole('tab', { name: 'Lun' }).click();
    for (const dia of ['Lun', 'Jue', 'Dom']) {
      await p.getByRole('tab', { name: dia }).click();
      const total = kcalDe(await p.getByTestId('total-dia').textContent());
      assert.ok(Math.abs(total - 2210) / 2210 <= 0.05, `${dia}: ${total}`);
    }
    await p.getByRole('tab', { name: 'Lun' }).click();
    const almuerzo = p.getByRole('article', { name: 'Almuerzo' });
    const antes = await almuerzo.getByRole('link').first().textContent();
    await almuerzo.getByRole('button', { name: 'Cambiar' }).click();
    const opciones = p.getByRole('list', { name: 'Alternativas' }).getByRole('button');
    assert.ok((await opciones.count()) >= 1);
    const elegido = (await opciones.first().getAttribute('aria-label')).replace('Elegir ', '');
    await opciones.first().click();
    await p.getByRole('article', { name: 'Almuerzo' }).getByRole('link', { name: elegido }).waitFor();
    assert.notEqual(elegido, antes);
    await p.reload();
    await p.getByRole('tab', { name: 'Lun' }).click();
    await p.getByRole('article', { name: 'Almuerzo' }).getByRole('link', { name: elegido }).waitFor();
  } finally {
    await app.cerrar();
  }
});

test('rehacer la semana cambia los platos', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('link', { name: 'Semana completa' }).click();
    const nombres = async () => {
      const todos = [];
      for (const d of ['Lun', 'Mar', 'Mié']) {
        await p.getByRole('tab', { name: d }).click();
        todos.push(...(await p.getByRole('main').getByRole('article').getByRole('link').allTextContents()));
      }
      return todos.join('|');
    };
    const antes = await nombres();
    await p.getByRole('button', { name: 'Rehacer semana' }).click();
    await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
    assert.notEqual(await nombres(), antes);
  } finally {
    await app.cerrar();
  }
});

test('el detalle del plato muestra ingredientes en gramos, pasos y macros', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    const hoy = p.getByRole('region', { name: 'Menú de hoy' });
    const nombre = await hoy.getByRole('link').first().textContent();
    await hoy.getByRole('link').first().click();
    await p.getByRole('heading', { name: nombre }).waitFor();
    const ingredientes = p.getByRole('list', { name: 'Ingredientes' }).getByRole('listitem');
    assert.ok((await ingredientes.count()) >= 2);
    assert.match(await ingredientes.first().textContent(), /\d+ g/);
    assert.ok((await p.getByRole('list', { name: 'Preparación' }).getByRole('listitem').count()) >= 2);
    await p.getByText('Proteína', { exact: true }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});
