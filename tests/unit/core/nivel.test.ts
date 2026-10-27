import { expect, test } from 'bun:test';
import { GRUPOS, nivelSugerido, textoNivel } from '../../../src/core/nivel';

const DIA = 86_400_000;
const ahora = new Date(2026, 9, 27).getTime();
const s = (ejercicioId: string, e1rm: number, diasAtras = 10) => ({ ejercicioId, fecha: ahora - diasAtras * DIA, e1rm });
const BANCA = 'Barbell_Bench_Press_-_Medium_Grip';
const SENTADILLA = 'Barbell_Squat';
const MUERTO = 'Barbell_Deadlift';

test('grupos con los ids de la biblioteca', () => {
  expect(GRUPOS.banca).toEqual([BANCA]);
  expect(GRUPOS['peso muerto']).toEqual(['Barbell_Deadlift', 'Sumo_Deadlift']);
  expect(GRUPOS['press militar']).toEqual(['Standing_Military_Press', 'Barbell_Shoulder_Press', 'Seated_Barbell_Military_Press']);
});

test('mayoría avanzado', () => {
  expect(nivelSugerido('hombre', 80, [s(BANCA, 130), s(SENTADILLA, 160), s(MUERTO, 200)], ahora)).toEqual({ nivel: 'avanzado', grupos: ['banca', 'sentadilla', 'peso muerto'] });
});

test('empate: gana el nivel más bajo', () => {
  expect(nivelSugerido('hombre', 80, [s(BANCA, 85), s(SENTADILLA, 150)], ahora)).toEqual({ nivel: 'intermedio', grupos: ['banca'] });
});

test('sin datos suficientes o sin perfil: null', () => {
  expect(nivelSugerido('hombre', 80, [s(BANCA, 130)], ahora)).toBeNull();
  expect(nivelSugerido(undefined, 80, [s(BANCA, 130), s(SENTADILLA, 160)], ahora)).toBeNull();
  expect(nivelSugerido('hombre', undefined, [s(BANCA, 130), s(SENTADILLA, 160)], ahora)).toBeNull();
  expect(nivelSugerido('hombre', 80, [s('Otro', 300), s('Otro2', 300)], ahora)).toBeNull();
});

test('mujer: tabla propia', () => {
  expect(nivelSugerido('mujer', 60, [s(BANCA, 40), s(SENTADILLA, 60)], ahora)?.nivel).toBe('intermedio');
  expect(nivelSugerido('mujer', 60, [s(BANCA, 30), s(SENTADILLA, 45)], ahora)).toEqual({ nivel: 'principiante', grupos: ['banca', 'sentadilla'] });
});

test('solo cuentan los últimos 90 días y el mejor ejercicio del grupo', () => {
  expect(nivelSugerido('hombre', 80, [s(BANCA, 130, 100), s(SENTADILLA, 160, 100), s(BANCA, 70), s(SENTADILLA, 90)], ahora)?.nivel).toBe('principiante');
  expect(nivelSugerido('hombre', 80, [s(MUERTO, 100), s('Sumo_Deadlift', 190), s(SENTADILLA, 145)], ahora)).toEqual({ nivel: 'avanzado', grupos: ['sentadilla', 'peso muerto'] });
});

test('textoNivel', () => {
  expect(textoNivel({ nivel: 'avanzado', grupos: ['banca'] })).toBe('Tus números en banca indican nivel avanzado.');
  expect(textoNivel({ nivel: 'avanzado', grupos: ['banca', 'sentadilla'] })).toBe('Tus números en banca y sentadilla indican nivel avanzado.');
  expect(textoNivel({ nivel: 'principiante', grupos: ['banca', 'sentadilla', 'peso muerto'] })).toBe('Tus números en banca, sentadilla y peso muerto indican nivel principiante.');
});
