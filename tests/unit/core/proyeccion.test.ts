import { expect, test } from 'bun:test';
import { ajustarCurva, NIVELES, proyectadoEn, proyectar, TASA, valorCurva, type Punto } from '../../../src/core/proyeccion';

const DIA = 86_400_000;
const T0 = new Date(2026, 8, 22, 18).getTime();
const pts = (a: number, b: number, dias: number[]): Punto[] => dias.map((d) => ({ fecha: T0 + d * DIA, e1rm: a + b * Math.log(d + 1) }));
const SEIS = [0, 7, 14, 21, 28, 35];
const ahora = T0 + 35 * DIA;

test('niveles y tasas', () => {
  expect(NIVELES.map((n) => n.id)).toEqual(['principiante', 'intermedio', 'avanzado']);
  expect(TASA).toEqual({ principiante: 0.05, intermedio: 0.02, avanzado: 0.01 });
});

test('ajusta a + b·ln(t+1)', () => {
  const c = ajustarCurva(pts(80, 3, SEIS))!;
  expect(c.a).toBeCloseTo(80, 6);
  expect(c.b).toBeCloseTo(3, 6);
  expect(c.sd).toBeCloseTo(0, 6);
  expect(c.inicio).toBe(T0);
  expect(valorCurva(c, T0 + 35 * DIA)).toBeCloseTo(80 + 3 * Math.log(36), 6);
});

test('puntos desordenados o del mismo día no rompen la curva', () => {
  const p = pts(80, 3, SEIS);
  const c = ajustarCurva([p[3], p[0], p[5], p[1], p[4], p[2], { ...p[2], e1rm: p[2].e1rm }])!;
  expect(Number.isFinite(c.a) && Number.isFinite(c.b) && Number.isFinite(c.sd)).toBe(true);
  expect(c.a).toBeCloseTo(80, 3);
  expect(ajustarCurva(p.slice(0, 1))).toBeNull();
  expect(ajustarCurva([p[0], { ...p[0], e1rm: 90 }])).toBeNull();
});

test('faltan datos: sesiones y días', () => {
  expect(proyectar(pts(80, 3, [0, 5, 10]), ahora, 'intermedio')).toEqual({ estado: 'faltan-datos', faltanSesiones: 1, faltanDias: 11 });
  const mismoDia = [0, 0, 0, 0].map((_, i) => ({ fecha: T0 + i * 1000, e1rm: 80 + i }));
  expect(proyectar(mismoDia, ahora, 'intermedio')).toEqual({ estado: 'faltan-datos', faltanSesiones: 0, faltanDias: 21 });
  expect(proyectar([], ahora, 'intermedio')).toEqual({ estado: 'faltan-datos', faltanSesiones: 4, faltanDias: 21 });
});

test('estable si la curva no sube', () => {
  expect(proyectar(pts(90, 0, SEIS), ahora, 'intermedio')).toEqual({ estado: 'estable', hoy: 90 });
  const r = proyectar(pts(100, -2, SEIS), ahora, 'intermedio');
  expect(r.estado).toBe('estable');
  if (r.estado === 'estable') expect(r.hoy).toBe(93);
});

test('proyección intermedio y avanzado', () => {
  const r = proyectar(pts(80, 3, SEIS), ahora, 'intermedio');
  if (r.estado !== 'ok') throw new Error(r.estado);
  expect(r.hoy).toBe(91);
  expect(r.meses.map((m) => [m.m, m.valor])).toEqual([[1, 92.5], [3, 94.5], [6, 96]]);
  const av = proyectar(pts(80, 3, SEIS), ahora, 'avanzado');
  if (av.estado !== 'ok') throw new Error(av.estado);
  expect(av.meses.map((m) => m.valor)).toEqual([91.5, 93.5, 96]);
});

test('el tope por nivel recorta una curva empinada', () => {
  const r = proyectar(pts(60, 15, SEIS), ahora, 'intermedio');
  if (r.estado !== 'ok') throw new Error(r.estado);
  expect(r.meses.map((m) => m.valor)).toEqual([116, 120.5, 128]);
  expect(proyectadoEn(r, 0)).toBeCloseTo(r.base, 6);
});

test('rango: mínimo 2,5 y crece con los meses', () => {
  const r = proyectar(pts(80, 3, SEIS), ahora, 'intermedio');
  if (r.estado !== 'ok') throw new Error(r.estado);
  expect(r.meses[0]).toEqual({ m: 1, valor: 92.5, min: 90, max: 95 });
  const ruido = pts(80, 3, SEIS).map((p, i) => ({ ...p, e1rm: p.e1rm + (i % 2 ? 4 : -4) }));
  const q = proyectar(ruido, ahora, 'intermedio');
  if (q.estado !== 'ok') throw new Error(q.estado);
  const margen = (m: (typeof q.meses)[number]) => m.max - m.valor;
  expect(margen(q.meses[2])).toBeGreaterThan(margen(q.meses[0]));
  for (const m of q.meses) {
    expect(m.min).toBeGreaterThanOrEqual(q.hoy - margen(m) - 0.5);
    expect((m.min * 2) % 1).toBe(0);
  }
});

test('último entrenamiento hace 90 días: valores finitos y crecientes', () => {
  const r = proyectar(pts(80, 3, SEIS), T0 + 125 * DIA, 'intermedio');
  if (r.estado !== 'ok') throw new Error(r.estado);
  const v = r.meses.map((m) => m.valor);
  expect(v.every((x) => Number.isFinite(x) && x > 0)).toBe(true);
  expect(v[0]).toBeLessThanOrEqual(v[1]);
  expect(v[1]).toBeLessThanOrEqual(v[2]);
});
