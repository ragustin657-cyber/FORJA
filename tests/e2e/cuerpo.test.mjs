import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, cargarPlan } from './ayuda.mjs';

function fechaLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function cargarMedidas(p, valores, fecha) {
  await p.goto(p.url().split('#')[0] + '#/progreso');
  await p.getByRole('region', { name: 'Medidas' }).getByRole('link', { name: 'Cargar medidas' }).click();
  if (fecha) await p.getByLabel('Fecha').fill(fecha);
  for (const [nombre, v] of Object.entries(valores)) await p.getByLabel(`${nombre} (cm)`).fill(v);
  await p.getByRole('button', { name: 'Guardar medidas' }).click();
}

test('con plan, cintura y cuello estiman el % de grasa', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await cargarMedidas(p, { Cintura: '85', Cuello: '38' });
    const tarjeta = p.getByRole('region', { name: 'Medidas' });
    await tarjeta.getByText('16,1 %').waitFor();
    await tarjeta.getByText(/±3–4 %/).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('dos registros muestran la diferencia y el gráfico de la medida', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    const ayer = new Date(Date.now() - 86_400_000);
    await cargarMedidas(p, { Cintura: '85' }, fechaLocal(ayer));
    await p.getByRole('region', { name: 'Medidas' }).waitFor();
    await cargarMedidas(p, { Cintura: '83,5' });
    const tarjeta = p.getByRole('region', { name: 'Medidas' });
    await tarjeta.getByText('Cintura 83,5 cm · −1,5').waitFor();
    await tarjeta.getByRole('button', { name: 'Cintura', exact: true }).click();
    await tarjeta.getByRole('img', { name: 'Cintura' }).waitFor();
    // sin plan no hay % de grasa
    await tarjeta.getByText('Armá tu plan para estimar tu % de grasa').waitFor();
  } finally {
    await app.cerrar();
  }
});

test('el formulario pide al menos una medida y controla el rango', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarMedidas(p, {});
    await p.getByText('Completá al menos una medida.').waitFor();
    await p.getByLabel('Cuello (cm)').fill('90');
    await p.getByRole('button', { name: 'Guardar medidas' }).click();
    await p.getByText('El cuello tiene que estar entre 20 y 70 cm.').waitFor();
    await p.getByText('Debajo de la nuez.').waitFor();
  } finally {
    await app.cerrar();
  }
});

test('se puede borrar un registro de medidas', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarMedidas(p, { Brazo: '36' });
    const tarjeta = p.getByRole('region', { name: 'Medidas' });
    await tarjeta.getByText('Brazo 36 cm').waitFor();
    await tarjeta.getByRole('button', { name: /Borrar las medidas del/ }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Borrar' }).click();
    await tarjeta.getByText(/Anotá tus medidas/).waitFor();
  } finally {
    await app.cerrar();
  }
});
