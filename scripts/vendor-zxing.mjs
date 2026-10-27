// Genera vendor/zxing.js a partir de un clon de github.com/zxing-js/library (v0.23.0, Apache-2.0).
// Uso: node scripts/vendor-zxing.mjs /ruta/al/clon
// Solo incluye el lector de códigos de productos (1D), que es lo que usa FORJA.
import { build } from 'esbuild';
import { join } from 'node:path';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const clon = process.argv[2];
if (!clon) throw new Error('Falta la ruta al clon de zxing-js/library');
const RAIZ = new URL('..', import.meta.url).pathname;
const tmp = await mkdtemp(join(tmpdir(), 'zx-'));
const entrada = join(tmp, 'entrada.ts');
await writeFile(entrada, `export { default as MultiFormatOneDReader } from '${clon}/src/core/oned/MultiFormatOneDReader';
export { default as DecodeHintType } from '${clon}/src/core/DecodeHintType';
export { default as BarcodeFormat } from '${clon}/src/core/BarcodeFormat';
export { default as RGBLuminanceSource } from '${clon}/src/core/RGBLuminanceSource';
export { default as BinaryBitmap } from '${clon}/src/core/BinaryBitmap';
export { default as HybridBinarizer } from '${clon}/src/core/common/HybridBinarizer';
`);
const shim = {
  name: 'ts-custom-error',
  setup(b) {
    b.onResolve({ filter: /^ts-custom-error$/ }, () => ({ path: 'ts-custom-error', namespace: 'shim' }));
    b.onLoad({ filter: /.*/, namespace: 'shim' }, () => ({
      loader: 'js',
      contents: 'export class CustomError extends Error { constructor(m) { super(m); this.name = new.target.name; Object.setPrototypeOf(this, new.target.prototype); } }',
    }));
  },
};
await build({
  entryPoints: [entrada], bundle: true, minify: true, format: 'esm', target: ['safari15'],
  outfile: join(RAIZ, 'vendor/zxing.js'), plugins: [shim], logLevel: 'warning', legalComments: 'none',
  banner: { js: '// ZXing para JavaScript v0.23.0 — https://github.com/zxing-js/library — Apache License 2.0. Generado por scripts/vendor-zxing.mjs.' },
});
console.log('vendor/zxing.js listo');
