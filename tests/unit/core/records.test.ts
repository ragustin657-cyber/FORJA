import { expect, test } from 'bun:test';
import { calcularRecords, detectarRecords, puntosDeProgreso } from '../../../src/core/records';
import type { SerieRegistrada } from '../../../src/data/tipos';

const s = (peso: number, reps: number, completada = true): SerieRegistrada => ({ ejercicioId: 'p', numero: 1, peso, reps, completada });

test('calcularRecords con 60 × 10 y 62,5 × 8', () => {
  const r = calcularRecords([[s(60, 10)], [s(62.5, 8)]]);
  expect(r.mayorPeso).toBe(62.5);
  expect(r.mejorE1rm).toBe(80);
  expect(r.repsPorPeso[60]).toBe(10);
  expect(r.repsPorPeso[62.5]).toBe(8);
});

test('calcularRecords ignora series no completadas', () => {
  const r = calcularRecords([[s(100, 10, false), s(60, 10)]]);
  expect(r.mayorPeso).toBe(60);
  expect(r.repsPorPeso[100]).toBeUndefined();
});

test('calcularRecords sin historial', () => {
  expect(calcularRecords([])).toEqual({ mejorE1rm: null, mayorPeso: null, repsPorPeso: {} });
});

test('calcularRecords con series de más de 15 reps cuenta el peso pero no el e1rm', () => {
  const r = calcularRecords([[s(40, 20)]]);
  expect(r.mayorPeso).toBe(40);
  expect(r.mejorE1rm).toBeNull();
});

test('detectarRecords marca peso cuando supera el mayor peso', () => {
  const previos = calcularRecords([[s(60, 10)]]);
  const nuevos = detectarRecords(previos, [s(62.5, 6)]);
  expect(nuevos).toContainEqual({ tipo: 'peso', valor: 62.5 });
});

test('detectarRecords marca reps con el mismo peso y más repeticiones', () => {
  const previos = calcularRecords([[s(60, 10)]]);
  expect(detectarRecords(previos, [s(60, 11)])).toContainEqual({ tipo: 'reps', valor: 11, peso: 60 });
});

test('detectarRecords marca e1rm cuando mejora la fuerza estimada', () => {
  const previos = calcularRecords([[s(60, 10)]]); // 80
  expect(detectarRecords(previos, [s(60, 12)])).toContainEqual({ tipo: 'e1rm', valor: 84 });
});

test('detectarRecords no repite el mismo récord dos veces en una sesión', () => {
  const previos = calcularRecords([[s(60, 10)]]);
  const nuevos = detectarRecords(previos, [s(62.5, 6), s(65, 5)]);
  expect(nuevos.filter((r) => r.tipo === 'peso')).toEqual([{ tipo: 'peso', valor: 65 }]);
});

test('la primera sesión no cuenta como récord', () => {
  expect(detectarRecords(calcularRecords([]), [s(60, 10)])).toEqual([]);
});

test('igualar no es récord y las series sin completar no cuentan', () => {
  const previos = calcularRecords([[s(60, 10)]]);
  expect(detectarRecords(previos, [s(60, 10), s(100, 10, false)])).toEqual([]);
});

test('reps con un peso nuevo no cuentan como récord de reps', () => {
  const previos = calcularRecords([[s(60, 10)]]);
  expect(detectarRecords(previos, [s(55, 12)]).some((r) => r.tipo === 'reps')).toBe(false);
});

test('puntosDeProgreso devuelve la mejor serie por sesión', () => {
  const sesiones = [
    { fecha: 1, series: [s(60, 10), s(60, 8)] },
    { fecha: 2, series: [s(40, 20)] },
    { fecha: 3, series: [s(62.5, 8)] },
  ];
  expect(puntosDeProgreso(sesiones)).toEqual([
    { fecha: 1, e1rm: 80, peso: 60, reps: 10 },
    { fecha: 3, e1rm: 62.5 * (1 + 8 / 30), peso: 62.5, reps: 8 },
  ]);
});

test('recordsRecientes recorre las sesiones y devuelve los últimos récords, el más nuevo primero', async () => {
  const { recordsRecientes } = await import('../../../src/core/records');
  const ses = (inicio: number, ejercicioId: string, peso: number, reps: number) => ({
    inicio,
    series: [{ ejercicioId, numero: 1, peso, reps, completada: true }],
  });
  const lista = [ses(1, 'a', 60, 10), ses(2, 'b', 100, 5), ses(3, 'a', 62.5, 10), ses(4, 'b', 105, 5), ses(5, 'a', 65, 10)];
  const r = recordsRecientes(lista, 3);
  expect(r.map((x) => [x.fecha, x.ejercicioId])).toEqual([[5, 'a'], [4, 'b'], [3, 'a']]);
  expect(r[0].record).toEqual({ tipo: 'peso', valor: 65 });
});

test('descripcionRecord arma el texto de cada tipo de récord', async () => {
  const { descripcionRecord } = await import('../../../src/core/records');
  expect(descripcionRecord('Press', { tipo: 'peso', valor: 62.5 })).toBe('Press 62,5 kg');
  expect(descripcionRecord('Press', { tipo: 'reps', valor: 11, peso: 60 })).toBe('Press 11 reps con 60 kg');
  expect(descripcionRecord('Press', { tipo: 'e1rm', valor: 84.04 })).toBe('Press: fuerza estimada 84 kg');
});
