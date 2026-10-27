import { expect, test } from 'bun:test';
import { gruposDePlato, macrosDePlato, platoExcluido, redondearGramos } from '../../../../src/core/nutricion/platos';
import type { Alimento, Plato } from '../../../../src/core/nutricion/tipos';

const a = (id: string, nombre: string, kcal: number, proteina: number, grasas: number, carbos: number, grupos: Alimento['grupos'] = []): Alimento => ({
  id, nombre, kcal, proteina, grasas, carbos, categoria: 'almacen', grupos,
});
const alimentos = new Map(
  [
    a('arroz', 'Arroz blanco', 350, 7, 1, 80),
    a('pollo', 'Pechuga de pollo', 120, 23, 2.6, 0, ['pollo']),
    a('queso', 'Queso cremoso', 300, 20, 24, 1, ['lacteos']),
    a('cebolla', 'Cebolla', 40, 1, 0, 9),
    a('brocoli', 'Brócoli', 40, 2.8, 0.4, 7),
  ].map((x) => [x.id, x]),
);
const plato: Plato = { id: 'p', nombre: 'Pollo con arroz', tipos: ['almuerzo'], ingredientes: [{ alimentoId: 'pollo', gramos: 150 }, { alimentoId: 'arroz', gramos: 60 }], pasos: ['a', 'b'] };

test('redondearGramos a 5 g, o a 1 g si son menos de 20 g', () => {
  expect(redondearGramos(123)).toBe(125);
  expect(redondearGramos(13)).toBe(13);
  expect(redondearGramos(17.6)).toBe(18);
  expect(redondearGramos(21)).toBe(20);
});

test('macros de un plato con factor 1', () => {
  expect(macrosDePlato(plato, alimentos)).toEqual({ kcal: 390, proteina: 38.7, grasas: 4.5, carbos: 48 });
});

test('macros de un plato escalado usan los gramos redondeados', () => {
  // 150 × 1,5 = 225 g de pollo; 60 × 1,5 = 90 g de arroz
  expect(macrosDePlato(plato, alimentos, 1.5)).toEqual({ kcal: 585, proteina: 58.05, grasas: 6.75, carbos: 72 });
  // 150 × 1,23 = 184,5 → 185; 60 × 1,23 = 73,8 → 75
  expect(macrosDePlato(plato, alimentos, 1.23).kcal).toBe(185 * 1.2 + 75 * 3.5);
});

test('los ingredientes desconocidos no suman', () => {
  expect(macrosDePlato({ ...plato, ingredientes: [{ alimentoId: 'nada', gramos: 100 }] }, alimentos).kcal).toBe(0);
});

test('gruposDePlato junta los grupos de sus alimentos', () => {
  const conQueso = { ...plato, ingredientes: [...plato.ingredientes, { alimentoId: 'queso', gramos: 20 }] };
  expect(gruposDePlato(conQueso, alimentos).sort()).toEqual(['lacteos', 'pollo']);
  expect(gruposDePlato({ ...plato, ingredientes: [{ alimentoId: 'nada', gramos: 1 }] }, alimentos)).toEqual([]);
});

test('exclusión por grupo', () => {
  const conQueso = { ...plato, ingredientes: [...plato.ingredientes, { alimentoId: 'queso', gramos: 20 }] };
  expect(platoExcluido(conQueso, alimentos, ['lacteos'], [])).toBe(true);
  expect(platoExcluido(plato, alimentos, ['lacteos'], [])).toBe(false);
});

test('exclusión por texto, sin importar tildes ni mayúsculas', () => {
  const conVerduras = { ...plato, ingredientes: [...plato.ingredientes, { alimentoId: 'cebolla', gramos: 50 }, { alimentoId: 'brocoli', gramos: 80 }] };
  expect(platoExcluido(conVerduras, alimentos, [], ['cebolla'])).toBe(true);
  expect(platoExcluido(conVerduras, alimentos, [], ['  BROCOLI '])).toBe(true);
  expect(platoExcluido(conVerduras, alimentos, [], ['brócoli'])).toBe(true);
  expect(platoExcluido(conVerduras, alimentos, [], ['zanahoria', ''])).toBe(false);
});

test('sin restricciones no excluye nada', () => {
  expect(platoExcluido(plato, alimentos, [], [])).toBe(false);
});

test('"no como" en plural o con mayúsculas excluye igual', () => {
  const conVerduras = { ...plato, ingredientes: [...plato.ingredientes, { alimentoId: 'cebolla', gramos: 50 }] };
  expect(platoExcluido(conVerduras, alimentos, [], ['cebollas'])).toBe(true);
  expect(platoExcluido(conVerduras, alimentos, [], ['Cebollas'])).toBe(true);
});

test('"no como" busca palabras completas', () => {
  const sal = new Map(alimentos);
  sal.set('mani', { id: 'mani', nombre: 'Maní tostado sin sal', kcal: 590, proteina: 26, grasas: 49, carbos: 16, categoria: 'almacen', grupos: [] });
  sal.set('salmon', { id: 'salmon', nombre: 'Salmón rosado', kcal: 197, proteina: 20, grasas: 13, carbos: 0, categoria: 'carniceria', grupos: ['pescado'] });
  const p1 = { ...plato, pasos: ['Mezclar.'], ingredientes: [{ alimentoId: 'mani', gramos: 20 }] };
  const p2 = { ...plato, pasos: ['Mezclar.'], ingredientes: [{ alimentoId: 'salmon', gramos: 100 }] };
  expect(platoExcluido(p1, sal, [], ['sal'])).toBe(false);
  expect(platoExcluido(p2, sal, [], ['sal'])).toBe(false);
});

test('"no como" también mira el nombre del plato y la preparación', () => {
  const p = { ...plato, nombre: 'Pollo al curry', pasos: ['Rehogá el ajo picado.', 'Sumá el curry.'] };
  expect(platoExcluido(p, alimentos, [], ['curry'])).toBe(true);
  expect(platoExcluido(p, alimentos, [], ['ajos'])).toBe(true);
  expect(platoExcluido(p, alimentos, [], ['canela'])).toBe(false);
});

test('el plural funciona con palabras terminadas en e o en consonante', () => {
  const m = new Map(alimentos);
  m.set('tomate', { id: 'tomate', nombre: 'Tomate', kcal: 20, proteina: 0.9, grasas: 0.2, carbos: 3.9, categoria: 'verduleria', grupos: [] });
  m.set('limon', { id: 'limon', nombre: 'Limón', kcal: 38, proteina: 1.1, grasas: 0.3, carbos: 9, categoria: 'verduleria', grupos: [] });
  const p = { ...plato, pasos: ['Mezclar.'], ingredientes: [{ alimentoId: 'tomate', gramos: 100 }, { alimentoId: 'limon', gramos: 10 }] };
  expect(platoExcluido(p, m, [], ['tomates'])).toBe(true);
  expect(platoExcluido(p, m, [], ['limones'])).toBe(true);
  expect(platoExcluido(p, m, [], ['huevos'])).toBe(false);
});
