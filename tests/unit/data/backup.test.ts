import { beforeEach, expect, test } from 'bun:test';
import JSZip from 'jszip';
import { almacen, TABLAS, usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { ErrorBackup, exportar, leerResumen, restaurar, VERSION_FORMATO } from '../../../src/data/backup';
import { ejerciciosRepo } from '../../../src/data/repos/ejercicios';
import { rutinasRepo } from '../../../src/data/repos/rutinas';
import { sesionesRepo } from '../../../src/data/repos/sesiones';
import { ajustesRepo } from '../../../src/data/repos/ajustes';
import { ejercicio } from '../fabricas';

async function cargarDatos() {
  await ejerciciosRepo.guardar(ejercicio('press', { favorito: true }));
  await rutinasRepo.guardar({ id: 'r1', nombre: 'Rutina', origen: 'manual', archivado: false, creada: 1, dias: [] });
  await sesionesRepo.guardar({ id: 's1', rutinaId: 'r1', diaId: 'd1', inicio: 10, fin: 20, series: [] });
  await sesionesRepo.guardar({ id: 's2', rutinaId: 'r1', diaId: 'd1', inicio: 30, fin: 40, series: [] });
  await ajustesRepo.guardar({ incrementoKg: 1 });
}

async function contenido() {
  const salida: Record<string, unknown[]> = {};
  for (const t of TABLAS) salida[t] = (await almacen().tabla(t).todos()).sort((a, b) => a.id.localeCompare(b.id));
  return salida;
}

async function zipCon(archivos: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();
  for (const [n, c] of Object.entries(archivos)) zip.file(n, c);
  return zip.generateAsync({ type: 'blob' });
}

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));

test('exportar y restaurar es idéntico', async () => {
  await cargarDatos();
  const antes = await contenido();
  const copia = await exportar({ incluirFotos: false });
  usarAlmacen(crearAlmacenMemoria());
  expect((await contenido()).sesiones).toEqual([]);
  await restaurar(copia);
  expect(await contenido()).toEqual(antes);
});

test('leerResumen cuenta sesiones y rutinas', async () => {
  await cargarDatos();
  const resumen = await leerResumen(await exportar({ incluirFotos: true }));
  expect(resumen.sesiones).toBe(2);
  expect(resumen.rutinas).toBe(1);
  expect(resumen.fotos).toBe(0);
  expect(resumen.fecha).toBeGreaterThan(0);
});

async function esperarError(promesa: Promise<unknown>, motivo: string) {
  try {
    await promesa;
  } catch (e) {
    expect(e).toBeInstanceOf(ErrorBackup);
    expect((e as ErrorBackup).motivo).toBe(motivo);
    return;
  }
  throw new Error('se esperaba un error');
}

test('archivo corrupto no borra datos', async () => {
  await cargarDatos();
  const antes = await contenido();
  await esperarError(restaurar(new Blob(['basura'])), 'corrupto');
  expect(await contenido()).toEqual(antes);
});

test('datos.json ilegible cuenta como corrupto', async () => {
  await esperarError(restaurar(await zipCon({ 'datos.json': '{no es json' })), 'corrupto');
});

test('tablas con formato inválido cuentan como corrupto', async () => {
  await esperarError(restaurar(await zipCon({ 'datos.json': JSON.stringify({ app: 'forja', version: 1, fecha: 1, tablas: { sesiones: 'x' } }) })), 'corrupto');
  await esperarError(restaurar(await zipCon({ 'datos.json': JSON.stringify({ app: 'forja', version: 1, fecha: 1, tablas: { sesiones: [{ sin: 'id' }] } }) })), 'corrupto');
});

test('versión mayor rechaza sin tocar los datos', async () => {
  await cargarDatos();
  const antes = await contenido();
  const zip = await zipCon({ 'datos.json': JSON.stringify({ app: 'forja', version: VERSION_FORMATO + 1, fecha: 1, tablas: {} }) });
  await esperarError(restaurar(zip), 'version-nueva');
  expect(await contenido()).toEqual(antes);
});

test('zip sin datos.json no es de FORJA', async () => {
  await esperarError(restaurar(await zipCon({ 'otra.txt': 'hola' })), 'no-es-forja');
});

test('datos.json de otra app no es de FORJA', async () => {
  await esperarError(leerResumen(await zipCon({ 'datos.json': JSON.stringify({ version: 1, tablas: {} }) })), 'no-es-forja');
});

test('tablas que faltan en la copia quedan vacías', async () => {
  await cargarDatos();
  await restaurar(await zipCon({ 'datos.json': JSON.stringify({ app: 'forja', version: 1, fecha: 1, tablas: { rutinas: [] } }) }));
  expect((await contenido()).sesiones).toEqual([]);
});

test('ErrorBackup trae un mensaje en español por motivo', () => {
  expect(new ErrorBackup('corrupto').message).toBe('El archivo está dañado.');
  expect(new ErrorBackup('version-nueva').message).toBe('Esta copia es de una versión más nueva de FORJA. Actualizá la app y probá de nuevo.');
  expect(new ErrorBackup('no-es-forja').message).toBe('Este archivo no es una copia de FORJA.');
});

