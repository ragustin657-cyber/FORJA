import { beforeEach, expect, test } from 'bun:test';
import { TABLAS, usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { cuerpoRepo } from '../../../src/data/repos/cuerpo';
import { ajustesRepo } from '../../../src/data/repos/ajustes';

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));

const blob = (t: string) => new Blob([t], { type: 'image/jpeg' });
const foto = (pose: 'frente' | 'perfil' = 'frente') => ({ id: `2026-10-27-${pose}`, fecha: '2026-10-27', pose, creado: 1 });

test('las tablas de cuerpo existen', () => {
  for (const t of ['medidas', 'fotos', 'imagenes']) expect(TABLAS as readonly string[]).toContain(t);
});

test('guardar medidas dos veces el mismo día las combina', async () => {
  await cuerpoRepo.guardarMedidas('2026-10-27', { cintura: 85, pecho: 100 }, 1000);
  await cuerpoRepo.guardarMedidas('2026-10-27', { cintura: 84 }, 2000);
  await cuerpoRepo.guardarMedidas('2026-10-20', { cuello: 38 }, 3000);
  const ms = await cuerpoRepo.medidas();
  expect(ms.map((m) => m.id)).toEqual(['2026-10-20', '2026-10-27']);
  expect(ms[1]).toMatchObject({ cintura: 84, pecho: 100 });
  expect(ms[0].fecha).toBe(new Date(2026, 9, 20, 12).getTime());
  await cuerpoRepo.borrarMedidas('2026-10-20');
  expect((await cuerpoRepo.medidas()).length).toBe(1);
});

test('la fecha de hoy usa la hora real', async () => {
  const ahora = new Date(2026, 9, 27, 9, 30).getTime();
  await cuerpoRepo.guardarMedidas('2026-10-27', { cintura: 85 }, ahora);
  expect((await cuerpoRepo.medidas())[0].fecha).toBe(ahora);
});

test('guardar, reemplazar y borrar una foto con su imagen', async () => {
  await cuerpoRepo.guardarFoto(foto(), { id: foto().id, imagen: blob('a'), miniatura: blob('a-mini') });
  await cuerpoRepo.guardarFoto({ ...foto(), creado: 2 }, { id: foto().id, imagen: blob('b'), miniatura: blob('b-mini') });
  await cuerpoRepo.guardarFoto(foto('perfil'), { id: foto('perfil').id, imagen: blob('c'), miniatura: blob('c') });
  expect((await cuerpoRepo.fotos()).length).toBe(2);
  expect((await cuerpoRepo.foto(foto().id))?.creado).toBe(2);
  expect(await (await cuerpoRepo.imagen(foto().id))!.imagen.text()).toBe('b');
  await cuerpoRepo.borrarFoto(foto().id);
  expect(await cuerpoRepo.foto(foto().id)).toBeUndefined();
  expect(await cuerpoRepo.imagen(foto().id)).toBeUndefined();
  expect((await cuerpoRepo.fotos()).length).toBe(1);
});

test('ajustes de fotos por defecto', async () => {
  const a = await ajustesRepo.obtener();
  expect(a.temporizadorFoto).toBe(0);
  expect(a.fotosPospuestas).toBeNull();
});
