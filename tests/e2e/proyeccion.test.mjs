import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, cargarPlan } from './ayuda.mjs';

export const BANCA = 'Barbell_Bench_Press_-_Medium_Grip';

/** Crea sesiones terminadas para un ejercicio: [[díasAtrás, peso, reps], …]. */
export async function cargarHistorial(p, ejercicioId, filas) {
  await p.evaluate(
    ({ ejercicioId, filas }) =>
      new Promise((ok) => {
        const r = indexedDB.open('forja');
        r.onsuccess = () => {
          const tx = r.result.transaction('sesiones', 'readwrite');
          for (const [atras, peso, reps] of filas) {
            const inicio = Date.now() - atras * 86_400_000;
            tx.objectStore('sesiones').put({
              id: `${ejercicioId}-${atras}`, rutinaId: 'r', diaId: 'd', inicio, fin: inicio + 3_600_000,
              series: [{ ejercicioId, numero: 1, peso, reps, completada: true }],
            });
          }
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      }),
    { ejercicioId, filas },
  );
}

const nivel = (p, nombre) => p.getByRole('radiogroup', { name: 'Nivel de entrenamiento' }).getByRole('radio', { name: new RegExp(`^${nombre}`) });

test('el nivel se elige en Ajustes y se recuerda', async () => {
  const app = await abrirApp({ ruta: '#/mas/ajustes' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await nivel(p, 'Intermedio').waitFor();
    assert.equal(await nivel(p, 'Intermedio').isChecked(), true);
    await p.getByText('Más de 3 años').click();
    await p.reload();
    await nivel(p, 'Avanzado').waitFor();
    assert.equal(await nivel(p, 'Avanzado').isChecked(), true);
    assert.equal(await p.getByRole('region', { name: 'Nivel sugerido' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('si los números indican otro nivel, Ajustes lo avisa y deja cambiarlo', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await cargarHistorial(p, BANCA, [[10, 130, 1]]);
    await cargarHistorial(p, 'Barbell_Squat', [[9, 160, 1]]);
    await cargarHistorial(p, 'Barbell_Deadlift', [[8, 200, 1]]);
    await p.goto(p.url().split('#')[0] + '#/mas/ajustes');
    const aviso = p.getByRole('region', { name: 'Nivel sugerido' });
    await aviso.getByText('Tus números en banca, sentadilla y peso muerto indican nivel avanzado.').waitFor();
    await aviso.getByRole('button', { name: 'Cambiar a avanzado' }).click();
    await aviso.waitFor({ state: 'detached' });
    assert.equal(await nivel(p, 'Avanzado').isChecked(), true);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('sin plan no hay aviso de nivel', async () => {
  const app = await abrirApp({ ruta: '#/mas/ajustes' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await nivel(p, 'Intermedio').waitFor();
    await cargarHistorial(p, BANCA, [[10, 130, 1]]);
    await cargarHistorial(p, 'Barbell_Squat', [[9, 160, 1]]);
    await p.reload();
    await nivel(p, 'Intermedio').waitFor();
    await p.waitForTimeout(300);
    assert.equal(await p.getByRole('region', { name: 'Nivel sugerido' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});