test('nombreArchivo usa la fecha local', async () => {
  const { nombreArchivo } = await import('../../../src/data/backup');
  expect(nombreArchivo(new Date(2026, 9, 5))).toBe('forja-2026-10-05.zip');
});

// ── Fotos ──
import { cuerpoRepo } from '../../../src/data/repos/cuerpo';
import { tamanoFotos } from '../../../src/data/backup';

const jpg = (t: string) => new Blob([t], { type: 'image/jpeg' });
async function cargarFoto(fecha: string, pose: 'frente' | 'perfil', contenido: string) {
  const id = `${fecha}-${pose}`;
  await cuerpoRepo.guardarFoto({ id, fecha, pose, creado: 1 }, { id, imagen: jpg(contenido), miniatura: jpg(contenido + '-mini') });
}

test('la versión del formato es 2', () => {
  expect(VERSION_FORMATO).toBe(2);
});

test('ida y vuelta con fotos: las imágenes vuelven iguales', async () => {
  await cargarDatos();
  await cargarFoto('2026-10-13', 'frente', 'AAA');
  await cargarFoto('2026-10-27', 'perfil', 'BBB');
  expect(await tamanoFotos()).toBe(3 + 8 + 3 + 8);
  const copia = await exportar({ incluirFotos: true });
  const zip = await JSZip.loadAsync(await copia.arrayBuffer());
  expect(Object.keys(zip.files).filter((n) => n.startsWith('fotos/') && !n.endsWith('/')).sort()).toEqual([
    'fotos/2026-10-13-frente-mini.jpg', 'fotos/2026-10-13-frente.jpg', 'fotos/2026-10-27-perfil-mini.jpg', 'fotos/2026-10-27-perfil.jpg',
  ]);
  const datos = JSON.parse(await zip.file('datos.json')!.async('string'));
  expect(datos.tablas.imagenes).toBeUndefined();
  expect(datos.tablas.fotos.length).toBe(2);
  expect((await leerResumen(copia)).fotos).toBe(2);
  usarAlmacen(crearAlmacenMemoria());
  await restaurar(copia);
  expect((await cuerpoRepo.fotos()).length).toBe(2);
  const img = await cuerpoRepo.imagen('2026-10-27-perfil');
  expect(await img!.imagen.text()).toBe('BBB');
  expect(await img!.miniatura.text()).toBe('BBB-mini');
  expect(img!.imagen.type).toBe('image/jpeg');
});

test('sin fotos: el zip no las lleva y el resumen dice 0', async () => {
  await cargarFoto('2026-10-13', 'frente', 'AAA');
  const copia = await exportar({ incluirFotos: false });
  const zip = await JSZip.loadAsync(await copia.arrayBuffer());
  expect(Object.keys(zip.files).some((n) => n.startsWith('fotos/'))).toBe(false);
  const datos = JSON.parse(await zip.file('datos.json')!.async('string'));
  expect(datos.tablas.fotos).toBeUndefined();
  expect((await leerResumen(copia)).fotos).toBe(0);
});

test('restaurar una copia sin fotos conserva las fotos del iPhone', async () => {
  await cargarDatos();
  const copia = await exportar({ incluirFotos: false });
  await cargarFoto('2026-10-13', 'frente', 'AAA');
  await restaurar(copia);
  expect((await cuerpoRepo.fotos()).map((f) => f.id)).toEqual(['2026-10-13-frente']);
  expect(await (await cuerpoRepo.imagen('2026-10-13-frente'))!.imagen.text()).toBe('AAA');
  expect((await sesionesRepo.finalizadas()).length).toBe(2);
});

test('una copia de la versión 1 se restaura y conserva las fotos', async () => {
  await cargarFoto('2026-10-13', 'frente', 'AAA');
  const v1 = await zipCon({ 'datos.json': JSON.stringify({ app: 'forja', version: 1, fecha: 5, tablas: { sesiones: [{ id: 's9', rutinaId: 'r', diaId: 'd', inicio: 1, fin: 2, series: [] }] } }) });
  expect((await leerResumen(v1)).sesiones).toBe(1);
  await restaurar(v1);
  expect((await sesionesRepo.finalizadas()).map((s) => s.id)).toEqual(['s9']);
  expect((await cuerpoRepo.fotos()).length).toBe(1);
});

test('una foto sin su imagen en el zip se descarta', async () => {
  await cargarFoto('2026-10-13', 'frente', 'AAA');
  await cargarFoto('2026-10-27', 'perfil', 'BBB');
  const zip = await JSZip.loadAsync(await (await exportar({ incluirFotos: true })).arrayBuffer());
  zip.remove('fotos/2026-10-27-perfil.jpg');
  const rota = await zip.generateAsync({ type: 'blob' });
  usarAlmacen(crearAlmacenMemoria());
  await restaurar(rota);
  expect((await cuerpoRepo.fotos()).map((f) => f.id)).toEqual(['2026-10-13-frente']);
});

test('una copia de la versión 3 es de una app más nueva', async () => {
  const v3 = await zipCon({ 'datos.json': JSON.stringify({ app: 'forja', version: 3, fecha: 5, tablas: {} }) });
  await expect(leerResumen(v3)).rejects.toMatchObject({ motivo: 'version-nueva' });
});
