import { expect, test } from 'bun:test';
import { duracion, fechaRelativa, kg, numero } from '../../../src/core/formato';

test('kg usa coma decimal', () => {
  expect(kg(62.5)).toBe('62,5 kg');
  expect(kg(60)).toBe('60 kg');
});

test('numero redondea y usa coma', () => {
  expect(numero(133.333)).toBe('133,3');
  expect(numero(80, 0)).toBe('80');
});

test('fechaRelativa', () => {
  const ahora = new Date(2026, 9, 26, 18, 0).getTime();
  expect(fechaRelativa(new Date(2026, 9, 26, 8, 0).getTime(), ahora)).toBe('hoy');
  expect(fechaRelativa(new Date(2026, 9, 25, 23, 0).getTime(), ahora)).toBe('ayer');
  expect(fechaRelativa(new Date(2026, 9, 22).getTime(), ahora)).toBe('hace 4 días');
  expect(fechaRelativa(new Date(2026, 9, 1).getTime(), ahora)).toMatch(/1/);
  expect(fechaRelativa(Date.now())).toBe('hoy');
});

test('duracion', () => {
  expect(duracion(10_000)).toBe('1 min');
  expect(duracion(45 * 60_000)).toBe('45 min');
  expect(duracion(75 * 60_000)).toBe('1 h 15 min');
});
