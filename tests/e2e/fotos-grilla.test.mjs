import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp } from './ayuda.mjs';

/** Guarda fotos de prueba (JPEG reales) y pesos directo en IndexedDB y recarga. */
async function cargar(p, ids, pesos = []) {
  await p.evaluate(
    async ({ ids, pesos }) => {
      const jpg = async (color) => {
        const c = document.createElement('canvas');
        c.width = 60; c.height = 80;
        const g = c.getContext('2d');
        g.fillStyle = color; g.fillRect(0, 0, 60, 80);
        return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
      };
      const imgs = await Promise.all(ids.map((_, i) => jpg(['#a33', '#3a3', '#33a', '#aa3'][i % 4])));
      await new Promise((ok) => {
        const r = indexedDB.open('forja');
        r.onsuccess = () => {
          const tx = r.result.transaction(['fotos', 'imagenes', 'pesos'], 'readwrite');
          ids.forEach((id, i) => {
            tx.objectStore('fotos').put({ id, fecha: id.slice(0, 10), pose: id.slice(11), creado: i });
            tx.objectStore('imagenes').put({ id, imagen: imgs[i], miniatura: imgs[i] });
          });
          for (const [dia, kg] of pesos) {
            const [a, m, d] = dia.split('-').map(Number);
            tx.objectStore('pesos').put({ id: dia, fecha: new Date(a, m - 1, d, 8).getTime(), kg });
          }
          tx.oncomplete = () => { r.result.close(); ok(); };
        };
      });
    },
    { ids, pesos },
  );
  await p.reload();
}

async function abrir(ruta = '#/progreso') {
  const app = await abrirApp({ ruta });
  app.pagina.setDefaultTimeout(5000);
  await app.pagina.getByRole('region', { name: 'Fotos' }).waitFor().catch(() => undefined);
  return app;
}

test('la grilla muestra las fechas de la más nueva a la más vieja, con huecos', async () => {
  const app = await abrir();
  const p = app.pagina;
  try {
    await cargar(p, ['2026-10-13-frente', '2026-10-13-perfil', '2026-10-27-frente']);
    const fotos = p.getByRole('region', { name: 'Fotos' });
    const fechas = fotos.getByRole('link', { name: /^Fotos del / });
    await fechas.first().waitFor();
    assert.deepEqual(await fechas.evaluateAll((ls) => ls.map((l) => l.getAttribute('aria-label'))), ['Fotos del 27/10/2026', 'Fotos del 13/10/2026']);
    assert.equal(await fotos.getByLabel('Sin foto de espalda').count(), 2);
    await fotos.getByRole('img', { name: 'Perfil del 13/10' }).waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('el detalle de una fecha permite borrar una foto', async () => {
  const app = await abrir();
  const p = app.pagina;
  try {
    await cargar(p, ['2026-10-13-frente', '2026-10-13-perfil']);
    await p.getByRole('link', { name: 'Fotos del 13/10/2026' }).click();
    await p.getByRole('img', { name: 'Perfil del 13/10' }).waitFor();
    await p.getByRole('button', { name: 'Borrar foto de perfil' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Borrar' }).click();
    await p.getByRole('img', { name: 'Perfil del 13/10' }).waitFor({ state: 'detached' });
    await p.getByRole('img', { name: 'Frente del 13/10' }).waitFor();
    await p.getByRole('button', { name: 'Volver' }).click();
    await p.getByRole('region', { name: 'Fotos' }).getByLabel('Sin foto de perfil').waitFor();
  } finally {
    await app.cerrar();
  }
});

test('comparar: primera y última fecha, lado a lado con el peso y con deslizador', async () => {
  const app = await abrir();
  const p = app.pagina;
  try {
    await cargar(p, ['2026-10-01-frente', '2026-10-13-frente', '2026-10-13-perfil', '2026-10-27-frente'], [['2026-10-01', 82], ['2026-10-27', 80.5]]);
    await p.getByRole('region', { name: 'Fotos' }).getByRole('link', { name: 'Comparar' }).click();
    assert.equal(await p.getByLabel('Antes').inputValue(), '2026-10-01');
    assert.equal(await p.getByLabel('Después').inputValue(), '2026-10-27');
    await p.getByText('1/10/2026 · 82 kg').waitFor();
    await p.getByText('27/10/2026 · 80,5 kg').waitFor();
    await p.getByRole('radiogroup', { name: 'Vista' }).getByRole('radio', { name: 'Deslizador' }).click();
    const divisor = p.getByRole('slider', { name: 'Antes y después' });
    assert.equal(await divisor.getAttribute('aria-valuenow'), '50');
    await divisor.focus();
    await p.keyboard.press('ArrowLeft');
    assert.equal(await divisor.getAttribute('aria-valuenow'), '45');
    // si falta la pose en una fecha, se avisa
    await p.getByRole('radiogroup', { name: 'Pose' }).getByRole('radio', { name: 'Perfil' }).click();
    await p.getByText('No hay foto de perfil del 1/10/2026').waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('con una sola fecha no se puede comparar', async () => {
  const app = await abrir();
  const p = app.pagina;
  try {
    await cargar(p, ['2026-10-13-frente']);
    const fotos = p.getByRole('region', { name: 'Fotos' });
    await fotos.getByRole('link', { name: 'Fotos del 13/10/2026' }).waitFor();
    assert.equal(await fotos.getByRole('link', { name: 'Comparar' }).count(), 0);
    assert.equal(await fotos.getByRole('button', { name: 'Comparar' }).isDisabled(), true);
  } finally {
    await app.cerrar();
  }
});

test('Inicio recuerda las fotos; "Ahora no" la oculta y con una foto de hoy no aparece', async () => {
  const app = await abrir('#/');
  const p = app.pagina;
  try {
    const tarjeta = p.getByRole('region', { name: 'Fotos de progreso' });
    await tarjeta.getByText('Sacá tus primeras fotos para ver tu cambio.').waitFor();
    await tarjeta.getByRole('link', { name: 'Medidas' }).waitFor();
    await tarjeta.getByRole('button', { name: 'Ahora no' }).click();
    await tarjeta.waitFor({ state: 'detached' });
    await p.reload();
    await p.getByRole('heading', { name: 'FORJA', exact: true }).waitFor();
    await p.waitForTimeout(300);
    assert.equal(await tarjeta.count(), 0);
  } finally {
    await app.cerrar();
  }
});

test('Inicio no pide fotos si hay una de hace menos de 14 días', async () => {
  const app = await abrir('#/');
  const p = app.pagina;
  try {
    const d = new Date(Date.now() - 3 * 86_400_000);
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await p.getByRole('region', { name: 'Fotos de progreso' }).waitFor();
    await cargar(p, [`${dia}-frente`]);
    await p.getByRole('heading', { name: 'FORJA', exact: true }).waitFor();
    await p.waitForTimeout(300);
    assert.equal(await p.getByRole('region', { name: 'Fotos de progreso' }).count(), 0);
  } finally {
    await app.cerrar();
  }
});
