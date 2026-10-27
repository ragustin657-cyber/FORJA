import { expect, test } from 'bun:test';
import { leerProductoOFF, validarEtiqueta } from '../../../../src/core/nutricion/productos';
import { limpiarCodigo } from '../../../../src/core/codigo';

const respuesta = (nutriments: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  status: 1,
  product: { product_name: 'Yogur bebible frutilla', brands: 'La Serenísima, Danone', nutriments, serving_quantity: 200, ...extra },
});
const completo = { 'energy-kcal_100g': 80, proteins_100g: 3.2, fat_100g: 2.1, carbohydrates_100g: 12.4 };

test('lee una respuesta completa', () => {
  expect(leerProductoOFF('7790070411716', respuesta(completo))).toEqual({
    id: '7790070411716', nombre: 'Yogur bebible frutilla', marca: 'La Serenísima', kcal: 80, proteina: 3.2, grasas: 2.1, carbos: 12.4, porcionG: 200, origen: 'off',
  });
});

test('convierte kJ a kcal si no vienen las kcal', () => {
  const p = leerProductoOFF('1', respuesta({ energy_100g: 418.4, proteins_100g: 1, fat_100g: 1, carbohydrates_100g: 1 }));
  expect(p?.kcal).toBe(100);
});

test('acepta números escritos como texto, con coma o punto', () => {
  const p = leerProductoOFF('1', respuesta({ 'energy-kcal_100g': '12,5', proteins_100g: '1.5', fat_100g: 0, carbohydrates_100g: '2' }));
  expect([p?.kcal, p?.proteina, p?.grasas, p?.carbos]).toEqual([12.5, 1.5, 0, 2]);
});

test('una macro faltante cuenta como 0 si hay kcal y alguna macro', () => {
  const p = leerProductoOFF('1', respuesta({ 'energy-kcal_100g': 30, carbohydrates_100g: 7 }));
  expect([p?.proteina, p?.grasas, p?.carbos]).toEqual([0, 0, 7]);
});

test('sin datos útiles devuelve null', () => {
  expect(leerProductoOFF('1', { status: 0 })).toBeNull();
  expect(leerProductoOFF('1', null)).toBeNull();
  expect(leerProductoOFF('1', 'hola')).toBeNull();
  expect(leerProductoOFF('1', { status: 1 })).toBeNull();
  expect(leerProductoOFF('1', respuesta({}))).toBeNull();
  expect(leerProductoOFF('1', respuesta({ proteins_100g: 3, fat_100g: 1, carbohydrates_100g: 4 }))).toBeNull();
  expect(leerProductoOFF('1', respuesta({ 'energy-kcal_100g': 80 }))).toBeNull();
  expect(leerProductoOFF('1', respuesta({ 'energy-kcal_100g': 'mucho', proteins_100g: 'x', fat_100g: null, carbohydrates_100g: undefined }))).toBeNull();
  expect(leerProductoOFF('1', respuesta({ 'energy-kcal_100g': -5, proteins_100g: 1 }))).toBeNull();
});

test('sin nombre ni marca usa el código; porción inválida se omite', () => {
  const p = leerProductoOFF('7790070411716', respuesta(completo, { product_name: '  ', brands: '', serving_quantity: 'n/a' }));
  expect(p?.nombre).toBe('Producto 7790070411716');
  expect(p && 'marca' in p).toBe(false);
  expect(p && 'porcionG' in p).toBe(false);
});

test('validarEtiqueta', () => {
  const ok = { nombre: 'Galletitas', kcal: 450, proteina: 7, grasas: 18, carbos: 65 };
  expect(validarEtiqueta(ok)).toEqual([]);
  expect(validarEtiqueta({ ...ok, nombre: ' ' })).toEqual(['Poné un nombre']);
  expect(validarEtiqueta({ ...ok, kcal: 950 })).toEqual(['Las calorías tienen que estar entre 0 y 900']);
  expect(validarEtiqueta({ ...ok, kcal: null })).toEqual(['Las calorías tienen que estar entre 0 y 900']);
  expect(validarEtiqueta({ ...ok, proteina: -1 })).toEqual(['Proteínas tiene que estar entre 0 y 100 g']);
  expect(validarEtiqueta({ ...ok, grasas: null })).toEqual(['Grasas tiene que estar entre 0 y 100 g']);
  expect(validarEtiqueta({ ...ok, carbos: 101 })).toEqual(['Carbohidratos tiene que estar entre 0 y 100 g']);
  expect(validarEtiqueta({ ...ok, proteina: 40, grasas: 40, carbos: 30 })).toEqual(['Proteínas, grasas y carbohidratos no pueden sumar más de 100 g']);
});

test('un código con espacios y guiones se limpia', () => {
  expect(limpiarCodigo('779-0070 41171-6')).toBe('7790070411716');
  expect(limpiarCodigo('77900704117')).toBeNull();
});

test('OFF: textos vacíos cuentan como faltantes, no como 0', () => {
  const r = (n: Record<string, unknown>) => leerProductoOFF('1', { status: 1, product: { product_name: 'X', nutriments: n } });
  expect(r({ 'energy-kcal_100g': '', energy_100g: 1500, proteins_100g: 10 })?.kcal).toBe(358.51);
  expect(r({ 'energy-kcal_100g': 300, proteins_100g: ' ', fat_100g: '', carbohydrates_100g: '' })).toBeNull();
});

test('OFF: valores imposibles mandan a la carga manual', () => {
  const r = (n: Record<string, unknown>) => leerProductoOFF('1', { status: 1, product: { product_name: 'X', nutriments: n } });
  expect(r({ 'energy-kcal_100g': 2000, proteins_100g: 10 })).toBeNull();
  expect(r({ 'energy-kcal_100g': 300, proteins_100g: 250 })).toBeNull();
  expect(r({ 'energy-kcal_100g': 300, proteins_100g: 60, fat_100g: 30, carbohydrates_100g: 20 })).toBeNull();
  expect(r({ 'energy-kcal_100g': 900, proteins_100g: 0, fat_100g: 100 })?.kcal).toBe(900);
});
