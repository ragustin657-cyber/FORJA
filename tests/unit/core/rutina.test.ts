import { expect, test } from 'bun:test';
import { proximoDia } from '../../../src/core/rutina';
import type { Rutina } from '../../../src/data/tipos';

const rutina: Rutina = {
  id: 'r', nombre: 'R', origen: 'manual', archivado: false, creada: 1,
  dias: ['a', 'b', 'c'].map((id) => ({ id, nombre: id.toUpperCase(), ejercicios: [{ ejercicioId: 'x', series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }] })),
};

test('proximoDia sigue al último día entrenado', () => {
  expect(proximoDia(rutina, 'a')?.id).toBe('b');
  expect(proximoDia(rutina, 'b')?.id).toBe('c');
});

test('proximoDia vuelve al primero después del último', () => {
  expect(proximoDia(rutina, 'c')?.id).toBe('a');
});

test('proximoDia sin historial o con un día borrado arranca por el primero', () => {
  expect(proximoDia(rutina, null)?.id).toBe('a');
  expect(proximoDia(rutina, 'x')?.id).toBe('a');
});

test('proximoDia de una rutina sin días es undefined', () => {
  expect(proximoDia({ ...rutina, dias: [] }, null)).toBeUndefined();
});

test('proximoDia salta los días sin ejercicios', () => {
  const conVacio: Rutina = {
    ...rutina,
    dias: [
      { id: 'a', nombre: 'A', ejercicios: [{ ejercicioId: 'x', series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }] },
      { id: 'b', nombre: 'B', ejercicios: [] },
    ],
  };
  expect(proximoDia(conVacio, 'a')?.id).toBe('a');
});
