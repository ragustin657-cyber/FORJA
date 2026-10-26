import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, esperarValor } from './ayuda.mjs';

/** Crea una rutina por la interfaz con un día y los ejercicios indicados (búsqueda → nombre exacto). */
async function crearRutina(p, nombre, ejercicios) {
  await p.goto(p.url().split('#')[0] + '#/entrenar');
  await p.getByRole('button', { name: 'Nueva rutina' }).click();
  await p.getByLabel('Nombre de la rutina').fill(nombre);
  for (const [busqueda, exacto] of ejercicios) {
    await p.getByRole('button', { name: 'Agregar ejercicio' }).first().click();
    await p.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill(busqueda);
    await p.getByRole('button', { name: `Agregar ${exacto}`, exact: true }).click();
  }
  await p.getByRole('button', { name: 'Guardar rutina' }).click();
  await p.getByRole('heading', { name: nombre }).waitFor({ timeout: 5000 });
}

test('crear rutina con un día y dos ejercicios y guardarla', async () => {
  const app = await abrirApp();
  try {
    await crearRutina(app.pagina, 'Fuerza', [['press banca barra', 'Press de banca con barra'], ['remo barra', 'Remo con barra']]);
    const tarjeta = app.pagina.getByRole('article', { name: 'Fuerza' });
    await tarjeta.getByText('2 ejercicios').waitFor();
    await app.pagina.reload();
    await app.pagina.getByRole('article', { name: 'Fuerza' }).waitFor({ timeout: 5000 });
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('primera vez muestra el mensaje, retoma la sesión en curso y guarda el peso con coma', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Pecho', [['press banca barra', 'Press de banca con barra']]);
    await p.getByRole('article', { name: 'Pecho' }).getByRole('button', { name: /Empezar/ }).click();
    await p.getByText('Primera vez: elegí un peso cómodo').waitFor({ timeout: 5000 });

    const peso1 = p.getByRole('textbox', { name: 'Peso serie 1 de Press de banca con barra' });
    await peso1.fill('62,5');
    await p.getByRole('button', { name: 'Completar serie 1 de Press de banca con barra' }).click();
    await p.getByRole('timer').waitFor({ timeout: 5000 });

    await p.reload();
    await p.getByRole('textbox', { name: 'Peso serie 1 de Press de banca con barra' }).waitFor({ timeout: 5000 });
    await esperarValor(p.getByRole('textbox', { name: 'Peso serie 1 de Press de banca con barra' }), '62,5');
    assert.equal(await p.getByRole('button', { name: 'Desmarcar serie 1 de Press de banca con barra' }).count(), 1);

    await p.goto(p.url().split('#')[0] + '#/entrenar');
    await p.getByText('Tenés un entrenamiento en curso').waitFor({ timeout: 5000 });
    await p.getByRole('button', { name: 'Retomar' }).click();
    await p.getByRole('button', { name: 'Desmarcar serie 1 de Press de banca con barra' }).waitFor({ timeout: 5000 });
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('no se puede completar una serie sin peso', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Piernas', [['sentadilla barra', 'Sentadilla con barra']]);
    await p.getByRole('article', { name: 'Piernas' }).getByRole('button', { name: /Empezar/ }).click();
    await p.getByRole('button', { name: 'Completar serie 1 de Sentadilla con barra' }).click();
    await p.getByText('Cargá el peso y las repeticiones antes de completar la serie.').waitFor({ timeout: 5000 });
    assert.equal(await p.getByRole('button', { name: 'Desmarcar serie 1 de Sentadilla con barra' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('al terminar con todas las series al tope, la próxima sesión sugiere subir', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Hombros', [['press militar de pie', 'Press militar de pie']]);
    await p.getByRole('article', { name: 'Hombros' }).getByRole('button', { name: /Empezar/ }).click();
    for (const n of [1, 2, 3]) {
      await p.getByRole('textbox', { name: `Peso serie ${n} de Press militar de pie` }).fill('40');
      await p.getByRole('textbox', { name: `Reps serie ${n} de Press militar de pie` }).fill('12');
      await p.getByRole('button', { name: `Completar serie ${n} de Press militar de pie` }).click();
    }
    await p.getByRole('button', { name: 'Terminar entrenamiento' }).click();
    await p.getByRole('heading', { name: '¡Entrenamiento terminado!' }).waitFor({ timeout: 5000 });

    await p.goto(p.url().split('#')[0] + '#/entrenar');
    await p.getByRole('article', { name: 'Hombros' }).getByRole('button', { name: /Empezar/ }).click();
    await p.getByText('¡Subí a 42,5 kg!').waitFor({ timeout: 5000 });
    await p.getByText('La vez pasada: 40 kg × 12, 12, 12').waitFor();
    await esperarValor(p.getByRole('textbox', { name: 'Peso serie 1 de Press militar de pie' }), '42,5');
  } finally {
    await app.cerrar();
  }
});

test('el botón + suma el incremento al peso', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Brazos', [['curl biceps barra', 'Curl de bíceps con barra']]);
    await p.getByRole('article', { name: 'Brazos' }).getByRole('button', { name: /Empezar/ }).click();
    await p.getByRole('textbox', { name: 'Peso serie 1 de Curl de bíceps con barra' }).fill('20');
    await p.getByRole('button', { name: 'Sumar Peso serie 1 de Curl de bíceps con barra' }).click();
    await esperarValor(p.getByRole('textbox', { name: 'Peso serie 1 de Curl de bíceps con barra' }), '22,5');
  } finally {
    await app.cerrar();
  }
});

test('eliminar una rutina la saca de la lista', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    await crearRutina(p, 'Vieja', [['remo barra', 'Remo con barra']]);
    await p.getByRole('article', { name: 'Vieja' }).getByRole('link', { name: 'Editar' }).click();
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: 'Eliminar rutina' }).click();
    await p.getByRole('button', { name: 'Nueva rutina' }).waitFor({ timeout: 5000 });
    assert.equal(await p.getByRole('article', { name: 'Vieja' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});
