import { expect, test } from 'bun:test';
import ejerciciosJson from '../../../src/contenido/ejercicios.json';
import patronesJson from '../../../src/contenido/patrones.json';
import { alternativas, estimarMinutos, planRecorte, type ItemTiempo } from '../../../src/core/gimnasio';
import { reducirSesion } from '../../../src/core/sesion';
import type { Patrones } from '../../../src/core/planes';
import type { Sesion } from '../../../src/data/tipos';

const todos = (ejerciciosJson as { id: string; nombre: string; musculos: string[]; equipo: string; tipo: 'superior' | 'inferior'; traducido: boolean }[]).map((e) => ({ ...e, archivado: false }));
const traducidos = new Set(todos.filter((e) => e.traducido).map((e) => e.id));
const patrones = patronesJson as Patrones;

test('alternativas por patrón de movimiento: press de banca → otros empujes horizontales', () => {
  const a = alternativas('Barbell_Bench_Press_-_Medium_Grip', todos, patrones, traducidos, new Set());
  expect(a.length).toBeGreaterThanOrEqual(3);
  expect(a.length).toBeLessThanOrEqual(5);
  expect(a).toContain('Dumbbell_Bench_Press');
  expect(a).not.toContain('Barbell_Bench_Press_-_Medium_Grip');
});

test('no propone ejercicios que ya están en la sesión', () => {
  const a = alternativas('Barbell_Bench_Press_-_Medium_Grip', todos, patrones, traducidos, new Set(['Dumbbell_Bench_Press']));
  expect(a).not.toContain('Dumbbell_Bench_Press');
});

test('sin patrón: mismo músculo y tipo, primero los traducidos', () => {
  const a = alternativas('Barbell_Shrug', todos, patrones, traducidos, new Set());
  expect(a.length).toBeGreaterThanOrEqual(3);
  const porId = new Map(todos.map((e) => [e.id, e]));
  for (const id of a) {
    expect(porId.get(id)!.musculos[0]).toBe('traps');
    expect(porId.get(id)!.tipo).toBe('superior');
  }
  expect(traducidos.has(a[0])).toBe(true);
});

test('un ejercicio archivado o inexistente no rompe', () => {
  expect(alternativas('no-existe', todos, patrones, traducidos, new Set())).toEqual([]);
  const conArchivado = todos.map((e) => (e.id === 'Dumbbell_Bench_Press' ? { ...e, archivado: true } : e));
  expect(alternativas('Barbell_Bench_Press_-_Medium_Grip', conArchivado, patrones, traducidos, new Set())).not.toContain('Dumbbell_Bench_Press');
});

const item = (ejercicioId: string, pendientes: number, basico = false, descansoSeg = 90, completadas = 0): ItemTiempo => ({ ejercicioId, pendientes, completadas, descansoSeg, basico });

test('estimar minutos: 45 s por serie más su descanso', () => {
  expect(estimarMinutos([item('a', 4), item('b', 3, false, 60)])).toBeCloseTo((4 * 135 + 3 * 105) / 60, 6);
  expect(estimarMinutos([item('a', 4)], 60)).toBeCloseTo((4 * 105) / 60, 6);
});

test('recorte: primero saca accesorios del final, dejando al menos 2', () => {
  const items = [item('b1', 4, true), item('b2', 4, true), item('a1', 3), item('a2', 3), item('a3', 3), item('a4', 3)];
  // total = 20 series × 135 s = 45 min
  expect(planRecorte(items, 45).quitar).toEqual([]);
  const r = planRecorte(items, 40);
  expect(r).toMatchObject({ quitar: ['a4'], reducir: [], descansoMaxSeg: null, alcanza: true });
  expect(r.minutos).toBeLessThanOrEqual(40);
});

