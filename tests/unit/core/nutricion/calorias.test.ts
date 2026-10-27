import { expect, test } from 'bun:test';
import { calcularMetas, edad, metabolismoBasal } from '../../../../src/core/nutricion/calorias';
import { hashPerfil, validarPerfil, type Perfil } from '../../../../src/core/nutricion/perfil';

const HOY = new Date(2026, 9, 26);
const base: Perfil = {
  id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado',
  objetivo: 'bajar', comidas: 4, noComoGrupos: [], noComoTexto: [],
};

test('edad cumple años en la fecha', () => {
  expect(edad('1996-05-10', HOY)).toBe(30);
  expect(edad('1996-10-27', HOY)).toBe(29);
  expect(edad('1996-10-26', HOY)).toBe(30);
});

test('metabolismo basal Mifflin-St Jeor', () => {
  expect(metabolismoBasal('hombre', 80, 180, 30)).toBe(1780);
  expect(metabolismoBasal('mujer', 60, 165, 30)).toBeCloseTo(1320.25, 2);
});

test('hombre de 80 kg que quiere bajar grasa', () => {
  const m = calcularMetas(base, 80, HOY);
  expect(m.basal).toBe(1780);
  expect(m.gasto).toBe(2759);
  expect(m.kcal).toBe(2210);
  expect(m.proteina).toBe(160);
  expect(m.grasas).toBe(61);
  expect(m.carbos).toBe(254);
  expect(m.topeAplicado).toBe(false);
});

test('mantener usa 1,8 g/kg de proteína y no ajusta calorías', () => {
  const m = calcularMetas({ ...base, objetivo: 'mantener' }, 80, HOY);
  expect(m.kcal).toBe(2760);
  expect(m.proteina).toBe(144);
});

test('ganar suma 10 %', () => {
  expect(calcularMetas({ ...base, objetivo: 'ganar' }, 80, HOY).kcal).toBe(3030);
});

test('nunca baja del tope mínimo', () => {
  const m = calcularMetas({ ...base, sexo: 'mujer', nacimiento: '1966-01-01', alturaCm: 150, actividad: 'sedentario' }, 45, HOY);
  expect(m.kcal).toBe(1200);
  expect(m.topeAplicado).toBe(true);
});

test('el déficit no supera el 1 % del peso por semana', () => {
  // 50 kg muy activo: el 20 % (562 kcal) sería más que 550 kcal/día (50 × 0,01 × 7700 / 7)
  const m = calcularMetas({ ...base, actividad: 'muyAlto' }, 50, HOY);
  const maxDeficit = (50 * 0.01 * 7700) / 7;
  expect(m.gasto - m.kcal).toBeLessThanOrEqual(maxDeficit + 10);
  expect(m.topeAplicado).toBe(true);
});

test('las grasas nunca bajan de 0,6 g/kg', () => {
  const m = calcularMetas({ ...base, sexo: 'mujer', nacimiento: '1966-01-01', alturaCm: 150, actividad: 'sedentario' }, 120, HOY);
  expect(m.grasas).toBeGreaterThanOrEqual(72);
});

test('los carbohidratos nunca son negativos', () => {
  const m = calcularMetas({ ...base, sexo: 'mujer', nacimiento: '1966-01-01', alturaCm: 150, actividad: 'sedentario' }, 120, HOY);
  expect(m.carbos).toBeGreaterThanOrEqual(0);
});

test('la explicación cuenta el gasto y el ajuste', () => {
  const m = calcularMetas(base, 80, HOY);
  expect(m.explicacion[0]).toBe('Tu cuerpo gasta unas 2.760 kcal por día.');
  expect(m.explicacion[1]).toBe('Para bajar grasa comés un 20 % menos: 2.210 kcal.');
  expect(calcularMetas({ ...base, objetivo: 'mantener' }, 80, HOY).explicacion[1]).toBe('Para mantener tu peso comés lo mismo que gastás.');
  expect(calcularMetas({ ...base, objetivo: 'ganar' }, 80, HOY).explicacion[1]).toBe('Para ganar músculo comés un 10 % más: 3.030 kcal.');
  expect(calcularMetas({ ...base, sexo: 'mujer', nacimiento: '1966-01-01', alturaCm: 150, actividad: 'sedentario' }, 45, HOY).explicacion[2]).toBe(
    'Lo subimos a 1.200 kcal para que no sea un plan demasiado estricto.',
  );
});

test('validarPerfil acepta un perfil completo', () => {
  expect(validarPerfil({ ...base, pesoKg: 80 }, HOY)).toEqual([]);
});

