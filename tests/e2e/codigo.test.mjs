import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';
import { abrirApp, cargarPlan, iniciarServidor } from './ayuda.mjs';

const OFF = 'https://world.openfoodfacts.org/**';
const YOGUR = {
  status: 1,
  product: { product_name: 'Yogur bebible frutilla', brands: 'La Serenísima', serving_quantity: 200, nutriments: { 'energy-kcal_100g': 80, proteins_100g: 3, fat_100g: 2, carbohydrates_100g: 12 } },
};

async function irACodigo(p, comida = 'Merienda') {
  await p.getByRole('link', { name: 'Registrar lo que comí' }).click();
  await p.getByRole('article', { name: comida }).getByRole('link', { name: 'Agregar' }).click();
  await p.getByRole('tab', { name: 'Código' }).click();
}

async function preparar(app) {
  const p = app.pagina;
  p.setDefaultTimeout(8000);
  await cargarPlan(p);
  await p.getByRole('region', { name: 'Tus números' }).waitFor();
  await irACodigo(p);
  return p;
}

async function escribirCodigo(p, codigo) {
  await p.getByLabel('Número del código').fill(codigo);
  await p.getByRole('button', { name: 'Buscar' }).click();
}

test('código encontrado en Open Food Facts: se registra y queda guardado para usarlo sin internet', async () => {
  const app = await abrirApp();
  try {
    let pedidos = 0;
    await app.contexto.route(OFF, (r) => {
      pedidos++;
      assert.match(r.request().url(), /\/api\/v2\/product\/7790070411716\?fields=/);
      return r.fulfill({ json: YOGUR });
    });
    const p = await preparar(app);
    await escribirCodigo(p, '7 790070 411716');
    await p.getByText('Yogur bebible frutilla').waitFor();
    await p.getByText('La Serenísima').waitFor();
    assert.equal(await p.getByLabel('Gramos').inputValue(), '200');
    await p.getByLabel('Gramos').fill('30');
    await p.getByRole('button', { name: 'Agregar', exact: true }).click();
    const merienda = p.getByRole('article', { name: 'Merienda' });
    await merienda.getByText('Yogur bebible frutilla').waitFor();
    await merienda.getByText('30 g · 24 kcal', { exact: false }).waitFor();
    assert.equal(pedidos, 1);

    await app.contexto.unroute(OFF);
    await app.contexto.route(OFF, (r) => r.abort());
    await p.getByRole('article', { name: 'Cena' }).getByRole('link', { name: 'Agregar' }).click();
    await p.getByRole('tab', { name: 'Código' }).click();
    await escribirCodigo(p, '7790070411716');
    await p.getByText('Yogur bebible frutilla').waitFor();
    assert.deepEqual(app.errores, []);
  } finally {
    await app.cerrar();
  }
});

test('código no encontrado: se cargan los datos de la etiqueta y se registra', async () => {
  const app = await abrirApp();
  try {
    await app.contexto.route(OFF, (r) => r.fulfill({ json: { status: 0, status_verbose: 'product not found' } }));
    const p = await preparar(app);
    await escribirCodigo(p, '7791234567898');
    await p.getByText('No encontramos este producto').waitFor();
    await p.getByLabel('Nombre').fill('Alfajor de maicena');
    await p.getByLabel('Calorías (kcal)').fill('420');
    await p.getByLabel('Proteínas (g)').fill('5');
    await p.getByLabel('Grasas (g)').fill('18');
    await p.getByLabel('Carbohidratos (g)').fill('200');
    await p.getByLabel('Gramos que comiste').fill('50');
    await p.getByRole('button', { name: 'Guardar y agregar' }).click();
    await p.getByText('Carbohidratos tiene que estar entre 0 y 100 g').waitFor();
    await p.getByLabel('Carbohidratos (g)').fill('60');
    await p.getByRole('button', { name: 'Guardar y agregar' }).click();
    await p.getByRole('article', { name: 'Merienda' }).getByText('50 g · 210 kcal', { exact: false }).waitFor();

    // la próxima vez se encuentra sin preguntar
    await p.getByRole('article', { name: 'Cena' }).getByRole('link', { name: 'Agregar' }).click();
    await p.getByRole('tab', { name: 'Código' }).click();
    await escribirCodigo(p, '7791234567898');
    await p.getByText('Alfajor de maicena').waitFor();
  } finally {
    await app.cerrar();
  }
});

test('sin internet avisa y deja cargar la etiqueta', async () => {
  const app = await abrirApp();
  try {
    await app.contexto.route(OFF, (r) => r.abort('internetdisconnected'));
    const p = await preparar(app);
    await escribirCodigo(p, '7790070411716');
    await p.getByText('No pudimos buscarlo').waitFor();
    await p.getByLabel('Calorías (kcal)').waitFor();
  } finally {
    await app.cerrar();
  }
});

test('un número inválido pide revisarlo, y sin cámara se puede escribir el número', async () => {
  const app = await abrirApp();
  try {
    const p = await preparar(app);
    await p.getByText('No pudimos usar la cámara').waitFor();
    await escribirCodigo(p, '123');
    await p.getByText('Revisá el número').waitFor();
  } finally {
    await app.cerrar();
  }
});

// --- Cámara simulada: un video con un código de barras dibujado ---

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = L.map((c) => c.split('').map((b) => (b === '0' ? '1' : '0')).reverse().join(''));
const R = L.map((c) => c.split('').map((b) => (b === '0' ? '1' : '0')).join(''));
const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Video Y4M (640×480, 10 cuadros) con un EAN-13 en el centro. */
async function videoConCodigo(codigo) {
  const d = codigo.split('').map(Number);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (P[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  bits += '101';
  const W = 640, H = 480, modulo = 4, x0 = (W - bits.length * modulo) / 2;
  const y = Buffer.alloc(W * H, 235);
  for (let fila = 140; fila < 340; fila++) for (let i = 0; i < bits.length; i++) if (bits[i] === '1') y.fill(16, fila * W + x0 + i * modulo, fila * W + x0 + (i + 1) * modulo);
  const uv = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const cuadro = Buffer.concat([Buffer.from('FRAME\n'), y, uv]);
  const archivo = join(await mkdtemp(join(tmpdir(), 'forja-cam-')), 'codigo.y4m');
  await writeFile(archivo, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(cuadro)]));
  return archivo;
}

test('la cámara lee el código y busca el producto', async () => {
  const video = await videoConCodigo('7790070411716');
  const servidor = await iniciarServidor();
  const navegador = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`] });
  try {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['camera'] });
    await contexto.route(OFF, (r) => r.fulfill({ json: YOGUR }));
    const p = await contexto.newPage();
    p.setDefaultTimeout(10000);
    await p.goto(servidor.url);
    await cargarPlan(p);
    await p.getByRole('region', { name: 'Tus números' }).waitFor();
    await irACodigo(p);
    await p.getByText('Yogur bebible frutilla').waitFor();
    assert.equal(await p.locator('video').count(), 0);
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
});
