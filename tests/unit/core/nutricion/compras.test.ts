import { expect, test } from 'bun:test';
import { listaCompras, textoCantidad } from '../../../../src/core/nutricion/compras';
import { lunesDe } from '../../../../src/core/nutricion/semana';
import type { DiaMenu } from '../../../../src/core/nutricion/menu';
import type { Alimento, Plato } from '../../../../src/core/nutricion/tipos';

const al = (id: string, nombre: string, categoria: Alimento['categoria'], unidad?: Alimento['unidad']): Alimento => ({
  id, nombre, kcal: 100, proteina: 5, grasas: 5, carbos: 10, categoria, grupos: [], ...(unidad ? { unidad } : {}),
});
const alimentos = new Map(
  [
    al('huevo', 'Huevo', 'lacteos', { nombre: 'huevo', plural: 'huevos', gramos: 50 }),
    al('arroz', 'Arroz', 'almacen'),
    al('pollo', 'Pechuga de pollo', 'carniceria'),
    al('tomate', 'Tomate', 'verduleria', { nombre: 'tomate', plural: 'tomates', gramos: 120 }),
    al('pan', 'Pan', 'panaderia'),
    al('whey', 'Proteína', 'otros'),
  ].map((a) => [a.id, a]),
);
const platos = new Map<string, Plato>([
  ['a', { id: 'a', nombre: 'A', tipos: ['almuerzo'], ingredientes: [{ alimentoId: 'pollo', gramos: 300 }, { alimentoId: 'arroz', gramos: 60 }, { alimentoId: 'tomate', gramos: 100 }], pasos: [] }],
  ['b', { id: 'b', nombre: 'B', tipos: ['desayuno'], ingredientes: [{ alimentoId: 'huevo', gramos: 100 }, { alimentoId: 'pan', gramos: 50 }, { alimentoId: 'whey', gramos: 30 }], pasos: [] }],
]);
const menu: DiaMenu[] = [
  { comidas: [{ tipo: 'desayuno', platoId: 'b', factor: 1 }, { tipo: 'almuerzo', platoId: 'a', factor: 1 }] },
  { comidas: [{ tipo: 'desayuno', platoId: 'b', factor: 1.5 }, { tipo: 'almuerzo', platoId: 'a', factor: 2 }, { tipo: 'cena', platoId: null, factor: 0 }] },
];

test('suma un mismo alimento de varios días y agrupa en orden', () => {
  const lista = listaCompras(menu, platos, alimentos);
  expect(lista.map((g) => g.categoria)).toEqual(['verduleria', 'carniceria', 'lacteos', 'panaderia', 'almacen', 'otros']);
  expect(lista.map((g) => g.titulo)).toEqual(['Verdulería', 'Carnicería', 'Lácteos y huevos', 'Panadería', 'Almacén', 'Otros']);
  const pollo = lista.find((g) => g.categoria === 'carniceria')!.items[0];
  expect(pollo).toEqual({ alimentoId: 'pollo', nombre: 'Pechuga de pollo', gramos: 900, texto: '900 g' });
  const huevo = lista.find((g) => g.categoria === 'lacteos')!.items[0];
  expect(huevo.gramos).toBe(250);
  expect(huevo.texto).toBe('5 huevos (250 g)');
});

test('textoCantidad', () => {
  expect(textoCantidad(1200)).toBe('1,2 kg');
  expect(textoCantidad(1000)).toBe('1 kg');
  expect(textoCantidad(250)).toBe('250 g');
  expect(textoCantidad(300, { nombre: 'huevo', plural: 'huevos', gramos: 50 })).toBe('6 huevos (300 g)');
  expect(textoCantidad(310, { nombre: 'huevo', plural: 'huevos', gramos: 50 })).toBe('7 huevos (310 g)');
  expect(textoCantidad(40, { nombre: 'huevo', plural: 'huevos', gramos: 50 })).toBe('1 huevo (40 g)');
  expect(textoCantidad(1500, { nombre: 'taza', plural: 'tazas', gramos: 250 })).toBe('6 tazas (1,5 kg)');
});

test('ignora platos inexistentes y alimentos desconocidos; los ítems van en orden alfabético', () => {
  const raro = new Map(platos);
  raro.set('c', { id: 'c', nombre: 'C', tipos: ['cena'], ingredientes: [{ alimentoId: 'nada', gramos: 10 }, { alimentoId: 'arroz', gramos: 10 }], pasos: [] });
  const lista = listaCompras([{ comidas: [{ tipo: 'cena', platoId: 'c', factor: 1 }, { tipo: 'cena', platoId: 'zz', factor: 1 }] }], raro, alimentos);
  expect(lista).toEqual([{ categoria: 'almacen', titulo: 'Almacén', items: [{ alimentoId: 'arroz', nombre: 'Arroz', gramos: 10, texto: '10 g' }] }]);
  const varios = listaCompras([{ comidas: [{ tipo: 'almuerzo', platoId: 'a', factor: 1 }, { tipo: 'desayuno', platoId: 'b', factor: 1 }] }], platos, alimentos);
  expect(varios.map((g) => g.items.map((i) => i.nombre))).toEqual([['Tomate'], ['Pechuga de pollo'], ['Huevo'], ['Pan'], ['Arroz'], ['Proteína']]);
});

test('lunesDe devuelve el lunes de la semana en hora local', () => {
  expect(lunesDe(new Date(2026, 10, 1, 23, 0))).toBe('2026-10-26');
  expect(lunesDe(new Date(2026, 9, 26, 0, 5))).toBe('2026-10-26');
  expect(lunesDe(new Date(2026, 9, 28))).toBe('2026-10-26');
  expect(lunesDe(new Date(2027, 0, 3))).toBe('2026-12-28');
});

test('dentro de cada grupo los ítems van en orden alfabético', () => {
  const dos = new Map(platos);
  dos.set('d', { id: 'd', nombre: 'D', tipos: ['cena'], ingredientes: [{ alimentoId: 'whey', gramos: 10 }, { alimentoId: 'arroz', gramos: 10 }], pasos: [] });
  const extra = new Map(alimentos);
  extra.set('arroz', { ...alimentos.get('arroz')!, categoria: 'otros' });
  const lista = listaCompras([{ comidas: [{ tipo: 'cena', platoId: 'd', factor: 1 }] }], dos, extra);
  expect(lista[0].items.map((i) => i.nombre)).toEqual(['Arroz', 'Proteína']);
});
