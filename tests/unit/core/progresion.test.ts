import { expect, test } from 'bun:test';
import { e1rm, mejorSerie, sugerirSiguiente, type SerieHecha } from '../../../src/core/progresion';

const serie = (peso: number, reps: number, completada = true): SerieHecha => ({ peso, reps, completada });
const objetivo = { series: 3, repsMin: 8, repsMax: 12 };

test('e1rm con 10 repeticiones', () => {
  expect(e1rm(100, 10)!).toBeCloseTo(133.33, 2);
});

test('e1rm con 1 repetición', () => {
  expect(e1rm(100, 1)!).toBeCloseTo(103.33, 2);
});

test('e1rm acepta hasta 15 repeticiones', () => {
  expect(e1rm(50, 15)).toBe(75);
});

test('e1rm devuelve null fuera de rango', () => {
  expect(e1rm(100, 16)).toBeNull();
  expect(e1rm(100, 0)).toBeNull();
  expect(e1rm(0, 5)).toBeNull();
  expect(e1rm(-10, 5)).toBeNull();
});

test('mejorSerie elige la de mayor e1rm entre las completadas', () => {
  const mejor = mejorSerie([serie(60, 10), serie(70, 6), serie(100, 10, false)]);
  expect(mejor).toEqual(serie(70, 6)); // e1rm: 60×10 = 80, 70×6 = 84
});

test('mejorSerie devuelve null si no hay series válidas', () => {
  expect(mejorSerie([serie(60, 10, false)])).toBeNull();
  expect(mejorSerie([])).toBeNull();
  expect(mejorSerie([serie(60, 20)])).toBeNull();
});

test('subir en tren superior: +2,5 kg', () => {
  const h = [[serie(60, 12), serie(60, 12), serie(60, 12)]];
  expect(sugerirSiguiente(h, objetivo, 'superior')).toEqual({ peso: 62.5, motivo: 'subir' });
});

test('subir en tren inferior: +5 kg', () => {
  const h = [[serie(100, 12), serie(100, 12), serie(100, 12)]];
  expect(sugerirSiguiente(h, objetivo, 'inferior')).toEqual({ peso: 105, motivo: 'subir' });
});

test('mantener si no llegó al tope en todas las series', () => {
  const h = [[serie(60, 12), serie(60, 11), serie(60, 10)]];
  expect(sugerirSiguiente(h, objetivo, 'superior')).toEqual({ peso: 60, motivo: 'mantener' });
});

test('mantener si completó menos series que el objetivo', () => {
  const h = [[serie(60, 12), serie(60, 12), serie(60, 12, false)]];
  expect(sugerirSiguiente(h, objetivo, 'superior')).toEqual({ peso: 60, motivo: 'mantener' });
});

test('bajar 10 % tras dos caídas seguidas', () => {
  const h = [
    [serie(80, 10), serie(80, 10), serie(80, 10)],
    [serie(80, 9), serie(80, 8), serie(80, 8)],
    [serie(80, 7), serie(80, 6), serie(80, 6)],
  ];
  expect(sugerirSiguiente(h, objetivo, 'superior')).toEqual({ peso: 72.5, motivo: 'bajar' });
});

test('una sola caída no baja el peso', () => {
  const h = [
    [serie(80, 10), serie(80, 10), serie(80, 10)],
    [serie(80, 9), serie(80, 8), serie(80, 8)],
  ];
  expect(sugerirSiguiente(h, objetivo, 'superior').motivo).toBe('mantener');
});

test('bajar tiene prioridad sobre subir', () => {
  const h = [
    [serie(80, 14), serie(80, 14), serie(80, 14)],
    [serie(80, 13), serie(80, 13), serie(80, 13)],
    [serie(80, 12), serie(80, 12), serie(80, 12)],
  ];
  expect(sugerirSiguiente(h, objetivo, 'superior').motivo).toBe('bajar');
});

test('primera vez sin historial', () => {
  expect(sugerirSiguiente([], objetivo, 'superior')).toEqual({ peso: null, motivo: 'primera-vez' });
});

test('sesiones sin series completadas se ignoran', () => {
  expect(sugerirSiguiente([[serie(60, 12, false)]], objetivo, 'superior')).toEqual({ peso: null, motivo: 'primera-vez' });
});

test('respeta el incremento configurado', () => {
  const h = [[serie(20, 12), serie(20, 12), serie(20, 12)]];
  expect(sugerirSiguiente(h, objetivo, 'superior', 1.25)).toEqual({ peso: 22.5, motivo: 'subir' });
  expect(sugerirSiguiente([[serie(21, 10)]], objetivo, 'superior', 1)).toEqual({ peso: 21, motivo: 'mantener' });
});

test('usa el peso más alto de la última sesión como base', () => {
  const h = [[serie(50, 12), serie(60, 12), serie(60, 12), serie(60, 12)]];
  expect(sugerirSiguiente(h, objetivo, 'superior')).toEqual({ peso: 62.5, motivo: 'subir' });
});
