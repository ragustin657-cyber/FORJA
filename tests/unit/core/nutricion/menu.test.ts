import { expect, test } from 'bun:test';
import alimentosJson from '../../../../src/contenido/alimentos.json';
import platosJson from '../../../../src/contenido/platos.json';
import { calcularMetas, type Metas } from '../../../../src/core/nutricion/calorias';
import { alternativas, armarMenu, crearAzar, REPARTOS, totalesDia, type Entrada } from '../../../../src/core/nutricion/menu';
import type { Perfil } from '../../../../src/core/nutricion/perfil';
import { platoExcluido } from '../../../../src/core/nutricion/platos';
import type { Alimento, Plato } from '../../../../src/core/nutricion/tipos';

const alimentos = new Map((alimentosJson as Alimento[]).map((a) => [a.id, a]));
const platos = platosJson as Plato[];
const platosPorId = new Map(platos.map((p) => [p.id, p]));
const perfil: Perfil = {
  id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado',
  objetivo: 'bajar', comidas: 4, noComoGrupos: [], noComoTexto: [],
};
const metas = calcularMetas(perfil, 80, new Date(2026, 9, 26));
const entrada = (extra: Partial<Entrada> = {}): Entrada => ({
  platos, alimentos, metas, comidas: 4, noComoGrupos: [], noComoTexto: [], semilla: 42, ...extra,
});

test('crearAzar es reproducible y da valores en [0, 1)', () => {
  const a = crearAzar(7);
  const b = crearAzar(7);
  const xs = Array.from({ length: 50 }, () => a());
  expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
  expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  expect(crearAzar(8)()).not.toBe(xs[0]);
});

test('los repartos suman 100 % y usan los tipos acordados', () => {
  for (const n of [3, 4, 5] as const) expect(REPARTOS[n].reduce((t, r) => t + r.parte, 0)).toBeCloseTo(1, 5);
  expect(REPARTOS[3].map((r) => r.tipo)).toEqual(['desayuno', 'almuerzo', 'cena']);
  expect(REPARTOS[4].map((r) => r.tipo)).toEqual(['desayuno', 'almuerzo', 'merienda', 'cena']);
  expect(REPARTOS[5].map((r) => r.tipo)).toEqual(['desayuno', 'colacion', 'almuerzo', 'merienda', 'cena']);
});

test('la misma semilla arma el mismo menú y otra semilla uno distinto', () => {
  expect(armarMenu(entrada())).toEqual(armarMenu(entrada()));
  expect(armarMenu(entrada({ semilla: 43 }))).not.toEqual(armarMenu(entrada()));
});

test('7 días, cada uno dentro de ±5 % de las calorías', () => {
  for (const semilla of [1, 2, 3, 42, 99]) {
    const menu = armarMenu(entrada({ semilla }));
    expect(menu).toHaveLength(7);
    for (const dia of menu) {
      const kcal = totalesDia(dia, platosPorId, alimentos).kcal;
      expect(Math.abs(kcal - metas.kcal) / metas.kcal, `semilla ${semilla}: ${kcal}`).toBeLessThanOrEqual(0.05);
    }
  }
});

test('ningún plato se repite más de 2 veces en la semana', () => {
  for (const semilla of [1, 2, 3]) {
    const usos = new Map<string, number>();
    for (const d of armarMenu(entrada({ semilla }))) for (const c of d.comidas) if (c.platoId) usos.set(c.platoId, (usos.get(c.platoId) ?? 0) + 1);
    expect(Math.max(...usos.values())).toBeLessThanOrEqual(2);
  }
});

test('los factores quedan entre 0,5 y 2,5 y cada plato es del tipo de su comida', () => {
  for (const d of armarMenu(entrada())) {
    for (const c of d.comidas) {
      expect(c.factor).toBeGreaterThanOrEqual(0.5);
      expect(c.factor).toBeLessThanOrEqual(2.5);
      expect(platosPorId.get(c.platoId!)!.tipos).toContain(c.tipo);
    }
  }
});

test('respeta lo que no comés', () => {
  const menu = armarMenu(entrada({ noComoGrupos: ['vacuna'], noComoTexto: ['cebolla'] }));
  for (const d of menu) for (const c of d.comidas) expect(platoExcluido(platosPorId.get(c.platoId!)!, alimentos, ['vacuna'], ['cebolla'])).toBe(false);
});

test('3 y 5 comidas usan los tipos del reparto', () => {
  expect(armarMenu(entrada({ comidas: 3 }))[0].comidas.map((c) => c.tipo)).toEqual(['desayuno', 'almuerzo', 'cena']);
  expect(armarMenu(entrada({ comidas: 5 }))[0].comidas.map((c) => c.tipo)).toEqual(['desayuno', 'colacion', 'almuerzo', 'merienda', 'cena']);
});

