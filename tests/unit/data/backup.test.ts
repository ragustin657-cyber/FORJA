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
