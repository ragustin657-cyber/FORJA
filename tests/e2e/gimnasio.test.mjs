import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, crearPlan } from './ayuda.mjs';

const BANCA = 'Press de banca con barra';

async function empezarTorsoA(p, objetivo = 'Ganar músculo') {
  await crearPlan(p, { objetivo });
  await p.getByRole('region', { name: 'Tu plan' }).waitFor();
  await p.getByRole('button', { name: 'Empezar Torso A' }).first().click();
  await p.getByRole('region', { name: BANCA }).waitFor();
}

test('"Cambiar": reemplaza las series pendientes y al terminar ofrece dejarlo en la rutina', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await empezarTorsoA(p);
    await p.getByRole('region', { name: BANCA }).getByRole('button', { name: 'Cambiar' }).click();
    const lista = p.getByRole('dialog', { name: `Alternativas a ${BANCA}` });
    await lista.getByRole('button', { name: 'Usar Press de banca con mancuernas' }).click();
    await lista.waitFor({ state: 'detached' });
    const nuevo = p.getByRole('region', { name: 'Press de banca con mancuernas' });
    await nuevo.waitFor();
    assert.equal(await p.getByRole('region', { name: BANCA }).count(), 0);
    assert.equal(await nuevo.getByRole('button', { name: /^Completar serie/ }).count(), 3);
    // hacer una serie y terminar
    await p.getByRole('textbox', { name: 'Peso serie 1 de Press de banca con mancuernas' }).fill('30');
    await nuevo.getByRole('button', { name: 'Completar serie 1 de Press de banca con mancuernas' }).click();
    await p.getByRole('button', { name: 'Terminar entrenamiento' }).click();
    const cambio = p.getByRole('region', { name: 'Cambios de hoy' });
    await cambio.getByText(`Cambiaste ${BANCA} por Press de banca con mancuernas.`).waitFor();
    await cambio.getByRole('button', { name: 'Dejarlo en la rutina' }).click();
    await cambio.getByText('Listo, tu rutina quedó actualizada.').waitFor();
    await p.goto(p.url().split('#')[0] + '#/entrenar');
    await p.getByRole('button', { name: 'Empezar Torso A' }).first().click();
    await p.getByRole('region', { name: 'Press de banca con mancuernas' }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('"Poco tiempo": muestra la vista previa y recorta los accesorios', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await empezarTorsoA(p, 'Fuerza'); // ~63 min en la semana 1
    const antes = await p.getByRole('region').filter({ has: p.getByRole('button', { name: /^Completar serie/ }) }).count();
    assert.equal(antes, 6);
    await p.getByRole('button', { name: 'Poco tiempo' }).click();
    const panel = p.getByRole('dialog', { name: '¿Cuánto tiempo tenés?' });
    await panel.getByRole('radio', { name: '30 min' }).check({ force: true });
    await panel.getByText(/^Queda en ~\d+ min/).waitFor();
    await panel.getByText(/se saca/).waitFor();
    await panel.getByRole('button', { name: 'Aplicar' }).click();
    await panel.waitFor({ state: 'detached' });
    const despues = await p.getByRole('region').filter({ has: p.getByRole('button', { name: /^Completar serie/ }) }).count();
    assert.ok(despues < antes, `${despues} < ${antes}`);
    await p.getByRole('region', { name: BANCA }).waitFor();
    await p.reload();
    await p.getByRole('region', { name: BANCA }).waitFor();
    assert.equal(await p.getByRole('region').filter({ has: p.getByRole('button', { name: /^Completar serie/ }) }).count(), despues);
  } finally {
    await app.cerrar();
  }
});

test('"Poco tiempo" con tiempo de sobra no cambia nada', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await empezarTorsoA(p);
    await p.getByRole('button', { name: 'Poco tiempo' }).click();
    const panel = p.getByRole('dialog', { name: '¿Cuánto tiempo tenés?' });
    await panel.getByRole('radio', { name: '60 min' }).check({ force: true });
    await panel.getByText(/Te alcanza: queda en ~\d+ min/).waitFor();
    assert.equal(await panel.getByRole('button', { name: 'Aplicar' }).isDisabled(), true);
  } finally {
    await app.cerrar();
  }
});
