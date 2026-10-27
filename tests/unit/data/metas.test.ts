import { beforeEach, expect, test } from 'bun:test';
import { TABLAS, usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { exportar, restaurar } from '../../../src/data/backup';
import { metasRepo } from '../../../src/data/repos/metas';
import { ajustesRepo } from '../../../src/data/repos/ajustes';

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));
const meta = (id: string, peso = 100) => ({ id, peso, reps: 1, creada: 1 });

test('la tabla de metas existe', () => {
  expect(TABLAS as readonly string[]).toContain('metas');
});

test('guardar, reemplazar, listar y quitar metas', async () => {
  expect(await metasRepo.de('banca')).toBeUndefined();
  await metasRepo.guardar(meta('banca'));
  await metasRepo.guardar(meta('banca', 110));
  await metasRepo.guardar(meta('sentadilla', 140));
  expect((await metasRepo.de('banca'))?.peso).toBe(110);
  expect((await metasRepo.todas()).length).toBe(2);
  await metasRepo.quitar('banca');
  expect((await metasRepo.todas()).map((m) => m.id)).toEqual(['sentadilla']);
});

test('el nivel por defecto es intermedio', async () => {
  expect((await ajustesRepo.obtener()).nivel).toBe('intermedio');
  await ajustesRepo.guardar({ nivel: 'avanzado' });
  expect((await ajustesRepo.obtener()).nivel).toBe('avanzado');
});

test('la copia de seguridad incluye las metas', async () => {
  await metasRepo.guardar(meta('banca'));
  const copia = await exportar({ incluirFotos: false });
  usarAlmacen(crearAlmacenMemoria());
  await restaurar(copia);
  expect(await metasRepo.de('banca')).toEqual(meta('banca'));
});
