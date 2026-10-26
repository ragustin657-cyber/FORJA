// Importa la base libre free-exercise-db (dominio público) a FORJA.
// Uso: node scripts/importar-ejercicios.mjs <carpeta-del-repo-clonado>
//   git clone --depth 1 https://github.com/yuhonas/free-exercise-db /ruta/temporal
// Genera src/contenido/ejercicios.json y las imágenes WebP en public/.
// Las imágenes de los ejercicios traducidos van a public/ejercicios/ (se guardan para usar sin internet);
// las del resto van a public/ejercicios-extra/ (se guardan la primera vez que se ven).
import { mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from '/home/claude/.npm-global/lib/node_modules/sharp/dist/index.mjs';

const origen = process.argv[2];
if (!origen) {
  console.error('Falta la carpeta del repo clonado.');
  process.exit(1);
}

const RAIZ = new URL('..', import.meta.url).pathname;
const INFERIOR = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']);
const ANCHO = 360;
const CALIDAD = 65;

const base = JSON.parse(await readFile(join(origen, 'dist/exercises.json'), 'utf8'));
const traducciones = JSON.parse(await readFile(join(RAIZ, 'src/contenido/traducciones-es.json'), 'utf8'));

const faltantes = Object.keys(traducciones).filter((id) => !base.some((e) => e.id === id));
if (faltantes.length) {
  console.error('Traducciones con id inexistente:', faltantes.join(', '));
  process.exit(1);
}

for (const dir of ['ejercicios', 'ejercicios-extra']) await rm(join(RAIZ, 'public', dir), { recursive: true, force: true });

let bytes = 0;
const salida = [];
for (const e of base) {
  const t = traducciones[e.id];
  const carpeta = t ? 'ejercicios' : 'ejercicios-extra';
  const imagenes = [];
  for (let i = 0; i < e.images.length; i++) {
    const destino = join(RAIZ, 'public', carpeta, e.id, `${i}.webp`);
    await mkdir(join(RAIZ, 'public', carpeta, e.id), { recursive: true });
    await sharp(join(origen, 'exercises', e.images[i])).resize({ width: ANCHO, withoutEnlargement: true }).webp({ quality: CALIDAD }).toFile(destino);
    bytes += (await stat(destino)).size;
    imagenes.push(`${carpeta}/${e.id}/${i}.webp`);
  }
  salida.push({
    id: e.id,
    nombre: t?.nombre ?? e.name,
    nombreOriginal: e.name,
    musculos: [...e.primaryMuscles, ...e.secondaryMuscles.filter((m) => !e.primaryMuscles.includes(m))],
    equipo: e.equipment ?? 'other',
    tipo: e.primaryMuscles.some((m) => INFERIOR.has(m)) ? 'inferior' : 'superior',
    imagenes,
    instrucciones: t?.instrucciones ?? e.instructions,
    traducido: Boolean(t),
  });
}

await writeFile(join(RAIZ, 'src/contenido/ejercicios.json'), JSON.stringify(salida));
console.log(`Ejercicios: ${salida.length}, traducidos: ${Object.keys(traducciones).length}, imágenes: ${(bytes / 1e6).toFixed(1)} MB`);