test('validarPerfil rechaza valores fuera de rango', () => {
  expect(validarPerfil({ ...base, alturaCm: 100, pesoKg: 80 }, HOY)).toContain('La altura tiene que estar entre 120 y 230 cm.');
  expect(validarPerfil({ ...base, pesoKg: 300 }, HOY)).toContain('El peso tiene que estar entre 35 y 250 kg.');
  expect(validarPerfil({ ...base, pesoKg: undefined }, HOY)).toContain('El peso tiene que estar entre 35 y 250 kg.');
  expect(validarPerfil({ ...base, nacimiento: '2027-01-01', pesoKg: 80 }, HOY)).toContain('Revisá la fecha de nacimiento.');
  expect(validarPerfil({ ...base, nacimiento: 'cualquiera', pesoKg: 80 }, HOY)).toContain('Revisá la fecha de nacimiento.');
  expect(validarPerfil({ ...base, nacimiento: '2016-01-01', pesoKg: 80 }, HOY)).toContain('La edad tiene que estar entre 14 y 90 años.');
  expect(validarPerfil({ ...base, sexo: undefined, actividad: undefined, objetivo: undefined, pesoKg: 80 }, HOY)).toEqual([
    'Elegí tu sexo.',
    'Elegí tu nivel de actividad.',
    'Elegí tu objetivo.',
  ]);
});

test('hashPerfil cambia con el peso y el objetivo, no con el orden de lo que no comés', () => {
  const h = hashPerfil({ ...base, noComoTexto: ['cebolla', 'ajo'] }, 80);
  expect(hashPerfil({ ...base, noComoTexto: ['ajo', 'cebolla'] }, 80)).toBe(h);
  expect(hashPerfil({ ...base, noComoTexto: ['ajo', 'cebolla'] }, 81)).not.toBe(h);
  expect(hashPerfil({ ...base, objetivo: 'ganar', noComoTexto: ['ajo', 'cebolla'] }, 80)).not.toBe(h);
});

test('el piso de calorías vale también para mantener y ganar', () => {
  const chica = { ...base, sexo: 'mujer' as const, nacimiento: '1956-01-01', alturaCm: 150, actividad: 'sedentario' as const };
  expect(calcularMetas({ ...chica, objetivo: 'mantener' }, 45, HOY).kcal).toBe(1200);
  expect(calcularMetas({ ...chica, objetivo: 'ganar' }, 45, HOY).kcal).toBe(1200);
  expect(calcularMetas({ ...chica, objetivo: 'mantener' }, 45, HOY).topeAplicado).toBe(true);
});

test('avisa cuando las calorías salen fuera de lo razonable', () => {
  expect(calcularMetas(base, 80, HOY).alerta).toBeUndefined();
  const enorme = calcularMetas({ ...base, alturaCm: 220, actividad: 'muyAlto', objetivo: 'ganar' }, 200, HOY);
  expect(enorme.alerta).toBe('Tus números dan muy altos. Revisá los datos y, si están bien, consultá a un profesional.');
});

test('el ajuste quincenal se aplica antes de los topes', () => {
  const mantener = { ...base, objetivo: 'mantener' as const };
  const sin = calcularMetas(mantener, 80, HOY).kcal;
  expect(calcularMetas({ ...mantener, ajusteKcal: -150 }, 80, HOY).kcal).toBe(sin - 150);
  expect(calcularMetas({ ...mantener, ajusteKcal: 300 }, 80, HOY).kcal).toBe(sin + 300);
  // bajando, el tope del 1 % por semana sigue valiendo
  expect(calcularMetas({ ...base, ajusteKcal: -150 }, 80, HOY).kcal).toBe(2060);
  expect(calcularMetas({ ...base, ajusteKcal: -600 }, 80, HOY).kcal).toBe(1880);
});

test('el ajuste aparece en la explicación', () => {
  const m = calcularMetas({ ...base, objetivo: 'mantener', ajusteKcal: -150 }, 80, HOY);
  expect(m.explicacion).toContain('Según cómo viene tu peso, le restamos 150 kcal.');
  const g = calcularMetas({ ...base, objetivo: 'mantener', ajusteKcal: 150 }, 80, HOY);
  expect(g.explicacion).toContain('Según cómo viene tu peso, le sumamos 150 kcal.');
});

test('el hash cambia con el ajuste pero no si es 0', () => {
  expect(hashPerfil({ ...base, ajusteKcal: 0 }, 80)).toBe(hashPerfil(base, 80));
  expect(hashPerfil({ ...base, ajusteKcal: -150 }, 80)).not.toBe(hashPerfil(base, 80));
  expect(hashPerfil({ ...base, ultimoAjuste: 5 }, 80)).toBe(hashPerfil(base, 80));
});
