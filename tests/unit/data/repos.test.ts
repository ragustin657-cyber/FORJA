import { beforeEach, expect, test } from 'bun:test';
import { usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { ejerciciosRepo } from '../../../src/data/repos/ejercicios';
import { rutinasRepo } from '../../../src/data/repos/rutinas';
import { sesionesRepo } from '../../../src/data/repos/sesiones';
import { ajustesRepo } from '../../../src/data/repos/ajustes';
import type { Ejercicio, Rutina, Sesion } from '../../../src/data/tipos';

export const ejercicio = (id: string, extra: Partial<Ejercicio> = {}): Ejercicio => ({
  id, nombre: `Ejercicio ${id}`, nombreOriginal: id, musculos: ['chest'], equipo: 'barbell', tipo: 'superior',
  imagenes: [], instrucciones: [], favorito: false, propio: false, archivado: false, ...extra,
});
const rutina = (id: string): Rutina => ({
  id, nombre: `Rutina ${id}`, origen: 'manual', archivado: false, creada: 1,
  dias: [{ id: 'd1', nombre: 'Día A', ejercicios: [{ ejercicioId: 'press', series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }] }],
});
const sesion = (id: string, inicio: number, fin: number | null, peso: number): Sesion => ({
  id, rutinaId: 'r1', diaId: 'd1', inicio, fin,
  series: [{ ejercicioId: 'press', numero: 1, peso, reps: 10, completada: true }],
});

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));

test('archivar ejercicio conserva el historial', async () => {
  await ejerciciosRepo.guardar(ejercicio('press'));
  await sesionesRepo.guardar(sesion('s1', 100, 200, 60));
  await ejerciciosRepo.archivar('press');
  expect((await ejerciciosRepo.porId('press'))?.archivado).toBe(true);
  expect(await ejerciciosRepo.todos()).toEqual([]);
  const historial = await sesionesRepo.historialDeEjercicio('press');
  expect(historial).toHaveLength(1);
  expect(historial[0][0].peso).toBe(60);
});

test('alternarFavorito invierte la marca', async () => {
  await ejerciciosRepo.guardar(ejercicio('press'));
  await ejerciciosRepo.alternarFavorito('press');
  expect((await ejerciciosRepo.porId('press'))?.favorito).toBe(true);
  await ejerciciosRepo.alternarFavorito('press');
  expect((await ejerciciosRepo.porId('press'))?.favorito).toBe(false);
  await ejerciciosRepo.alternarFavorito('no-existe');
});

test('sincronizarBiblioteca agrega y actualiza contenido sin pisar favoritos, archivados ni propios', async () => {
  await ejerciciosRepo.sincronizarBiblioteca([ejercicio('a'), ejercicio('b')]);
  await ejerciciosRepo.alternarFavorito('a');
  await ejerciciosRepo.archivar('b');
  await ejerciciosRepo.guardar(ejercicio('mio', { propio: true, nombre: 'Mío' }));
  await ejerciciosRepo.sincronizarBiblioteca([ejercicio('a', { nombre: 'Nombre nuevo' }), ejercicio('b'), ejercicio('c')]);
  const a = await ejerciciosRepo.porId('a');
  expect(a?.nombre).toBe('Nombre nuevo');
  expect(a?.favorito).toBe(true);
  expect((await ejerciciosRepo.porId('b'))?.archivado).toBe(true);
  expect((await ejerciciosRepo.todos()).map((e) => e.id).sort()).toEqual(['a', 'c', 'mio']);
});

test('archivar rutina la saca de activas()', async () => {
  await rutinasRepo.guardar(rutina('r1'));
  await rutinasRepo.guardar(rutina('r2'));
  await rutinasRepo.archivar('r1');
  expect((await rutinasRepo.activas()).map((r) => r.id)).toEqual(['r2']);
  expect((await rutinasRepo.porId('r1'))?.archivado).toBe(true);
  await rutinasRepo.archivar('no-existe');
});

test('historialDeEjercicio ordena por inicio y excluye sesiones en curso', async () => {
  await sesionesRepo.guardar(sesion('s2', 300, 400, 65));
  await sesionesRepo.guardar(sesion('s1', 100, 200, 60));
  await sesionesRepo.guardar(sesion('s3', 500, null, 70));
  const h = await sesionesRepo.historialDeEjercicio('press');
  expect(h.map((s) => s[0].peso)).toEqual([60, 65]);
  expect(await sesionesRepo.historialDeEjercicio('otro')).toEqual([]);
});

test('enCurso devuelve la sesión sin fin', async () => {
  expect(await sesionesRepo.enCurso()).toBeUndefined();
  await sesionesRepo.guardar(sesion('s1', 100, 200, 60));
  await sesionesRepo.guardar(sesion('s2', 300, null, 60));
  expect((await sesionesRepo.enCurso())?.id).toBe('s2');
});

test('finalizar marca el fin de la sesión', async () => {
  await sesionesRepo.guardar(sesion('s1', 100, null, 60));
  await sesionesRepo.finalizar('s1', 999);
  expect((await sesionesRepo.porId('s1'))?.fin).toBe(999);
  expect(await sesionesRepo.enCurso()).toBeUndefined();
  await sesionesRepo.finalizar('no-existe', 1);
});

test('descartar borra una sesión en curso', async () => {
  await sesionesRepo.guardar(sesion('s1', 100, null, 60));
  await sesionesRepo.descartar('s1');
  expect(await sesionesRepo.porId('s1')).toBeUndefined();
});

test('ultimaDeDia devuelve la última sesión terminada de ese día', async () => {
  await sesionesRepo.guardar(sesion('s1', 100, 200, 60));
  await sesionesRepo.guardar(sesion('s2', 300, 400, 65));
  await sesionesRepo.guardar(sesion('s3', 500, null, 70));
  expect((await sesionesRepo.ultimaDeDia('d1'))?.id).toBe('s2');
  expect(await sesionesRepo.ultimaDeDia('otro')).toBeUndefined();
});

test('finalizadas devuelve las sesiones terminadas de la más nueva a la más vieja', async () => {
  await sesionesRepo.guardar(sesion('s1', 100, 200, 60));
  await sesionesRepo.guardar(sesion('s2', 300, 400, 65));
  await sesionesRepo.guardar(sesion('s3', 500, null, 70));
  expect((await sesionesRepo.finalizadas()).map((s) => s.id)).toEqual(['s2', 's1']);
});

test('ajustes trae defaults si no hay nada guardado', async () => {
  expect(await ajustesRepo.obtener()).toEqual({ incrementoKg: 2.5, ultimaCopia: null });
});

test('ajustes guarda cambios parciales', async () => {
  await ajustesRepo.guardar({ incrementoKg: 1 });
  await ajustesRepo.guardar({ ultimaCopia: 123 });
  expect(await ajustesRepo.obtener()).toEqual({ incrementoKg: 1, ultimaCopia: 123 });
});

test('nuevoId genera ids distintos', async () => {
  const { nuevoId } = await import('../../../src/data/db');
  expect(nuevoId()).not.toBe(nuevoId());
});

test('activas ordena de la rutina más vieja a la más nueva', async () => {
  await rutinasRepo.guardar({ ...rutina('nueva'), creada: 20 });
  await rutinasRepo.guardar({ ...rutina('vieja'), creada: 10 });
  expect((await rutinasRepo.activas()).map((r) => r.id)).toEqual(['vieja', 'nueva']);
});
