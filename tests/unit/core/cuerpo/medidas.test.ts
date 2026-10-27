import { expect, test } from 'bun:test';
import { combinarMedidas, MEDIDAS, serieDeMedida, ultimasMedidas, validarMedidas, type RegistroMedidas } from '../../../../src/core/cuerpo/medidas';

const reg = (id: string, fecha: number, m: Partial<RegistroMedidas>): RegistroMedidas => ({ id, fecha, ...m });

test('las seis medidas, en orden y con su ayuda', () => {
  expect(MEDIDAS.map((m) => m.id)).toEqual(['cintura', 'pecho', 'brazo', 'pierna', 'cadera', 'cuello']);
  expect(MEDIDAS.every((m) => m.nombre && m.ayuda)).toBe(true);
});

test('validarMedidas acepta coma, punto y espacios', () => {
  expect(validarMedidas({ cintura: '84,5', brazo: ' 36.5 ', pecho: '' })).toEqual({ valores: { cintura: 84.5, brazo: 36.5 }, errores: [] });
});

test('validarMedidas pide al menos una medida', () => {
  expect(validarMedidas({ cintura: '', cuello: '  ' }).errores).toEqual(['Completá al menos una medida.']);
  expect(validarMedidas({}).errores).toEqual(['Completá al menos una medida.']);
});

test('validarMedidas controla los rangos', () => {
  expect(validarMedidas({ cintura: '300' }).errores).toEqual(['La cintura tiene que estar entre 15 y 250 cm.']);
  expect(validarMedidas({ cintura: 'abc' }).errores).toEqual(['La cintura tiene que estar entre 15 y 250 cm.']);
  expect(validarMedidas({ cuello: '80' }).errores).toEqual(['El cuello tiene que estar entre 20 y 70 cm.']);
  expect(validarMedidas({ cuello: '19' }).errores).toEqual(['El cuello tiene que estar entre 20 y 70 cm.']);
  expect(validarMedidas({ pierna: '14' }).errores).toEqual(['La pierna tiene que estar entre 15 y 250 cm.']);
  expect(validarMedidas({ pecho: '15', cadera: '250' }).errores).toEqual([]);
});

test('combinarMedidas: lo nuevo pisa y lo vacío conserva', () => {
  const antes = reg('2026-10-27', 1, { cintura: 85, pecho: 100 });
  expect(combinarMedidas(antes, reg('2026-10-27', 2, { cintura: 84, cuello: 38 }))).toEqual(reg('2026-10-27', 2, { cintura: 84, pecho: 100, cuello: 38 }));
  expect(combinarMedidas(undefined, reg('x', 2, { brazo: 36 }))).toEqual(reg('x', 2, { brazo: 36 }));
});

test('ultimasMedidas compara contra el registro anterior que tenga esa medida', () => {
  const regs = [reg('c', 3, { cintura: 83.5 }), reg('a', 1, { cintura: 85, brazo: 36 }), reg('b', 2, { brazo: 37 })];
  expect(ultimasMedidas(regs)).toEqual({ cintura: { valor: 83.5, diferencia: -1.5 }, brazo: { valor: 37, diferencia: 1 } });
  expect(ultimasMedidas([reg('a', 1, { cuello: 38 })])).toEqual({ cuello: { valor: 38, diferencia: null } });
  expect(ultimasMedidas([])).toEqual({});
});

test('serieDeMedida ordena y omite los registros sin esa medida', () => {
  const regs = [reg('b', 2, { cintura: 84 }), reg('x', 5, { pecho: 99 }), reg('a', 1, { cintura: 85 })];
  expect(serieDeMedida(regs, 'cintura')).toEqual([{ fecha: 1, valor: 85 }, { fecha: 2, valor: 84 }]);
});