test('si no hay platos posibles, la comida queda vacía sin romper el resto', () => {
  const menu = armarMenu(entrada({ noComoGrupos: ['lacteos', 'huevo', 'gluten'] }));
  expect(menu).toHaveLength(7);
  for (const d of menu) for (const c of d.comidas) if (c.platoId === null) expect(c.factor).toBe(0);
  const sinDesayuno = armarMenu(entrada({ platos: platos.filter((p) => !p.tipos.includes('desayuno')) }));
  expect(sinDesayuno[0].comidas[0]).toEqual({ tipo: 'desayuno', platoId: null, factor: 0 });
  expect(sinDesayuno[0].comidas[1].platoId).not.toBeNull();
});

test('con calorías muy bajas el factor llega a 0,5 sin romperse', () => {
  const bajas: Metas = { ...metas, kcal: 700, proteina: 60 };
  const menu = armarMenu(entrada({ metas: bajas }));
  const kcal = totalesDia(menu[0], platosPorId, alimentos).kcal;
  expect(kcal).toBeGreaterThan(0);
  expect(menu[0].comidas.some((c) => c.factor === 0.5)).toBe(true);
});

test('totalesDia ignora comidas vacías', () => {
  expect(totalesDia({ comidas: [{ tipo: 'cena', platoId: null, factor: 0 }] }, platosPorId, alimentos)).toEqual({ kcal: 0, proteina: 0, grasas: 0, carbos: 0 });
});

test('la proteína diaria queda cerca del objetivo', () => {
  const menu = armarMenu(entrada());
  const promedio = menu.reduce((t, d) => t + totalesDia(d, platosPorId, alimentos).proteina, 0) / 7;
  expect(promedio).toBeGreaterThan(metas.proteina * 0.6);
});

test('alternativas: hasta 5, mismo tipo, sin el actual ni excluidos, ordenadas por cercanía', () => {
  const e = entrada({ noComoGrupos: ['cerdo'] });
  const menu = armarMenu(e);
  const actual = menu[0].comidas[1];
  const alts = alternativas(e, menu, 0, 1);
  expect(alts.length).toBeGreaterThan(0);
  expect(alts.length).toBeLessThanOrEqual(5);
  const objetivo = metas.kcal * 0.3;
  let previa = -1;
  for (const a of alts) {
    const p = platosPorId.get(a.platoId)!;
    expect(p.tipos).toContain('almuerzo');
    expect(a.platoId).not.toBe(actual.platoId);
    expect(platoExcluido(p, alimentos, ['cerdo'], [])).toBe(false);
    const distancia = Math.abs(a.macros.kcal - objetivo);
    expect(distancia).toBeGreaterThanOrEqual(previa - 1e-9);
    previa = distancia;
  }
});

test('reemplazarComida cambia solo esa comida y no modifica el original', async () => {
  const { reemplazarComida } = await import('../../../../src/core/nutricion/menu');
  const menu = armarMenu(entrada());
  const nuevo = reemplazarComida(menu, 2, 1, 'pizza-casera', 1.3);
  expect(nuevo[2].comidas[1]).toEqual({ tipo: menu[2].comidas[1].tipo, platoId: 'pizza-casera', factor: 1.3 });
  expect(nuevo[2].comidas[0]).toEqual(menu[2].comidas[0]);
  expect(nuevo[0]).toEqual(menu[0]);
  expect(menu[2].comidas[1].platoId).not.toBe('pizza-casera');
});

test('excluyendo cualquier grupo solo, la semana no tiene comidas vacías', () => {
  for (const g of ['vacuna', 'cerdo', 'pollo', 'pescado', 'lacteos', 'huevo', 'gluten'] as const) {
    for (const comidas of [3, 4, 5] as const) {
      for (const semilla of [1, 2, 3, 4, 5]) {
        const vacias = armarMenu(entrada({ noComoGrupos: [g], comidas, semilla })).flatMap((d) => d.comidas).filter((c) => c.platoId === null);
        expect(vacias.length, `${g} / ${comidas} comidas / semilla ${semilla}`).toBe(0);
      }
    }
  }
});

test('sin lácteos ni gluten la semana tampoco queda con comidas vacías', () => {
  const vacias = armarMenu(entrada({ noComoGrupos: ['lacteos', 'gluten'] })).flatMap((d) => d.comidas).filter((c) => c.platoId === null);
  expect(vacias.length).toBe(0);
});

test('si se agotaron los platos, se repite uno antes que dejar la comida vacía', () => {
  const pocos = platos.filter((p) => !p.tipos.includes('desayuno')).concat(platos.filter((p) => p.tipos.includes('desayuno')).slice(0, 1));
  const menu = armarMenu(entrada({ platos: pocos }));
  expect(menu.every((d) => d.comidas[0].platoId !== null)).toBe(true);
});
