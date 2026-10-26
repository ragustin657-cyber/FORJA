import { expect, test } from 'bun:test';
import { EQUIPOS, filtrarEjercicios, MUSCULOS, normalizar, tipoDeEjercicio } from '../../../src/core/biblioteca';
import { ejercicio } from '../fabricas';

test('tipoDeEjercicio: piernas son tren inferior', () => {
  expect(tipoDeEjercicio(['quadriceps'])).toBe('inferior');
  expect(tipoDeEjercicio(['chest', 'glutes'])).toBe('inferior');
  for (const m of ['hamstrings', 'calves', 'adductors', 'abductors']) expect(tipoDeEjercicio([m])).toBe('inferior');
});

test('tipoDeEjercicio: el resto es tren superior', () => {
  expect(tipoDeEjercicio(['chest'])).toBe('superior');
  expect(tipoDeEjercicio(['abdominals'])).toBe('superior');
  expect(tipoDeEjercicio([])).toBe('superior');
});

test('normalizar quita tildes y mayúsculas', () => {
  expect(normalizar('Extensión de Tríceps')).toBe('extension de triceps');
});

const lista = [
  ejercicio('bench', { nombre: 'Press de banca', nombreOriginal: 'Barbell Bench Press', musculos: ['chest'], equipo: 'barbell' }),
  ejercicio('curl', { nombre: 'Curl de bíceps con mancuernas', nombreOriginal: 'Dumbbell Bicep Curl', musculos: ['biceps'], equipo: 'dumbbell', favorito: true }),
  ejercicio('sq', { nombre: 'Sentadilla', nombreOriginal: 'Barbell Squat', musculos: ['quadriceps'], equipo: 'barbell' }),
  ejercicio('viejo', { nombre: 'Archivado', musculos: ['chest'], archivado: true }),
];
const ids = (l: { id: string }[]) => l.map((e) => e.id);

test('sin filtros devuelve todo menos archivados, favoritos primero y luego alfabético', () => {
  expect(ids(filtrarEjercicios(lista, {}))).toEqual(['curl', 'bench', 'sq']);
});

test('busca sin importar tildes ni mayúsculas', () => {
  expect(ids(filtrarEjercicios(lista, { texto: 'press banca' }))).toEqual(['bench']);
  expect(ids(filtrarEjercicios(lista, { texto: 'BICEPS' }))).toEqual(['curl']);
});

test('busca por nombre original en inglés', () => {
  expect(ids(filtrarEjercicios(lista, { texto: 'bench' }))).toEqual(['bench']);
});

test('filtra por músculo y equipo', () => {
  expect(ids(filtrarEjercicios(lista, { musculo: 'chest' }))).toEqual(['bench']);
  expect(ids(filtrarEjercicios(lista, { equipo: 'barbell' }))).toEqual(['bench', 'sq']);
  expect(ids(filtrarEjercicios(lista, { equipo: 'barbell', musculo: 'quadriceps' }))).toEqual(['sq']);
});

test('solo favoritos', () => {
  expect(ids(filtrarEjercicios(lista, { soloFavoritos: true }))).toEqual(['curl']);
});

test('los catálogos de músculos y equipos tienen nombre en español', () => {
  expect(MUSCULOS.chest).toBe('Pecho');
  expect(EQUIPOS.barbell).toBe('Barra');
});

test('los ejercicios en español y los propios van antes que los que siguen en inglés', () => {
  const l = [
    ejercicio('en', { nombre: 'Air Bike', nombreOriginal: 'Air Bike' }),
    ejercicio('es', { nombre: 'Zancada', nombreOriginal: 'Lunge' }),
    ejercicio('mio', { nombre: 'Mío', nombreOriginal: 'Mío', propio: true }),
  ];
  expect(ids(filtrarEjercicios(l, {}))).toEqual(['mio', 'es', 'en']);
});
