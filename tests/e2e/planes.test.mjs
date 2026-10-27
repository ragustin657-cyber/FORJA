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

/** Mueve el inicio del plan activo N semanas hacia atrás (o adelante si N es negativo). */
export async function moverInicio(p, semanasAtras) {
  await p.evaluate(
    (n) =>
      new Promise((ok) => {
        const r = indexedDB.open('forja');
        r.onsuccess = () => {
          const tx = r.result.transaction('planes', 'readwrite');
          const t = tx.objectStore('planes');
          const q = t.getAll();
          q.onsuccess = () => {
            const d = new Date();
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * n);
            const lunes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            for (const plan of q.result) if (plan.estado === 'activo') t.put({ ...plan, inicio: lunes });
          };
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      }),
    semanasAtras,
  );
}

const irA = (p, ruta) => p.goto(p.url().split('#')[0] + '#' + ruta);

test('la tarjeta del plan y el Inicio siguen el plan', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    // una rutina propia primero
    await irA(p, '/entrenar/rutina/nueva');
    await p.getByLabel('Nombre de la rutina').fill('Mi rutina');
    await p.getByRole('button', { name: 'Agregar día' }).click();
    await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
    await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('remo barra');
    await p.getByRole('button', { name: 'Agregar Remo con barra', exact: true }).click();
    await p.getByRole('button', { name: 'Guardar rutina' }).click();
    await p.getByRole('heading', { name: 'Mi rutina' }).waitFor();

    await crearPlan(p);
    const tarjeta = p.getByRole('region', { name: 'Tu plan' });
    await tarjeta.getByText('Plan de ganar músculo · 4 días').waitFor();
    assert.equal(await tarjeta.getByRole('listitem').count(), 12);
    await tarjeta.getByRole('listitem', { name: 'Semana 1, actual' }).waitFor();
    await tarjeta.getByRole('listitem', { name: 'Semana 4, descarga' }).waitFor();
    await tarjeta.getByText('Esta semana: 0 de 4 entrenamientos').waitFor();

    await irA(p, '/');
    await p.getByText('Próximo: Torso A').waitFor();
    await p.getByText('Semana 1 de 12 · Bloque 1').waitFor();

    await moverInicio(p, 3);
    await p.reload();
    await p.getByText('Semana 4 de 12 · Bloque 1').waitFor();
    await p.getByText('Descarga', { exact: true }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('al terminar las 12 semanas, Inicio lo celebra y deja volver a las rutinas', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p);
    await p.getByRole('region', { name: 'Tu plan' }).waitFor();
    await moverInicio(p, 13);
    await irA(p, '/');
    const fin = p.getByRole('region', { name: 'Plan terminado' });
    await fin.getByText('¡Terminaste tu plan de 12 semanas! 🏆').waitFor();
    await fin.getByRole('link', { name: 'Armar otro plan' }).waitFor();
    await fin.getByRole('button', { name: 'Volver a mis rutinas' }).click();
    await fin.waitFor({ state: 'detached' });
    await irA(p, '/entrenar');
    await p.getByRole('heading', { name: 'Entrenar' }).waitFor();
    assert.equal(await p.getByRole('region', { name: 'Tu plan' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('terminar el plan antes, plan por empezar y rutina del plan borrada', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p, { inicio: 'El lunes que viene' });
    const tarjeta = p.getByRole('region', { name: 'Tu plan' });
    await tarjeta.getByText(/^Tu plan arranca el lunes \d+\/\d+$/).waitFor();
    await irA(p, '/');
    await p.getByText(/^Tu plan arranca el lunes \d+\/\d+$/).waitFor();

    await irA(p, '/entrenar');
    await tarjeta.getByRole('button', { name: 'Terminar plan' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Terminar' }).click();
    await tarjeta.waitFor({ state: 'detached' });

    await crearPlan(p);
    await tarjeta.waitFor();
    await p.getByRole('article', { name: 'Plan de ganar músculo · 4 días' }).last().getByRole('link', { name: 'Editar' }).click();
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: /Eliminar rutina/ }).click();
    await irA(p, '/entrenar');
    await p.getByRole('heading', { name: 'Entrenar' }).waitFor();
    await p.waitForTimeout(300);
    assert.equal(await tarjeta.count(), 0);
    await irA(p, '/');
    await p.getByRole('heading', { name: 'FORJA', exact: true }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

const BANCA = 'Press de banca con barra';
async function sesionPrevia(p, ejercicioId, peso, reps, series, diasAtras = 10) {
  await p.evaluate(
    ({ ejercicioId, peso, reps, series, diasAtras }) =>
      new Promise((ok) => {
        const r = indexedDB.open('forja');
        r.onsuccess = () => {
          const tx = r.result.transaction('sesiones', 'readwrite');
          const inicio = Date.now() - diasAtras * 86_400_000;
          tx.objectStore('sesiones').put({
            id: 'previa', rutinaId: 'vieja', diaId: 'x', inicio, fin: inicio + 3_600_000,
            series: Array.from({ length: series }, (_, i) => ({ ejercicioId, numero: i + 1, peso, reps, completada: true })),
          });
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      }),
    { ejercicioId, peso, reps, series, diasAtras },
  );
}
const seriesDe = (p, nombre) => p.getByRole('region', { name: nombre }).getByRole('button', { name: /^Completar serie/ });

test('semana 1: una serie menos en los básicos y el aviso de la semana', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p);
    await p.getByRole('region', { name: 'Tu plan' }).waitFor();
    await p.getByRole('button', { name: 'Empezar Torso A' }).first().click();
    await p.getByRole('note').getByText('Semana 1 de 12 · Bloque 1').waitFor();
    assert.equal(await seriesDe(p, BANCA).count(), 3);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('semana de descarga: menos series y peso al 90 %', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p);
    await p.getByRole('region', { name: 'Tu plan' }).waitFor();
    await sesionPrevia(p, 'Barbell_Bench_Press_-_Medium_Grip', 100, 12, 4);
    await moverInicio(p, 3);
    await p.reload();
    await p.getByRole('button', { name: 'Empezar Torso A' }).first().click();
    await p.getByRole('note').getByText('Semana de descarga: más liviano a propósito, para recuperarte').waitFor();
    assert.equal(await seriesDe(p, BANCA).count(), 2);
    await p.getByRole('region', { name: BANCA }).getByText('Descarga: 92,5 kg').waitFor();
    assert.equal(await p.getByRole('textbox', { name: `Peso serie 1 de ${BANCA}` }).inputValue(), '92,5');
  } finally {
    await app.cerrar();
  }
});

test('una rutina propia no muestra el aviso ni cambia sus series', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await crearPlan(p);
    await p.getByRole('region', { name: 'Tu plan' }).waitFor();
    await irA(p, '/entrenar/rutina/nueva');
    await p.getByLabel('Nombre de la rutina').fill('Mi rutina');
    await p.getByRole('button', { name: 'Agregar día' }).click();
    await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
    await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('press banca barra');
    await p.getByRole('button', { name: `Agregar ${BANCA}`, exact: true }).click();
    await p.getByRole('button', { name: 'Guardar rutina' }).click();
    await p.getByRole('heading', { name: 'Mi rutina' }).waitFor();
    await p.getByRole('article', { name: 'Mi rutina' }).getByRole('button', { name: /^Empezar/ }).first().click();
    await seriesDe(p, BANCA).first().waitFor();
    assert.equal(await seriesDe(p, BANCA).count(), 3);
    assert.equal(await p.getByRole('note').count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('una sesión empezada el domingo a la noche sigue en su semana después de medianoche', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(8000);
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7); // un domingo futuro
    d.setHours(23, 50, 0, 0);
    await p.clock.install({ time: d });
    await p.reload();
    await crearPlan(p);
    await p.getByRole('region', { name: 'Tu plan' }).waitFor();
    await p.getByRole('button', { name: 'Empezar Torso A' }).first().click();
    await p.getByRole('note').getByText('Semana 1 de 12 · Bloque 1').waitFor();
    await p.clock.setSystemTime(new Date(d.getTime() + 20 * 60_000));
    await p.reload();
    await p.getByRole('note').getByText('Semana 1 de 12 · Bloque 1').waitFor();
    assert.equal(await seriesDe(p, BANCA).count(), 3);
  } finally {
    await app.cerrar();
  }
});
