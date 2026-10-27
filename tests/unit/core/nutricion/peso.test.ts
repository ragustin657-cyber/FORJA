import { expect, test } from 'bun:test';
import { necesitaPesarse, promedioMovil } from '../../../../src/core/nutricion/peso';

const DIA = 86_400_000;
const T0 = new Date(2026, 9, 1, 8).getTime();

test('recordatorio de peso a los 7 días', () => {
  expect(necesitaPesarse(undefined, T0)).toBe(true);
  expect(necesitaPesarse(T0, T0 + 6 * DIA)).toBe(false);
  expect(necesitaPesarse(T0, T0 + 7 * DIA)).toBe(true);
});

test('promedio móvil de los últimos 7 días', () => {
  const pesos = [80, 81, 79, 80, 82, 78, 80, 81].map((kg, i) => ({ fecha: T0 + i * DIA, kg }));
  const m = promedioMovil(pesos);
  expect(m).toHaveLength(8);
  expect(m[0]).toEqual({ fecha: T0, kg: 80 });
  expect(m[1].kg).toBe(80.5);
  expect(m[6].kg).toBeCloseTo(80, 5);
  // el día 7 ya no incluye el día 0: (81+79+80+82+78+80+81)/7
  expect(m[7].kg).toBeCloseTo(561 / 7, 5);
});

test('promedio móvil con huecos usa solo los pesos de la ventana', () => {
  const m = promedioMovil([{ fecha: T0, kg: 80 }, { fecha: T0 + 10 * DIA, kg: 78 }], 7);
  expect(m.map((x) => x.kg)).toEqual([80, 78]);
});

test('promedio móvil ordena por fecha y acepta lista vacía', () => {
  expect(promedioMovil([])).toEqual([]);
  expect(promedioMovil([{ fecha: T0 + DIA, kg: 82 }, { fecha: T0, kg: 80 }]).map((x) => x.kg)).toEqual([80, 81]);
});
