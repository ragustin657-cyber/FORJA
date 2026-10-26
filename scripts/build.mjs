// Construye FORJA en dist/: empaqueta la app, copia public/ y genera el service worker.
import { build } from 'esbuild';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const DIST = join(RAIZ, 'dist');

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

await build({
  entryPoints: [join(RAIZ, 'src/main.tsx')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['safari15'],
  jsx: 'automatic',
  outfile: join(DIST, 'app.js'),
  loader: { '.json': 'json' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});

await cp(join(RAIZ, 'public'), DIST, { recursive: true });
await cp(join(RAIZ, 'index.html'), join(DIST, 'index.html'));

async function listar(dir) {
  const salida = [];
  for (const nombre of await readdir(dir)) {
    const ruta = join(dir, nombre);
    if ((await stat(ruta)).isDirectory()) salida.push(...(await listar(ruta)));
    else salida.push(ruta);
  }
  return salida;
}

const archivos = (await listar(DIST)).map((r) => relative(DIST, r)).filter((r) => r !== 'sw.js').sort();
const hash = createHash('sha256');
for (const a of archivos) hash.update(a).update(await readFile(join(DIST, a)));
const version = hash.digest('hex').slice(0, 12);

const plantilla = await readFile(join(RAIZ, 'scripts/sw-plantilla.js'), 'utf8');
const sw = plantilla
  .replace('__VERSION__', version)
  .replace('__ARCHIVOS__', JSON.stringify(['./', ...archivos.map((a) => './' + a)]));
await writeFile(join(DIST, 'sw.js'), sw);

console.log(`FORJA construida: ${archivos.length} archivos, versión ${version}`);
