import { expect, test } from 'bun:test';
import { sumarPaso } from '../../../src/core/unidades';

test('Stepper suma el paso', () => {
  expect(sumarPaso(60, 2.5, 1)).toBe(62.5);
});

test('Stepper resta el paso', () => {
  expect(sumarPaso(60, 2.5, -1)).toBe(57.5);
});

test('Stepper nunca baja de min', () => {
  expect(sumarPaso(1, 2.5, -1, 0)).toBe(0);
  expect(sumarPaso(5, 1, -1, 5)).toBe(5);
});

test('Stepper vacío arranca desde min', () => {
  expect(sumarPaso(null, 2.5, 1)).toBe(2.5);
  expect(sumarPaso(null, 2.5, -1)).toBe(0);
});

test('Stepper evita errores de coma flotante', () => {
  expect(sumarPaso(0.1, 0.2, 1)).toBe(0.3);
});
