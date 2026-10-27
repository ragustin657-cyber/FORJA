import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { abrirApp } from './ayuda.mjs';

/** Empaqueta src/ui/imagen.ts como script que expone window.__imagen. */
async function moduloImagen() {
  const r = await build({
    stdin: { contents: "import * as m from './src/ui/imagen'; window.__imagen = m;", resolveDir: new URL('../..', import.meta.url).pathname, loader: 'ts' },
    bundle: true, write: false, format: 'iife',
  });
  return r.outputFiles[0].text;
}

async function preparar() {
  const codigo = await moduloImagen();
  const app = await abrirApp();
  try {
    await app.pagina.addScriptTag({ content: codigo });
  } catch (e) {
    await app.cerrar();
    throw e;
  }
  return app;
}

test('una imagen grande queda en 1600 px y su miniatura en 320 px', async () => {
  const app = await preparar();
  try {
    const r = await app.pagina.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 3000; c.height = 4000;
      c.getContext('2d').fillRect(0, 0, 10, 10);
      const { imagen, miniatura, ancho, alto } = await window.__imagen.procesarImagen(c);
      const a = await createImageBitmap(imagen);
      const b = await createImageBitmap(miniatura);
      return { ancho, alto, img: [a.width, a.height], mini: [b.width, b.height], tipo: imagen.type };
    });
    assert.deepEqual(r, { ancho: 1200, alto: 1600, img: [1200, 1600], mini: [240, 320], tipo: 'image/jpeg' });
  } finally {
    await app.cerrar();
  }
});

test('una foto con orientación EXIF 6 queda vertical', async () => {
  const app = await preparar();
  try {
    const r = await app.pagina.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 300;
      c.getContext('2d').fillRect(0, 0, 400, 300);
      const jpg = new Uint8Array(await (await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9))).arrayBuffer());
      // Segmento APP1 Exif con Orientation (0x0112) = 6, insertado después de SOI.
      const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
      const cuerpo = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
      const app1 = [0xff, 0xe1, (cuerpo.length + 2) >> 8, (cuerpo.length + 2) & 0xff, ...cuerpo];
      const conExif = new Uint8Array([...jpg.slice(0, 2), ...app1, ...jpg.slice(2)]);
      const bmp = await window.__imagen.desdeArchivo(new Blob([conExif], { type: 'image/jpeg' }));
      const { ancho, alto } = await window.__imagen.procesarImagen(bmp);
      return { bmp: [bmp.width, bmp.height], ancho, alto };
    });
    assert.deepEqual(r, { bmp: [300, 400], ancho: 300, alto: 400 });
  } finally {
    await app.cerrar();
  }
});

test('espejar invierte la imagen de izquierda a derecha', async () => {
  const app = await preparar();
  try {
    const r = await app.pagina.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 100;
      const x = c.getContext('2d');
      x.fillStyle = '#ff0000'; x.fillRect(0, 0, 100, 100);
      x.fillStyle = '#0000ff'; x.fillRect(100, 0, 100, 100);
      const color = async (blob) => {
        const b = await createImageBitmap(blob);
        const d = document.createElement('canvas');
        d.width = b.width; d.height = b.height;
        const g = d.getContext('2d');
        g.drawImage(b, 0, 0);
        const [r, , bl] = g.getImageData(10, 50, 1, 1).data;
        return r > bl ? 'rojo' : 'azul';
      };
      const normal = await window.__imagen.procesarImagen(c);
      const espejo = await window.__imagen.procesarImagen(c, { espejar: true });
      return [await color(normal.imagen), await color(espejo.imagen)];
    });
    assert.deepEqual(r, ['rojo', 'azul']);
  } finally {
    await app.cerrar();
  }
});
