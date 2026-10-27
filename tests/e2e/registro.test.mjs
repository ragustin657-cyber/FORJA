import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, cargarPlan } from './ayuda.mjs';

const numero = (s) => Number(s.replace(/\./g, '').replace(',', '.'));
/** kcal consumidas según el total del día ("1.234 de 2.210 kcal"). */
async function consumidas(p) {
  const t = await p.getByTestId('total-registrado').innerText();
  return numero(t.match(/([\d.]+) de [\d.]+ kcal/)[1]);
}

async function abrirHoy(p) {
  await cargarPlan(p);
  await p.getByRole('region', { name: 'Tus números' }).waitFor();
  await p.getByRole('link', { name: 'Registrar lo que comí' }).click();
  await p.getByRole('heading', { name: 'Hoy' }).waitFor();
}

test('"La comí" suma el plato del menú al total del día', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await abrirHoy(p);
    assert.equal(await consumidas(p), 0);
    const almuerzo = p.getByRole('article', { name: 'Almuerzo' });
    const kcal = numero((await almuerzo.getByTestId('kcal-menu').innerText()).replace(' kcal', ''));
    await almuerzo.getByRole('button', { name: 'La comí' }).click();
    await almuerzo.getByRole('button', { name: 'Registrado ✓' }).waitFor();
    assert.equal(await consumidas(p), kcal);
    await p.getByTestId('total-registrado').getByText('de 2.210 kcal', { exact: false }).waitFor();
    // sigue registrado al volver a entrar
    await p.reload();
    await p.getByRole('article', { name: 'Almuerzo' }).getByRole('button', { name: 'Registrado ✓' }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('un doble toque en "La comí" registra una sola vez', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await abrirHoy(p);
    const cena = p.getByRole('article', { name: 'Cena' });
    await cena.getByRole('button', { name: 'La comí' }).dblclick();
    await cena.getByRole('button', { name: 'Registrado ✓' }).waitFor();
    await p.waitForTimeout(300);
    assert.equal(await cena.getByRole('listitem').count(), 1);
  } finally {
    await app.cerrar();
  }
});

test('un segundo toque apenas termina de guardar tampoco duplica', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await abrirHoy(p);
    const cena = p.getByRole('article', { name: 'Cena' });
    await cena.getByRole('button', { name: 'La comí' }).waitFor();
    // Toca, y vuelve a tocar en cuanto el botón se habilita de nuevo.
    await p.evaluate(
      () =>
        new Promise((ok) => {
          const boton = () => [...document.querySelectorAll('article[aria-label="Cena"] button')].find((b) => b.textContent === 'La comí');
          boton().click();
          // En cuanto el botón vuelve a estar habilitado, se toca otra vez.
          const obs = new MutationObserver(() => {
            const b = boton();
            if (b && !b.disabled) { obs.disconnect(); b.click(); ok(); }
          });
          obs.observe(document.querySelector('article[aria-label="Cena"]'), { subtree: true, childList: true, attributes: true });
          setTimeout(() => { obs.disconnect(); ok(); }, 3000);
        }),
    );
    await cena.getByRole('button', { name: 'Registrado ✓' }).waitFor();
    await p.waitForTimeout(300);
    assert.equal(await cena.getByRole('listitem').count(), 1);
  } finally {
    await app.cerrar();
  }
});

test('media porción registra cerca de la mitad, y borrar lo quita del total', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await abrirHoy(p);
    const desayuno = p.getByRole('article', { name: 'Desayuno' });
    const kcal = numero((await desayuno.getByTestId('kcal-menu').innerText()).replace(' kcal', ''));
    await desayuno.getByRole('button', { name: '½', exact: true }).click();
    await desayuno.getByRole('button', { name: 'La comí' }).click();
    await desayuno.getByText('½ porción').waitFor();
    const media = await consumidas(p);
    assert.ok(Math.abs(media - kcal / 2) <= kcal * 0.1, `${media} vs ${kcal}`);
    await desayuno.getByRole('button', { name: /^Borrar / }).click();
    await desayuno.getByRole('button', { name: 'La comí' }).waitFor();
    assert.equal(await consumidas(p), 0);
  } finally {
    await app.cerrar();
  }
});

