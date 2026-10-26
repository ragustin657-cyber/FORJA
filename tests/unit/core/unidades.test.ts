import { expect, test } from 'bun:test';
import { parsearNumero, redondearPeso } from '../../../src/core/unidades';

test('redondearPeso baja al múltiplo más cercano', () => {
  expect(redondearPeso(61.2)).toBe(60);
});

test('redondearPeso sube al múltiplo más cercano', () => {
  expect(redondearPeso(61.3)).toBe(62.5);
});

test('redondearPeso con incremento de 1 kg', () => {
  expect(redondearPeso(23, 1)).toBe(23);
  expect(redondearPeso(22.6, 1)).toBe(23);
});

test('redondearPeso con incremento de 1,25 kg', () => {
  expect(redondearPeso(72, 1.25)).toBe(72.5);
});

test('parsearNumero acepta coma decimal', () => {
  expect(parsearNumero('62,5')).toBe(62.5);
});

test('parsearNumero acepta punto decimal', () => {
  expect(parsearNumero('62.5')).toBe(62.5);
});

test('parsearNumero ignora espacios', () => {
  expect(parsearNumero(' 80 ')).toBe(80);
});

test('parsearNumero devuelve null si está vacío', () => {
  expect(parsearNumero('')).toBeNull();
  expect(parsearNumero('   ')).toBeNull();
});

test('parsearNumero devuelve null si no es un número', () => {
  expect(parsearNumero('abc')).toBeNull();
  expect(parsearNumero('6,5,2')).toBeNull();
});
