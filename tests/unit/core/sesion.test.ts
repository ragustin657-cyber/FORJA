import { expect, test } from 'bun:test';
import { crearSesion, reducirSesion, resumenSeries, textoSugerencia } from '../../../src/core/sesion';
import type { DiaRutina, Rutina, SerieRegistrada } from '../../../src/data/tipos';

const dia: DiaRutina = {
  id: 'd1',
  nombre: 'Día A',
  ejercicios: [
    { ejercicioId: 'press', series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 },
    { ejercicioId: 'remo', series: 2, repsMin: 6, repsMax: 10, descansoSeg: 120 },
  ],
};
const rutina: Rutina = { id: 'r1', nombre: 'Rutina', origen: 'manual', archivado: false, creada: 1, dias: [dia] };
const s = (ejercicioId: string, numero: number, peso: number, reps: number, completada = true): SerieRegistrada => ({ ejercicioId, numero, peso, reps, completada });

test('crearSesion precarga el peso sugerido y las reps de la última vez', () => {
  const sesion = crearSesion(rutina, dia, { press: { peso: 62.5, motivo: 'subir' }, remo: { peso: 50, motivo: 'mantener' } }, { press: [s('press', 1, 60, 12), s('press', 2, 60, 11)] }, 1000, 'id1');
  expect(sesion).toMatchObject({ id: 'id1', rutinaId: 'r1', diaId: 'd1', inicio: 1000, fin: null });
  expect(sesion.series.filter((x) => x.ejercicioId === 'press')).toEqual([
    { ejercicioId: 'press', numero: 1, peso: 62.5, reps: 12, completada: false },
    { ejercicioId: 'press', numero: 2, peso: 62.5, reps: 11, completada: false },
    { ejercicioId: 'press', numero: 3, peso: 62.5, reps: 12, completada: false },
  ]);
  expect(sesion.series.filter((x) => x.ejercicioId === 'remo').map((x) => x.reps)).toEqual([10, 10]);
});

test('crearSesion con primera vez deja el peso vacío', () => {
  const sesion = crearSesion(rutina, dia, {}, {}, 1, 'x');
  expect(sesion.series.every((x) => x.peso === 0 && !x.completada)).toBe(true);
});

const base = () => crearSesion(rutina, dia, { press: { peso: 60, motivo: 'mantener' } }, {}, 1, 'x');

test('completar con peso 0 no marca la serie', () => {
  const sesion = reducirSesion(base(), { tipo: 'completar', ejercicioId: 'remo', numero: 1 });
  expect(sesion.series.find((x) => x.ejercicioId === 'remo' && x.numero === 1)?.completada).toBe(false);
});

test('completar con reps vacías no marca la serie', () => {
  let sesion = reducirSesion(base(), { tipo: 'cambiar', ejercicioId: 'press', numero: 1, campo: 'reps', valor: null });
  sesion = reducirSesion(sesion, { tipo: 'completar', ejercicioId: 'press', numero: 1 });
  expect(sesion.series[0].completada).toBe(false);
});

test('cambiar y completar actualiza solo esa serie', () => {
  let sesion = reducirSesion(base(), { tipo: 'cambiar', ejercicioId: 'press', numero: 2, campo: 'peso', valor: 62.5 });
  sesion = reducirSesion(sesion, { tipo: 'completar', ejercicioId: 'press', numero: 2 });
  const press = sesion.series.filter((x) => x.ejercicioId === 'press');
  expect(press.map((x) => [x.peso, x.completada])).toEqual([[60, false], [62.5, true], [60, false]]);
});

test('descompletar desmarca la serie', () => {
  let sesion = reducirSesion(base(), { tipo: 'completar', ejercicioId: 'press', numero: 1 });
  sesion = reducirSesion(sesion, { tipo: 'descompletar', ejercicioId: 'press', numero: 1 });
  expect(sesion.series[0].completada).toBe(false);
});

test('cambiar a un valor vacío o negativo guarda 0', () => {
  let sesion = reducirSesion(base(), { tipo: 'cambiar', ejercicioId: 'press', numero: 1, campo: 'peso', valor: null });
  expect(sesion.series[0].peso).toBe(0);
  sesion = reducirSesion(sesion, { tipo: 'cambiar', ejercicioId: 'press', numero: 1, campo: 'reps', valor: -3 });
  expect(sesion.series[0].reps).toBe(0);
});

test('agregar serie suma una serie al final del ejercicio copiando la anterior', () => {
  const sesion = reducirSesion(base(), { tipo: 'agregar', ejercicioId: 'press' });
  const press = sesion.series.filter((x) => x.ejercicioId === 'press');
  expect(press).toHaveLength(4);
  expect(press[3]).toEqual({ ejercicioId: 'press', numero: 4, peso: 60, reps: 12, completada: false });
});

test('agregar serie a un ejercicio sin series arranca en 1', () => {
  const vacia = { ...base(), series: [] };
  expect(reducirSesion(vacia, { tipo: 'agregar', ejercicioId: 'press' }).series).toEqual([
    { ejercicioId: 'press', numero: 1, peso: 0, reps: 0, completada: false },
  ]);
});

test('resumenSeries muestra peso y reps de las completadas', () => {
  expect(resumenSeries([s('p', 1, 60, 10), s('p', 2, 60, 10), s('p', 3, 60, 9)])).toBe('60 kg × 10, 10, 9');
  expect(resumenSeries([s('p', 1, 60, 10), s('p', 2, 62.5, 8)])).toBe('60 kg × 10 · 62,5 kg × 8');
  expect(resumenSeries([s('p', 1, 60, 10, false)])).toBe('');
});

test('textoSugerencia', () => {
  expect(textoSugerencia({ peso: 62.5, motivo: 'subir' })).toBe('¡Subí a 62,5 kg!');
  expect(textoSugerencia({ peso: 60, motivo: 'mantener' })).toBe('Mantené 60 kg y sumá repeticiones');
  expect(textoSugerencia({ peso: 72.5, motivo: 'bajar' })).toBe('Bajá a 72,5 kg y reconstruí');
  expect(textoSugerencia({ peso: null, motivo: 'primera-vez' })).toBe('Primera vez: elegí un peso cómodo');
});
