import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, cargarPlan } from './ayuda.mjs';

const DIA = 86_400_000;

/** Reemplaza los pesos por uno por día: 80,2 kg hace 29 a 15 días y 80 kg los últimos 14 (baja 0,1 kg por semana). */
async function pesosDeUnMes(p) {
  await p.evaluate(
    (dia) =>
      new Promise((ok) => {
        const r = indexedDB.open('forja');
        r.onsuccess = () => {
          const tx = r.result.transaction('pesos', 'readwrite');
          const t = tx.objectStore('pesos');
          t.clear();
          for (let atras = 29; atras >= 0; atras--) {
            if (atras === 14) continue;
            const fecha = Date.now() - atras * dia;
            const d = new Date(fecha);
            const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            t.put({ id, fecha, kg: atras > 14 ? 80.2 : 80 });
          }
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      }),
    DIA,
  );
  await p.reload();
}

test('bajando lento propone 150 kcal menos y al aplicarlo cambian los números', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    const numeros = p.getByRole('region', { name: 'Tus números' });
    await numeros.getByText('2.210', { exact: true }).waitFor();
    await pesosDeUnMes(p);
    const tarjeta = p.getByRole('region', { name: 'Revisamos tu progreso' });
    await tarjeta.getByText(/bajaste 0,1 kg por semana, más lento de lo buscado/).waitFor();
    await tarjeta.getByText('Te proponemos 150 kcal menos por día (de 2.210 a 2.060).').waitFor();
    await tarjeta.getByRole('button', { name: 'Aplicar' }).click();
    await tarjeta.waitFor({ state: 'detached' });
    await numeros.getByText('2.060', { exact: true }).waitFor();
    await p.getByText('Tu plan cambió.').waitFor();
    await p.reload();
    await numeros.getByText('2.060', { exact: true }).waitFor();
    assert.equal(await p.getByRole('region', { name: 'Revisamos tu progreso' }).count(), 0);
    // guardar "Mi plan" sin cambiar el objetivo conserva el ajuste
    await p.getByRole('link', { name: 'Mi plan' }).click();
    await p.getByRole('button', { name: 'Guardar mi plan' }).click();
    await numeros.getByText('2.060', { exact: true }).waitFor();
    // cambiar el objetivo lo vuelve a 0
    await p.getByRole('link', { name: 'Mi plan' }).click();
    await p.getByRole('radiogroup', { name: 'Objetivo' }).getByText('Mantener', { exact: true }).click();
    await p.getByRole('button', { name: 'Guardar mi plan' }).click();
    await numeros.waitFor();
    assert.equal(await numeros.getByText('2.060', { exact: true }).count(), 0);
    assert.equal(await p.getByRole('region', { name: 'Revisamos tu progreso' }).count(), 0);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('"Ahora no" oculta la tarjeta y no vuelve al recargar', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await pesosDeUnMes(p);
    const tarjeta = p.getByRole('region', { name: 'Revisamos tu progreso' });
    await tarjeta.getByRole('button', { name: 'Ahora no' }).click();
    await tarjeta.waitFor({ state: 'detached' });
    await p.reload();
    await p.getByRole('region', { name: 'Tus números' }).getByText('2.210', { exact: true }).waitFor();
    assert.equal(await p.getByRole('region', { name: 'Revisamos tu progreso' }).count(), 0);
    assert.equal(await p.getByText('Tu plan cambió.').count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('con menos de 4 semanas de pesos no propone nada', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await p.reload();
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    assert.equal(await p.getByRole('region', { name: 'Revisamos tu progreso' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});
