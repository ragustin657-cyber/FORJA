import { expect, test } from 'bun:test';
import alimentosJson from '../../../src/contenido/alimentos.json';
import platosJson from '../../../src/contenido/platos.json';
import type { Alimento, Grupo, Plato, TipoComida } from '../../../src/core/nutricion/tipos';

const alimentos = alimentosJson as Alimento[];
const platos = platosJson as Plato[];
const porId = new Map(alimentos.map((a) => [a.id, a]));
const GRUPOS: Grupo[] = ['vacuna', 'cerdo', 'pollo', 'pescado', 'lacteos', 'huevo', 'gluten'];
const TIPOS: TipoComida[] = ['desayuno', 'colacion', 'almuerzo', 'merienda', 'cena'];

test('hay unos 120 alimentos y 70 platos', () => {
  expect(alimentos.length).toBeGreaterThanOrEqual(100);
  expect(platos.length).toBeGreaterThanOrEqual(65);
});

test('los ids son únicos', () => {
  expect(new Set(alimentos.map((a) => a.id)).size).toBe(alimentos.length);
  expect(new Set(platos.map((p) => p.id)).size).toBe(platos.length);
});

test('cada ingrediente usa un alimento existente', () => {
  const faltan = platos.flatMap((p) => p.ingredientes.filter((i) => !porId.has(i.alimentoId)).map((i) => `${p.id}: ${i.alimentoId}`));
  expect(faltan).toEqual([]);
});

test('cada plato tiene entre 2 y 4 pasos, al menos un tipo y gramos positivos', () => {
  for (const p of platos) {
    expect(p.pasos.length, p.id).toBeGreaterThanOrEqual(2);
    expect(p.pasos.length, p.id).toBeLessThanOrEqual(4);
    expect(p.tipos.length, p.id).toBeGreaterThan(0);
    expect(p.ingredientes.every((i) => i.gramos > 0), p.id).toBe(true);
  }
});

test('las kcal de cada alimento coinciden con sus macros (±15 %)', () => {
  const mal = alimentos.filter((a) => {
    const calc = 4 * a.proteina + 4 * a.carbos + 9 * a.grasas;
    return a.kcal > 20 && Math.abs(calc - a.kcal) / a.kcal > 0.15;
  });
  expect(mal.map((a) => a.id)).toEqual([]);
});

test('mínimos de platos por tipo de comida', () => {
  const cuenta = (t: TipoComida) => platos.filter((p) => p.tipos.includes(t)).length;
  expect(cuenta('desayuno')).toBeGreaterThanOrEqual(12);
  expect(cuenta('merienda')).toBeGreaterThanOrEqual(12);
  expect(cuenta('colacion')).toBeGreaterThanOrEqual(8);
  expect(cuenta('almuerzo')).toBeGreaterThanOrEqual(20);
  expect(cuenta('cena')).toBeGreaterThanOrEqual(20);
});

test('excluyendo cualquier grupo solo, quedan al menos 3 platos por tipo de comida', () => {
  for (const g of GRUPOS) {
    for (const t of TIPOS) {
      const quedan = platos.filter((p) => p.tipos.includes(t) && !p.ingredientes.some((i) => porId.get(i.alimentoId)?.grupos.includes(g)));
      expect(quedan.length, `${g} / ${t}`).toBeGreaterThanOrEqual(3);
    }
  }
});

test('las unidades tienen gramos positivos', () => {
  expect(alimentos.filter((a) => a.unidad && a.unidad.gramos <= 0)).toEqual([]);
});
