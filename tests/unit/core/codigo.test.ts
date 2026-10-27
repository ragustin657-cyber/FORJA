import { expect, test } from 'bun:test';
import { decodificarLuminancia, limpiarCodigo } from '../../../src/core/codigo';

// Codificador EAN-13 mínimo, solo para dibujar el código de prueba.
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = L.map((c) => c.split('').map((b) => (b === '0' ? '1' : '0')).reverse().join(''));
const R = L.map((c) => c.split('').map((b) => (b === '0' ? '1' : '0')).join(''));
const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function dibujarEan13(codigo: string) {
  const d = codigo.split('').map(Number);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (P[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  bits += '101';
  const modulo = 3, margen = 30, ancho = bits.length * modulo + margen * 2, alto = 80;
  const lum = new Uint8ClampedArray(ancho * alto).fill(255);
  for (let y = 0; y < alto; y++) for (let i = 0; i < bits.length; i++) if (bits[i] === '1') for (let k = 0; k < modulo; k++) lum[y * ancho + margen + i * modulo + k] = 0;
  return { lum, ancho, alto };
}

test('lee un EAN-13 dibujado', () => {
  const { lum, ancho, alto } = dibujarEan13('7790070411716');
  expect(decodificarLuminancia(lum, ancho, alto)).toBe('7790070411716');
});

test('una imagen sin código devuelve null', () => {
  expect(decodificarLuminancia(new Uint8ClampedArray(200 * 80).fill(255), 200, 80)).toBeNull();
});

test('limpiarCodigo deja solo dígitos y exige 8, 12 o 13', () => {
  expect(limpiarCodigo('7 790070-411716')).toBe('7790070411716');
  expect(limpiarCodigo(' 12345678 ')).toBe('12345678');
  expect(limpiarCodigo('036000291452')).toBe('036000291452');
  expect(limpiarCodigo('123')).toBeNull();
  expect(limpiarCodigo('77900704117160')).toBeNull();
  expect(limpiarCodigo('')).toBeNull();
});