test('recorte: después deja los accesorios en 2 series, después los saca y por último acorta descansos', () => {
  const items = [item('b1', 4, true), item('b2', 4, true), item('a1', 3), item('a2', 3), item('a3', 3), item('a4', 3)];
  const r30 = planRecorte(items, 30);
  // 8 básicas (18 min) + a1 y a2 en 2 series (4 × 135 s = 9 min) = 27 min
  expect(r30).toMatchObject({ quitar: ['a4', 'a3'], reducir: [{ ejercicioId: 'a1', pendientes: 2 }, { ejercicioId: 'a2', pendientes: 2 }], descansoMaxSeg: null, alcanza: true });
  const r20 = planRecorte(items, 20);
  // sin accesorios: 18 min
  expect(r20).toMatchObject({ quitar: ['a4', 'a3', 'a2', 'a1'], descansoMaxSeg: null, alcanza: true });
  const r15 = planRecorte(items, 15);
  // con descansos de 60 s: 8 × 105 s = 14 min
  expect(r15).toMatchObject({ descansoMaxSeg: 60, alcanza: true });
  const r10 = planRecorte(items, 10);
  expect(r10.alcanza).toBe(false);
});

test('recorte: si ya entra, no cambia nada; las series hechas cuentan para el tope de 2', () => {
  expect(planRecorte([item('b1', 2, true)], 30)).toEqual({ quitar: [], reducir: [], descansoMaxSeg: null, minutos: 4.5, alcanza: true });
  const r = planRecorte([item('b1', 4, true), item('b2', 4, true), item('a1', 2, false, 90, 1), item('a2', 3), item('a3', 3), item('a4', 3)], 25);
  expect(r.reducir).toContainEqual({ ejercicioId: 'a1', pendientes: 1 });
});

const sesion = (): Sesion => ({
  id: 's', rutinaId: 'r', diaId: 'd', inicio: 1, fin: null,
  series: [
    { ejercicioId: 'press', numero: 1, peso: 80, reps: 10, completada: true },
    { ejercicioId: 'press', numero: 2, peso: 80, reps: 10, completada: false },
    { ejercicioId: 'press', numero: 3, peso: 80, reps: 10, completada: false },
    { ejercicioId: 'curl', numero: 1, peso: 12, reps: 12, completada: false },
    { ejercicioId: 'curl', numero: 2, peso: 12, reps: 12, completada: false },
    { ejercicioId: 'curl', numero: 3, peso: 12, reps: 12, completada: false },
  ],
});

test('reemplazar: las series hechas quedan, las pendientes pasan al nuevo con su peso', () => {
  const s = reducirSesion(sesion(), { tipo: 'reemplazar', ejercicioId: 'press', nuevoId: 'mancuernas', peso: 30 });
  expect(s.series.filter((x) => x.ejercicioId === 'press')).toEqual([{ ejercicioId: 'press', numero: 1, peso: 80, reps: 10, completada: true }]);
  expect(s.series.filter((x) => x.ejercicioId === 'mancuernas')).toEqual([
    { ejercicioId: 'mancuernas', numero: 1, peso: 30, reps: 10, completada: false },
    { ejercicioId: 'mancuernas', numero: 2, peso: 30, reps: 10, completada: false },
  ]);
  expect(s.cambios).toEqual([{ de: 'press', a: 'mancuernas' }]);
  expect(s.series.indexOf(s.series.find((x) => x.ejercicioId === 'mancuernas')!)).toBe(1);
  // cambiar de nuevo actualiza el mismo cambio
  const t = reducirSesion(s, { tipo: 'reemplazar', ejercicioId: 'mancuernas', nuevoId: 'maquina', peso: null });
  expect(t.cambios).toEqual([{ de: 'press', a: 'maquina' }]);
  expect(t.series.find((x) => x.ejercicioId === 'maquina')!.peso).toBe(0);
});

test('recortar: saca y reduce series pendientes y guarda el descanso máximo', () => {
  const s = reducirSesion(sesion(), { tipo: 'recortar', quitar: ['curl'], reducir: [{ ejercicioId: 'press', pendientes: 1 }], descansoMaxSeg: 60 });
  expect(s.series.map((x) => `${x.ejercicioId}${x.numero}`)).toEqual(['press1', 'press2']);
  expect(s.descansoMaxSeg).toBe(60);
  expect(reducirSesion(sesion(), { tipo: 'recortar', quitar: [], reducir: [], descansoMaxSeg: null }).descansoMaxSeg).toBeUndefined();
});
