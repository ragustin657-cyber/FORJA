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

const SUBIDA = [[35, 80, 8], [28, 82.5, 8], [21, 85, 8], [14, 85, 9], [7, 87.5, 8], [0, 87.5, 10]];
const urlEjercicio = (p, id = BANCA) => p.url().split('#')[0] + '#/progreso/ejercicio/' + encodeURIComponent(id);
const seisMeses = async (t) => Number((await t.getByText(/^En 6 meses:/).innerText()).match(/En 6 meses: ([\d,]+) kg/)[1].replace(',', '.'));

test('con historial suficiente muestra hoy, 1, 3 y 6 meses y la línea de proyección', async () => {
  const app = await abrirApp({ ruta: '#/progreso' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarHistorial(p, BANCA, SUBIDA);
    await p.goto(urlEjercicio(p));
    const t = p.getByRole('region', { name: 'Hasta dónde podés llegar' });
    await t.getByText(/^Hoy: [\d,]+ kg estimados$/).waitFor();
    for (const m of ['En 1 mes:', 'En 3 meses:', 'En 6 meses:']) await t.getByText(new RegExp(`^${m} [\\d,]+ kg \\([\\d,]+–[\\d,]+\\)$`)).waitFor();
    await t.getByText('Ritmo de nivel intermedio').waitFor();
    await t.getByText(/Es una estimación/).waitFor();
    await p.getByLabel('Proyección').waitFor();
    // principiante: el tope es más alto, así que a 6 meses da igual o más
    const antes = await seisMeses(t);
    await t.getByRole('link', { name: 'Cambiar' }).click();
    await p.getByText('Menos de 1 año entrenando').click();
    await p.goto(urlEjercicio(p));
    await t.getByText('Ritmo de nivel principiante').waitFor();
    assert.ok((await seisMeses(t)) >= antes);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('con poco historial dice cuánto falta', async () => {
  const app = await abrirApp({ ruta: '#/progreso' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarHistorial(p, BANCA, [[10, 80, 8], [3, 82.5, 8]]);
    await p.goto(urlEjercicio(p));
    await p.getByRole('region', { name: 'Hasta dónde podés llegar' }).getByText('Necesitás al menos 4 entrenamientos en 3 semanas para proyectar. Te faltan 2 entrenamientos y 14 días.').waitFor();
    assert.equal(await p.getByLabel('Proyección').count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('con la fuerza estable lo explica', async () => {
  const app = await abrirApp({ ruta: '#/progreso' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarHistorial(p, BANCA, SUBIDA.map(([d]) => [d, 80, 8]));
    await p.goto(urlEjercicio(p));
    await p.getByRole('region', { name: 'Hasta dónde podés llegar' }).getByText(/Tu fuerza viene estable/).waitFor();
  } finally {
    await app.cerrar();
  }
});

test('poner, editar y quitar una meta; la lista de Progreso la muestra', async () => {
  const app = await abrirApp({ ruta: '#/progreso' });
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await cargarHistorial(p, BANCA, SUBIDA);
    await p.goto(urlEjercicio(p));
    const meta = p.getByRole('region', { name: 'Meta' });
    await meta.getByRole('button', { name: 'Poner meta' }).click();
    await meta.getByLabel('Peso (kg)').fill('120');
    await meta.getByLabel('Repeticiones').fill('20');
    await meta.getByRole('button', { name: 'Guardar' }).click();
    await meta.getByText('Las repeticiones tienen que ser un número entero de 1 a 15.').waitFor();
    await meta.getByLabel('Repeticiones').fill('1');
    await meta.getByRole('button', { name: 'Guardar' }).click();
    await meta.getByText('120 kg × 1').waitFor();
    await meta.getByText(/^Te faltan [\d,]+ kg$/).waitFor();
    await meta.getByText(/^(Llegarías|Más de 2 años)/).waitFor();
    await meta.getByRole('progressbar').waitFor();

    await p.goto(p.url().split('#')[0] + '#/progreso');
    await p.getByText(/^Meta 120 kg × 1 · \d+ %$/).waitFor();

    await p.goto(urlEjercicio(p));
    await meta.getByRole('button', { name: 'Editar' }).click();
    await meta.getByLabel('Peso (kg)').fill('50');
    await meta.getByRole('button', { name: 'Guardar' }).click();
    await meta.getByText('¡Ya llegaste! 🏆').waitFor();
    await p.goto(p.url().split('#')[0] + '#/progreso');
    await p.getByText('Meta lograda 🏆').waitFor();

    await p.goto(urlEjercicio(p));
    await meta.getByRole('button', { name: 'Quitar meta' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Quitar' }).click();
    await meta.getByRole('button', { name: 'Poner meta' }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});
