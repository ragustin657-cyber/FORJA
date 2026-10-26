// Genera los íconos PNG de la app a partir de public/icons/icono.svg.
import sharp from '/home/claude/.npm-global/lib/node_modules/sharp/dist/index.mjs';

const DIR = new URL('../public/icons/', import.meta.url).pathname;
const svg = DIR + 'icono.svg';
for (const [nombre, lado] of [['icono-192.png', 192], ['icono-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(svg).resize(lado, lado).png().toFile(DIR + nombre);
}
console.log('Íconos generados');
