import { expect, test } from 'bun:test';
import { fechaLocal, macrosDeRegistro, porComida, recientes, totales, type Registro } from '../../../../src/core/nutricion/registro';
import type { Alimento, Plato, Producto } from '../../../../src/core/nutricion/tipos';

const arroz: Alimento = { id: 'arroz', nombre: 'Arroz', kcal: 350, proteina: 7, grasas: 1, carbos: 80, categoria: 'almacen', grupos: [] };
const pollo: Alimento = { id: 'pollo', nombre: 'Pollo', kcal: 120, proteina: 23, grasas: 2.6, carbos: 0, categoria: 'carniceria', grupos: ['pollo'] };
const plato: Plato = { id: 'pa', nombre: 'Pollo con arroz', tipos: ['almuerzo'], ingredientes: [{ alimentoId: 'pollo', gramos: 150 }, { alimentoId: 'arroz', gramos: 60 }], pasos: [] };
const yogur: Producto = { id: '7790070411716', nombre: 'Yogur', kcal: 80, proteina: 4, grasas: 2, carbos: 11, origen: 'off' };
const fuentes = {
  platos: new Map([[plato.id, plato]]),
  alimentos: new Map([[arroz.id, arroz], [pollo.id, pollo]]),
  productos: new Map([[yogur.id, yogur]]),
};
const reg = (extra: Partial<Registro>): Registro => ({
  id: 'r', fecha: '2026-10-26', tipo: 'almuerzo', origen: 'plato', refId: 'pa', cantidad: 1, nombre: 'x',
  macros: { kcal: 100, proteina: 10, grasas: 1, carbos: 5 }, creado: 1, ...extra,
});

test('macros de un plato o del menú usan el factor', () => {
  expect(macrosDeRegistro('plato', 'pa', 1.5, fuentes)).toEqual({ kcal: 585, proteina: 58.05, grasas: 6.75, carbos: 72 });
  expect(macrosDeRegistro('menu', 'pa', 1, fuentes)).toEqual({ kcal: 390, proteina: 38.7, grasas: 4.5, carbos: 48 });
});

test('macros de un alimento o producto usan los gramos', () => {
  expect(macrosDeRegistro('alimento', 'arroz', 150, fuentes)).toEqual({ kcal: 525, proteina: 10.5, grasas: 1.5, carbos: 120 });
  expect(macrosDeRegistro('producto', '7790070411716', 30, fuentes)).toEqual({ kcal: 24, proteina: 1.2, grasas: 0.6, carbos: 3.3 });
});

test('una referencia inexistente devuelve null', () => {
  expect(macrosDeRegistro('plato', 'nada', 1, fuentes)).toBeNull();
  expect(macrosDeRegistro('menu', 'nada', 1, fuentes)).toBeNull();
  expect(macrosDeRegistro('alimento', 'nada', 100, fuentes)).toBeNull();
  expect(macrosDeRegistro('producto', 'nada', 100, fuentes)).toBeNull();
});

test('totales suma las macros', () => {
  expect(totales([])).toEqual({ kcal: 0, proteina: 0, grasas: 0, carbos: 0 });
  expect(totales([reg({}), reg({ macros: { kcal: 50.5, proteina: 2.25, grasas: 0, carbos: 1 } })])).toEqual({ kcal: 150.5, proteina: 12.25, grasas: 1, carbos: 6 });
});

test('porComida agrupa e incluye las comidas vacías', () => {
  const r1 = reg({ id: '1', tipo: 'cena' });
  const r2 = reg({ id: '2', tipo: 'almuerzo' });
  const r3 = reg({ id: '3', tipo: 'colacion' });
  const g = porComida([r1, r2, r3], ['desayuno', 'almuerzo', 'cena']);
  expect(Object.keys(g)).toEqual(['desayuno', 'almuerzo', 'cena']);
  expect(g.desayuno).toEqual([]);
  expect(g.almuerzo).toEqual([r2]);
  expect(g.cena).toEqual([r1]);
});

test('recientes: sin duplicados, el más nuevo primero, con límite', () => {
  const lista = [
    reg({ id: '1', origen: 'alimento', refId: 'arroz', creado: 1 }),
    reg({ id: '2', origen: 'plato', refId: 'pa', creado: 2 }),
    reg({ id: '3', origen: 'alimento', refId: 'arroz', creado: 3 }),
    reg({ id: '4', origen: 'menu', refId: 'pa', creado: 4 }),
  ];
  expect(recientes(lista).map((r) => r.id)).toEqual(['4', '3']);
  expect(recientes(lista, 1).map((r) => r.id)).toEqual(['4']);
});

test('recientes trata el plato del menú como plato', () => {
  expect(recientes([reg({ id: '1', origen: 'menu', refId: 'pa', creado: 5 })]).map((r) => [r.id, r.origen])).toEqual([['1', 'plato']]);
});

test('fechaLocal usa la fecha local', () => {
  expect(fechaLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  expect(fechaLocal(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
});
