import { expect, test } from 'bun:test';
import { grasaActual, grasaCorporal, serieDeGrasa } from '../../../../src/core/cuerpo/grasa';

test('hombre: cintura y cuello', () => {
  expect(grasaCorporal('hombre', 180, { cintura: 85, cuello: 38 })).toBe(16.1);
});

test('mujer: cintura, cadera y cuello', () => {
  expect(grasaCorporal('mujer', 165, { cintura: 75, cadera: 100, cuello: 33 })).toBe(29.4);
  expect(grasaCorporal('mujer', 165, { cintura: 75, cuello: 33 })).toBeNull();
});

test('sin datos o con valores imposibles no se estima', () => {
  expect(grasaCorporal('hombre', 180, { cintura: 85 })).toBeNull();
  expect(grasaCorporal('hombre', 180, { cuello: 38 })).toBeNull();
  expect(grasaCorporal('hombre', 180, { cintura: 38, cuello: 38 })).toBeNull();
  expect(grasaCorporal('hombre', 160, { cintura: 200, cuello: 30 })).toBeNull(); // > 60 %
  expect(grasaCorporal('hombre', 200, { cintura: 60, cuello: 45 })).toBeNull(); // < 2 %
});

test('grasaActual usa el último registro que tenga lo necesario', () => {
  const regs = [
    { id: 'a', fecha: 1, cintura: 90, cuello: 38 },
    { id: 'b', fecha: 2, cintura: 85, cuello: 38 },
    { id: 'c', fecha: 3, cintura: 84 },
  ];
  expect(grasaActual('hombre', 180, regs)).toBe(16.1);
  expect(grasaActual('hombre', 180, [])).toBeNull();
  expect(serieDeGrasa('hombre', 180, regs).map((p) => p.fecha)).toEqual([1, 2]);
  expect(serieDeGrasa('hombre', 180, regs)[1].valor).toBe(16.1);
});
