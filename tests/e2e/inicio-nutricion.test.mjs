import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, cargarPlan } from './ayuda.mjs';

const DIA = 86_400_000;

test('sin plan, Inicio no muestra los anillos', async () => {
  const app = await abrirApp();
  try {
    await app.pagina.getByRole('heading', { name: 'FORJA' }).waitFor();
    await app.pagina.getByText('¡Bienvenido a FORJA!').waitFor();
    assert.equal(await app.pagina.getByRole('link', { name: /Lo que comiste hoy/ }).count(), 0);
    assert.equal(await app.pagina.getByText('Toca pesarte').count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('los anillos muestran lo comido hoy y llevan a Hoy', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('link', { name: 'Registrar lo que comí' }).click();
    const almuerzo = p.getByRole('article', { name: 'Almuerzo' });
    const kcal = (await almuerzo.getByTestId('kcal-menu').innerText()).replace(' kcal', '');
    await almuerzo.getByRole('button', { name: 'La comí' }).click();
    await almuerzo.getByRole('button', { name: 'Registrado ✓' }).waitFor();
    await p.goto(p.url().split('#')[0] + '#/');
    const anillos = p.getByRole('link', { name: /Lo que comiste hoy/ });
    await anillos.getByText(`${kcal} de 2.210 kcal`).waitFor();
    await anillos.getByText(/de 160 g proteína/).waitFor();
    assert.equal(await p.getByText('Toca pesarte').count(), 0);
    await anillos.click();
    await p.getByRole('heading', { name: 'Hoy' }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('si pasó una semana sin pesarse, Inicio lo recuerda y el peso aparece en Progreso', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    // el único peso pasa a ser de hace 8 días
    await p.evaluate(
      (atras) =>
        new Promise((ok) => {
          const r = indexedDB.open('forja');
          r.onsuccess = () => {
            const tx = r.result.transaction('pesos', 'readwrite');
            const t = tx.objectStore('pesos');
            t.clear();
            const fecha = Date.now() - atras;
            const d = new Date(fecha);
            t.put({ id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, fecha, kg: 80 });
            tx.oncomplete = () => { r.result.close(); ok(); };
          };
        }),
      8 * DIA,
    );
    await p.goto(p.url().split('#')[0] + '#/');
    await p.reload();
    const tarjeta = p.getByRole('region', { name: 'Toca pesarte' });
    await tarjeta.waitFor();
    await tarjeta.getByLabel('Peso (kg)').fill('300');
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    await tarjeta.getByText('entre 35 y 250').waitFor();
    await tarjeta.getByLabel('Peso (kg)').fill('79,5');
    await tarjeta.getByRole('button', { name: 'Guardar' }).click();
    await tarjeta.waitFor({ state: 'detached' });

    await p.getByRole('link', { name: 'Progreso' }).click();
    const peso = p.getByRole('region', { name: 'Peso corporal' });
    await peso.getByRole('img', { name: 'Peso corporal' }).waitFor();
    await peso.getByText('79,5 kg').first().waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('con un solo peso, Progreso pide cargar más', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await p.getByRole('link', { name: 'Progreso' }).click();
    await p.getByRole('region', { name: 'Peso corporal' }).getByText(/al menos dos veces/).waitFor();
  } finally {
    await app.cerrar();
  }
});
