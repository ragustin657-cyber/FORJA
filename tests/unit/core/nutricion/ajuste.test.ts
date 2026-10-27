import { expect, test } from 'bun:test';
import { proponerAjuste } from '../../../../src/core/nutricion/ajuste';
import { calcularMetas } from '../../../../src/core/nutricion/calorias';
import type { Perfil } from '../../../../src/core/nutricion/perfil';

const DIA = 86_400_000;
const AHORA = new Date(2026, 9, 26, 9).getTime();
const base: Perfil = {
  id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado',
  objetivo: 'mantener', comidas: 4, noComoGrupos: [], noComoTexto: [],
};
/** Pesos diarios de los últimos 29 días: B (días 28..15 atrás) promedia `b`, A (días 13..0 atrás) promedia `a`. */
function pesos(b: number, a: number) {
  const lista = [];
  for (let d = 28; d >= 0; d--) lista.push({ fecha: AHORA - d * DIA, kg: d >= 15 ? b : d <= 13 ? a : (a + b) / 2 });
  return lista;
}
// cambio% = (A − B) / 2 / A × 100
const conCambio = (pct: number) => {
  const a = 80;
  return pesos(a - (2 * pct * a) / 100, a);
};

test('bajar: baja más lento de lo buscado → −150', () => {
  const p = proponerAjuste({ ...base, objetivo: 'bajar', actividad: 'alto' }, conCambio(-0.1), AHORA);
  expect(p).not.toBeNull();
  expect(p !== 'sin-cambios' && p!.delta).toBe(-150);
});

test('bajar: baja demasiado rápido → +150', () => {
  const p = proponerAjuste({ ...base, objetivo: 'bajar' }, conCambio(-1.2), AHORA);
  expect(p !== 'sin-cambios' && p!.delta).toBe(150);
});

test('bajar a buen ritmo → sin cambios', () => {
  expect(proponerAjuste({ ...base, objetivo: 'bajar' }, conCambio(-0.5), AHORA)).toBe('sin-cambios');
});

test('mantener: sube → −150; baja → +150; estable → sin cambios', () => {
  const sube = proponerAjuste(base, conCambio(0.3), AHORA);
  const baja = proponerAjuste(base, conCambio(-0.3), AHORA);
  expect(sube !== 'sin-cambios' && sube!.delta).toBe(-150);
  expect(baja !== 'sin-cambios' && baja!.delta).toBe(150);
  expect(proponerAjuste(base, conCambio(0.1), AHORA)).toBe('sin-cambios');
});

test('ganar: sube demasiado rápido → −150; lento → +150; bien → sin cambios', () => {
  const g = { ...base, objetivo: 'ganar' as const };
  const rapido = proponerAjuste(g, conCambio(0.6), AHORA);
  const lento = proponerAjuste(g, conCambio(0.05), AHORA);
  expect(rapido !== 'sin-cambios' && rapido!.delta).toBe(-150);
  expect(lento !== 'sin-cambios' && lento!.delta).toBe(150);
  expect(proponerAjuste(g, conCambio(0.3), AHORA)).toBe('sin-cambios');
});

test('la propuesta trae calorías antes y después y el ajuste nuevo', () => {
  const p = proponerAjuste(base, conCambio(0.3), AHORA);
  if (!p || p === 'sin-cambios') throw new Error('esperaba propuesta');
  const antes = calcularMetas(base, 80, new Date(AHORA)).kcal;
  expect(p.kcalAntes).toBe(antes);
  expect(p.kcalDespues).toBe(antes - 150);
  expect(p.ajusteNuevo).toBe(-150);
});

