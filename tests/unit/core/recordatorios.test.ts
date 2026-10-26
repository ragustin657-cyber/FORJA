import { expect, test } from 'bun:test';
import { necesitaCopia } from '../../../src/core/recordatorios';

const DIA = 86_400_000;

test('muestra el recordatorio si pasaron 31 días', () => {
  expect(necesitaCopia(0, true, 31 * DIA)).toBe(true);
});

test('no lo muestra si la copia es de hace menos de 30 días', () => {
  expect(necesitaCopia(0, true, 29 * DIA)).toBe(false);
});

test('lo muestra si nunca hubo copia y ya hay entrenamientos', () => {
  expect(necesitaCopia(null, true, 0)).toBe(true);
});

test('no lo muestra si todavía no hay nada que guardar', () => {
  expect(necesitaCopia(null, false, 0)).toBe(false);
  expect(necesitaCopia(0, false, 90 * DIA)).toBe(false);
});