test('se puede ir al día anterior, y un día sin menú solo deja agregar', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await abrirHoy(p);
    assert.equal(await p.getByRole('button', { name: 'Día siguiente' }).isDisabled(), true);
    await p.getByRole('button', { name: 'Día anterior' }).click();
    await p.getByRole('heading', { name: 'Ayer' }).waitFor();
    await p.goto(p.url().split('#')[0] + '#/nutricion/hoy/2020-01-06');
    await p.getByRole('heading', { name: /6\/1\/2020/ }).waitFor();
    const almuerzo = p.getByRole('article', { name: 'Almuerzo' });
    await almuerzo.getByRole('link', { name: 'Agregar' }).waitFor();
    assert.equal(await p.getByRole('button', { name: 'La comí' }).count(), 0);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

async function irAgregar(p, comida) {
  await cargarPlan(p);
  await p.getByRole('region', { name: 'Tus números' }).waitFor();
  await p.getByRole('link', { name: 'Registrar lo que comí' }).click();
  await p.getByRole('article', { name: comida }).getByRole('link', { name: 'Agregar' }).click();
  await p.getByRole('heading', { name: `Agregar a ${comida.toLowerCase()}` }).waitFor();
}

test('agregar un alimento con gramos lo suma a la comida', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await irAgregar(p, 'Merienda');
    await p.getByRole('tab', { name: 'Alimentos' }).click();
    await p.getByLabel('Buscar').fill('banana');
    await p.getByRole('button', { name: /^Banana/ }).click();
    await p.getByLabel('Gramos').fill('120');
    await p.getByRole('button', { name: 'Agregar', exact: true }).click();
    const merienda = p.getByRole('article', { name: 'Merienda' });
    await merienda.getByText('Banana').waitFor();
    await merienda.getByText('120 g · 107 kcal', { exact: false }).waitFor();
    assert.equal(await consumidas(p), 107);
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('agregar un plato, y después repetirlo desde Recientes', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await irAgregar(p, 'Cena');
    await p.getByRole('tab', { name: 'Platos' }).click();
    await p.getByLabel('Buscar').fill('lentejas');
    await p.getByRole('button', { name: /^Guiso de lentejas/ }).click();
    await p.getByRole('button', { name: 'Agregar', exact: true }).click();
    await p.getByRole('article', { name: 'Cena' }).getByText('Guiso de lentejas').waitFor();
    const despuesCena = await consumidas(p);
    assert.ok(despuesCena > 0);

    await p.getByRole('article', { name: 'Almuerzo' }).getByRole('link', { name: 'Agregar' }).click();
    await p.getByRole('tab', { name: 'Recientes', selected: true }).waitFor();
    await p.getByRole('button', { name: 'Agregar Guiso de lentejas' }).click();
    await p.getByRole('article', { name: 'Almuerzo' }).getByText('Guiso de lentejas').waitFor();
    assert.ok(Math.abs((await consumidas(p)) - despuesCena * 2) <= 1);
  } finally {
    await app.cerrar();
  }
});

test('gramos inválidos no se agregan', async () => {
  const app = await abrirApp();
  const p = app.pagina;
  try {
    p.setDefaultTimeout(5000);
    await irAgregar(p, 'Merienda');
    await p.getByRole('tab', { name: 'Alimentos' }).click();
    await p.getByLabel('Buscar').fill('banana');
    await p.getByRole('button', { name: /^Banana/ }).click();
    await p.getByLabel('Gramos').fill('0');
    assert.equal(await p.getByRole('button', { name: 'Agregar', exact: true }).isDisabled(), true);
  } finally {
    await app.cerrar();
  }
});
