import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

/** Toca la opción visible (la etiqueta), como una persona; el radio está oculto. */
const elegir = async (p, grupo, nombre) => {
  const radio = p.getByRole('radiogroup', { name: grupo }).getByRole('radio', { name: new RegExp(`^${nombre}`) });
  await p.getByRole('radiogroup', { name: grupo }).locator('label').filter({ has: p.getByRole('radio', { name: new RegExp(`^${nombre}`) }) }).click();
  assert.equal(await radio.isChecked(), true);
};

export async function crearPlan(p, { objetivo = 'Ganar músculo', dias = '4', equipo = 'Gimnasio completo', inicio = 'Este lunes' } = {}) {
  await p.goto(p.url().split('#')[0] + '#/entrenar');
  await p.getByRole('link', { name: 'Armar un plan' }).click();
  await elegir(p, 'Objetivo', objetivo);
  await elegir(p, 'Días por semana', dias);
  await elegir(p, 'Equipo', equipo);
  await elegir(p, 'Inicio', inicio);
  await p.getByRole('button', { name: 'Crear plan' }).click();
}

test('armar un plan crea su rutina', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p);
    const rutina = p.getByRole('article', { name: 'Plan de ganar músculo · 4 días' });
    await rutina.waitFor();
    for (const d of ['Torso A', 'Piernas A', 'Torso B', 'Piernas B']) await rutina.getByText(d, { exact: true }).waitFor();
    await p.getByRole('link', { name: 'Armar un plan' }).click();
    await p.getByText(/Nivel intermedio/).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('en casa solo se puede elegir 3 o 4 días', async () => {
  const app = await abrirApp({ ruta: '#/entrenar/plan/nuevo' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await elegir(p, 'Días por semana', '6');
    await elegir(p, 'Equipo', 'Casa');
    const dias = p.getByRole('radiogroup', { name: 'Días por semana' });
    assert.equal(await dias.getByRole('radio', { name: /^5/ }).isDisabled(), true);
    assert.equal(await dias.getByRole('radio', { name: /^4/ }).isChecked(), true);
    await p.getByText('En casa, hasta 4 días por semana.').waitFor();
  } finally {
    await app.cerrar();
  }
});

test('armar otro plan pide confirmar el reemplazo', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p);
    await p.getByRole('article', { name: 'Plan de ganar músculo · 4 días' }).waitFor();
    await crearPlan(p, { objetivo: 'Fuerza', dias: '3' });
    const d = p.getByRole('dialog', { name: 'Ya tenés un plan activo. ¿Reemplazarlo?' });
    await d.getByRole('button', { name: 'Reemplazar' }).click();
    await p.getByRole('article', { name: 'Plan de fuerza · 3 días' }).waitFor();
    await p.getByRole('article', { name: 'Plan de ganar músculo · 4 días' }).waitFor();
  } finally {
    await app.cerrar();
  }
});
