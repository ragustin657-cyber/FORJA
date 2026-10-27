import { expect, test } from 'bun:test';
import { avance, faltaKg, fechaMeta, objetivoMeta, textoMeta, validarMeta } from '../../../src/core/metas';
import { e1rm } from '../../../src/core/progresion';
import { proyectadoEn, proyectar, type Punto } from '../../../src/core/proyeccion';

const DIA = 86_400_000;
const T0 = new Date(2026, 8, 22, 18).getTime();
const ahora = T0 + 35 * DIA;
const pts = (a: number, b: number): Punto[] => [0, 7, 14, 21, 28, 35].map((d) => ({ fecha: T0 + d * DIA, e1rm: a + b * Math.log(d + 1) }));
const empinada = proyectar(pts(60, 15), ahora, 'intermedio');
const HOY = new Date(2026, 9, 27, 12).getTime();

test('validarMeta', () => {
  expect(validarMeta('100,5', '1')).toEqual({ valores: { peso: 100.5, reps: 1 }, errores: [] });
  expect(validarMeta('80', '')).toEqual({ valores: { peso: 80, reps: 1 }, errores: [] });
  expect(validarMeta('', '1').errores).toEqual(['El peso tiene que estar entre 1 y 500 kg.']);
  expect(validarMeta('600', '1').errores).toEqual(['El peso tiene que estar entre 1 y 500 kg.']);
  for (const r of ['0', '20', '5,5', 'x']) expect(validarMeta('80', r).errores).toEqual(['Las repeticiones tienen que ser un número entero de 1 a 15.']);
  expect(validarMeta('80', '5,5').valores).toBeUndefined();
});

test('objetivo, avance y lo que falta', () => {
  // a 1 repetición la meta es el peso tal cual (Epley lo inflaría a 103,3)
  expect(objetivoMeta({ peso: 100, reps: 1 })).toBe(100);
  expect(faltaKg(132, objetivoMeta({ peso: 140, reps: 1 }))).toBe(8);
  expect(objetivoMeta({ peso: 80, reps: 5 })).toBe(e1rm(80, 5)!);
  expect(avance(null, 100)).toBe(0);
  expect(avance(88, 100)).toBeCloseTo(0.88, 6);
  expect(avance(120, 100)).toBe(1);
  expect(faltaKg(88, 100)).toBe(12);
  expect(faltaKg(87.8, 100)).toBe(12);
  expect(faltaKg(120, 100)).toBe(0);
  expect(faltaKg(null, 100)).toBe(100);
});

test('fechaMeta: lograda, sin estimar, fecha, pronto y más de 2 años', () => {
  expect(fechaMeta(empinada, 100, 110)).toEqual({ tipo: 'lograda' });
  expect(fechaMeta({ estado: 'faltan-datos', faltanSesiones: 1, faltanDias: 0 }, 100, 90)).toEqual({ tipo: 'sin-estimar', motivo: 'faltan-datos' });
  expect(fechaMeta({ estado: 'estable', hoy: 90 }, 100, 90)).toEqual({ tipo: 'sin-estimar', motivo: 'estable' });
  if (empinada.estado !== 'ok') throw new Error();
  const e = fechaMeta(empinada, 120, 110);
  expect(e).toEqual({ tipo: 'fecha', dias: 83, fecha: ahora + 83 * DIA });
  expect(fechaMeta(empinada, proyectadoEn(empinada, 14), 110)).toEqual({ tipo: 'pronto' });
  expect(fechaMeta(empinada, 400, 110)).toEqual({ tipo: 'mas-de-2-anios' });
});

test('textoMeta', () => {
  expect(textoMeta({ tipo: 'fecha', dias: 83, fecha: HOY + 83 * DIA })).toBe('Llegarías a mediados de enero de 2027, en unos 3 meses');
  expect(textoMeta({ tipo: 'fecha', dias: 150, fecha: HOY + 150 * DIA })).toBe('Llegarías a fines de marzo de 2027, en unos 5 meses');
  expect(textoMeta({ tipo: 'fecha', dias: 36, fecha: new Date(2026, 11, 2).getTime() })).toBe('Llegarías a principios de diciembre de 2026, en unas 5 semanas');
  expect(textoMeta({ tipo: 'pronto' })).toBe('En las próximas 2 semanas');
  expect(textoMeta({ tipo: 'mas-de-2-anios' })).toBe('Más de 2 años al ritmo actual');
  expect(textoMeta({ tipo: 'lograda' })).toBe('¡Ya llegaste! 🏆');
  expect(textoMeta({ tipo: 'sin-estimar', motivo: 'estable' })).toBe('Cuando vuelvas a subir, estimamos la fecha.');
  expect(textoMeta({ tipo: 'sin-estimar', motivo: 'faltan-datos' })).toBe('Con más entrenamientos estimamos la fecha.');
});