test('el motivo explica el cambio en kg por semana', () => {
  const lento = proponerAjuste({ ...base, objetivo: 'bajar', actividad: 'alto' }, pesos(80.16, 80), AHORA);
  if (!lento || lento === 'sin-cambios') throw new Error('esperaba propuesta');
  expect(lento.motivo).toBe('bajaste 0,1 kg por semana, más lento de lo buscado');
  const rapido = proponerAjuste({ ...base, objetivo: 'bajar' }, pesos(82, 80), AHORA);
  if (!rapido || rapido === 'sin-cambios') throw new Error('esperaba propuesta');
  expect(rapido.motivo).toBe('bajaste 1 kg por semana, más rápido de lo recomendable');
  const quieto = proponerAjuste({ ...base, objetivo: 'ganar' }, pesos(80, 80), AHORA);
  if (!quieto || quieto === 'sin-cambios') throw new Error('esperaba propuesta');
  expect(quieto.motivo).toBe('tu peso casi no cambió, más lento de lo buscado');
  const mant = proponerAjuste(base, pesos(79.5, 80), AHORA);
  if (!mant || mant === 'sin-cambios') throw new Error('esperaba propuesta');
  expect(mant.motivo).toBe('subiste 0,2 kg por semana y tu objetivo es mantenerte');
  const sube = proponerAjuste({ ...base, objetivo: 'ganar' }, pesos(79, 80), AHORA);
  if (!sube || sube === 'sin-cambios') throw new Error('esperaba propuesta');
  expect(sube.motivo).toBe('subiste 0,5 kg por semana, más rápido de lo buscado');
});

test('pesos que abarcan menos de 28 días → null', () => {
  expect(proponerAjuste(base, conCambio(0.3).slice(2), AHORA)).toBeNull();
  expect(proponerAjuste(base, [], AHORA)).toBeNull();
});

test('menos de 14 días desde el último chequeo → null', () => {
  expect(proponerAjuste({ ...base, ultimoAjuste: AHORA - 13 * DIA }, conCambio(0.3), AHORA)).toBeNull();
  expect(proponerAjuste({ ...base, ultimoAjuste: AHORA - 14 * DIA }, conCambio(0.3), AHORA)).not.toBeNull();
});

test('con huecos alcanza un peso por quincena; una quincena vacía → null', () => {
  const pocos = [{ fecha: AHORA - 28 * DIA, kg: 79 }, { fecha: AHORA - 20 * DIA, kg: 79 }, { fecha: AHORA - 2 * DIA, kg: 80 }];
  const p = proponerAjuste(base, pocos, AHORA);
  expect(p !== 'sin-cambios' && p!.delta).toBe(-150);
  const sinRecientes = [{ fecha: AHORA - 45 * DIA, kg: 79 }, { fecha: AHORA - 30 * DIA, kg: 80 }, { fecha: AHORA - 16 * DIA, kg: 80 }];
  expect(proponerAjuste(base, sinRecientes, AHORA)).toBeNull();
  const sinViejos = [{ fecha: AHORA - 60 * DIA, kg: 79 }, { fecha: AHORA - 5 * DIA, kg: 80 }];
  expect(proponerAjuste(base, sinViejos, AHORA)).toBeNull();
});

test('si el piso no deja bajar las calorías → sin cambios', () => {
  // mujer chica y sedentaria que quiere bajar: ya está en el piso de 1.200
  const chica: Perfil = { ...base, sexo: 'mujer', alturaCm: 150, nacimiento: '1960-01-01', actividad: 'sedentario', objetivo: 'bajar' };
  expect(proponerAjuste(chica, pesos(50, 50), AHORA)).toBe('sin-cambios');
});

test('si el piso limita el ajuste, el ajuste nuevo es el que realmente se aplica', () => {
  // 80 kg bajando con −300: 1.910 kcal; el tope del 1 % por semana deja bajar hasta 1.880
  const p = proponerAjuste({ ...base, objetivo: 'bajar', ajusteKcal: -300 }, pesos(80, 80), AHORA);
  if (!p || p === 'sin-cambios') throw new Error('esperaba propuesta');
  expect([p.kcalAntes, p.kcalDespues, p.ajusteNuevo]).toEqual([1910, 1880, -330]);
  // y el ejemplo del diseño: de 2.210 a 2.060
  const q = proponerAjuste({ ...base, objetivo: 'bajar' }, pesos(80, 80), AHORA);
  if (!q || q === 'sin-cambios') throw new Error('esperaba propuesta');
  expect([q.kcalAntes, q.kcalDespues, q.ajusteNuevo]).toEqual([2210, 2060, -150]);
});
