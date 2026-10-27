import { beforeEach, expect, test } from 'bun:test';
import JSZip from 'jszip';
import { almacen, TABLAS, usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { exportar, restaurar } from '../../../src/data/backup';
import { planesRepo, type Plan } from '../../../src/data/repos/planes';
import { rutinasRepo } from '../../../src/data/repos/rutinas';
import type { Rutina } from '../../../src/data/tipos';

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));
const rutina = (id: string): Rutina => ({ id, nombre: 'Plan', origen: 'plan', dias: [], archivado: false, creada: 1 });
const plan = (id: string, rutinaId: string): Plan => ({ id, rutinaId, objetivo: 'musculo', dias: 4, equipo: 'gimnasio', inicio: '2026-10-26', creado: 1, estado: 'activo' });

test('la tabla de planes existe', () => {
  expect(TABLAS as readonly string[]).toContain('planes');
});

test('crear deja activo el nuevo y corta el anterior; las rutinas quedan', async () => {
  expect(await planesRepo.activo()).toBeUndefined();
  await planesRepo.crear(plan('p1', 'r1'), rutina('r1'));
  expect((await planesRepo.activo())?.id).toBe('p1');
  await planesRepo.crear(plan('p2', 'r2'), rutina('r2'));
  expect((await planesRepo.activo())?.id).toBe('p2');
  expect((await almacen().tabla<Plan>('planes').porId('p1'))?.estado).toBe('cortado');
  expect((await rutinasRepo.activas()).map((r) => r.id)).toEqual(['r1', 'r2']);
});

test('cambiarEstado', async () => {
  await planesRepo.crear(plan('p1', 'r1'), rutina('r1'));
  await planesRepo.cambiarEstado('p1', 'terminado');
  expect(await planesRepo.activo()).toBeUndefined();
  await planesRepo.cambiarEstado('nada', 'terminado');
});

test('si la rutina del plan se borró, el plan queda cortado', async () => {
  await planesRepo.crear(plan('p1', 'r1'), rutina('r1'));
  await rutinasRepo.archivar('r1');
  expect(await planesRepo.activo()).toBeUndefined();
  expect((await almacen().tabla<Plan>('planes').porId('p1'))?.estado).toBe('cortado');
  await planesRepo.crear(plan('p2', 'r2'), rutina('r2'));
  await almacen().tabla('rutinas').borrar('r2');
  expect(await planesRepo.activo()).toBeUndefined();
});

test('la copia incluye los planes, y una copia sin planes no rompe', async () => {
  await planesRepo.crear(plan('p1', 'r1'), rutina('r1'));
  const copia = await exportar({ incluirFotos: false });
  usarAlmacen(crearAlmacenMemoria());
  await restaurar(copia);
  expect((await planesRepo.activo())?.id).toBe('p1');
  const zip = new JSZip();
  zip.file('datos.json', JSON.stringify({ app: 'forja', version: 2, fecha: 1, tablas: { rutinas: [rutina('r1')] } }));
  await restaurar(await zip.generateAsync({ type: 'blob' }));
  expect(await planesRepo.activo()).toBeUndefined();
});

test('si por una copia vieja hubiera dos activos, manda el más nuevo', async () => {
  await rutinasRepo.guardar(rutina('r1'));
  await rutinasRepo.guardar(rutina('r2'));
  await almacen().tabla<Plan>('planes').poner({ ...plan('p1', 'r1'), creado: 1 });
  await almacen().tabla<Plan>('planes').poner({ ...plan('p2', 'r2'), creado: 2 });
  expect((await planesRepo.activo())?.id).toBe('p2');
});
