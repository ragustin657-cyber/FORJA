import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

const EJ = 'Press de banca con barra';

async function crearRutina(p) {
  await p.goto(p.url().split('#')[0] + '#/entrenar');
  await p.getByRole('button', { name: 'Nueva rutina' }).click();
  await p.getByLabel('Nombre de la rutina').fill('Pecho');
  await p.getByRole('button', { name: 'Agregar día' }).click();
  await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
  await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('press banca barra');
  await p.getByRole('button', { name: `Agregar ${EJ}`, exact: true }).click();
  await p.getByRole('button', { name: 'Agregar ejercicio' }).nth(1).click();
  await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('remo barra');
  await p.getByRole('button', { name: 'Agregar Remo con barra', exact: true }).click();
  await p.getByRole('button', { name: 'Guardar rutina' }).click();
  await p.getByRole('heading', { name: 'Pecho' }).waitFor({ timeout: 5000 });
}

/** Entrena el Día A cargando un peso en las 3 series de press de banca. */
async function entrenar(p, peso, reps = 10) {
  await p.goto(p.url().split('#')[0] + '#/entrenar');
  await p.getByRole('button', { name: 'Empezar Día A' }).click();
  for (const n of [1, 2, 3]) {
    await p.getByRole('textbox', { name: `Peso serie ${n} de ${EJ}` }).fill(String(peso));
    await p.getByRole('textbox', { name: `Reps serie ${n} de ${EJ}` }).fill(String(reps));
    await p.getByRole('button', { name: `Completar serie ${n} de ${EJ}` }).click();
  }
  await p.getByRole('button', { name: 'Terminar entrenamiento' }).click();
  await p.getByRole('heading', { name: '¡Entrenamiento terminado!' }).waitFor({ timeout: 5000 });
}

test('con una sesión, el gráfico pide más datos y no hay récord', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p);
    await entrenar(p, 60);
    assert.equal(await p.getByText(/Nuevo récord/).count(), 0);
    await p.goto(p.url().split('#')[0] + '#/progreso');
    await p.getByRole('link', { name: new RegExp(EJ) }).click();
    await p.getByText('Necesitás al menos 2 sesiones para ver el gráfico.').waitFor({ timeout: 5000 });
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('superar el peso muestra el récord en el resumen, el gráfico y el inicio', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p);
    await entrenar(p, 60);
    await entrenar(p, 62.5);
    await p.getByText(`Nuevo récord: ${EJ} 62,5 kg`).waitFor({ timeout: 5000 });

    await p.goto(p.url().split('#')[0] + '#/progreso/ejercicio/Barbell_Bench_Press_-_Medium_Grip');
    await p.getByRole('img', { name: 'Gráfico de fuerza estimada' }).waitFor({ timeout: 5000 });
    await p.getByText('Mayor peso').waitFor();
    await p.getByText('62,5 kg', { exact: true }).first().waitFor();

    await p.goto(p.url().split('#')[0] + '#/');
    await p.getByText('Próximo: Día B').waitFor({ timeout: 5000 });
    await p.getByText(`${EJ} 62,5 kg`).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});
