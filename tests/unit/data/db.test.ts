import { expect, test } from 'bun:test';

test('almacen() falla con un mensaje claro si no se inicializó', async () => {
  const db = await import('../../../src/data/db?sin-iniciar');
  expect(() => db.almacen()).toThrow('El almacenamiento no está inicializado');
});
