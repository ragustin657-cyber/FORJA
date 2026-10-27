import { beforeEach, expect, test } from 'bun:test';
import { almacen, TABLAS, usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { exportar, restaurar } from '../../../src/data/backup';
import { nutricionRepo } from '../../../src/data/repos/nutricion';
import type { Perfil } from '../../../src/core/nutricion/perfil';

const perfil: Perfil = {
  id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado',
  objetivo: 'bajar', comidas: 4, noComoGrupos: [], noComoTexto: [],
};
const menu = (id: string) => ({ id, semilla: 1, perfilHash: 'h', dias: [{ comidas: [{ tipo: 'cena' as const, platoId: 'x', factor: 1 }] }] });

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));

test('las tablas de nutrición existen', () => {
  for (const t of ['perfil', 'pesos', 'menus', 'compras']) expect(TABLAS as readonly string[]).toContain(t);
});

test('sin perfil devuelve undefined', async () => {
  expect(await nutricionRepo.perfil()).toBeUndefined();
  expect(await nutricionRepo.pesoActual()).toBeUndefined();
});

test('guardarPerfil guarda el perfil y registra el peso', async () => {
  await nutricionRepo.guardarPerfil(perfil, 80, new Date(2026, 9, 20).getTime());
  expect(await nutricionRepo.perfil()).toEqual(perfil);
  expect(await nutricionRepo.pesoActual()).toBe(80);
  await nutricionRepo.guardarPerfil({ ...perfil, objetivo: 'ganar' }, 79.5, new Date(2026, 9, 26).getTime());
  expect(await nutricionRepo.pesoActual()).toBe(79.5);
  expect((await nutricionRepo.pesos()).map((p) => p.kg)).toEqual([80, 79.5]);
});

test('un solo peso por día: el último reemplaza al anterior', async () => {
  const dia = new Date(2026, 9, 26, 10).getTime();
  await nutricionRepo.guardarPerfil(perfil, 80, dia);
  await nutricionRepo.guardarPerfil(perfil, 79.8, dia + 3_600_000);
  expect((await nutricionRepo.pesos()).map((p) => p.kg)).toEqual([79.8]);
  expect(await nutricionRepo.pesoActual()).toBe(79.8);
});

test('cada semana guarda su propio menú', async () => {
  await nutricionRepo.guardarMenu(menu('2026-10-26'));
  await nutricionRepo.guardarMenu({ ...menu('2026-11-02'), semilla: 2 });
  expect((await nutricionRepo.menu('2026-10-26'))?.semilla).toBe(1);
  expect((await nutricionRepo.menu('2026-11-02'))?.semilla).toBe(2);
  expect(await nutricionRepo.menu('2026-11-09')).toBeUndefined();
});

test('alternarTachado agrega y quita', async () => {
  expect(await nutricionRepo.tachados('2026-10-26')).toEqual([]);
  await nutricionRepo.alternarTachado('2026-10-26', 'huevo');
  await nutricionRepo.alternarTachado('2026-10-26', 'arroz');
  expect(await nutricionRepo.tachados('2026-10-26')).toEqual(['huevo', 'arroz']);
  await nutricionRepo.alternarTachado('2026-10-26', 'huevo');
  expect(await nutricionRepo.tachados('2026-10-26')).toEqual(['arroz']);
  expect(await nutricionRepo.tachados('2026-11-02')).toEqual([]);
});

test('la copia de seguridad incluye las tablas de nutrición', async () => {
  await nutricionRepo.guardarPerfil(perfil, 80, 1000);
  await nutricionRepo.guardarMenu(menu('2026-10-26'));
  await nutricionRepo.alternarTachado('2026-10-26', 'huevo');
  const copia = await exportar({ incluirFotos: false });
  usarAlmacen(crearAlmacenMemoria());
  await restaurar(copia);
  expect(await nutricionRepo.perfil()).toEqual(perfil);
  expect(await nutricionRepo.menu('2026-10-26')).toEqual(menu('2026-10-26'));
  expect(await nutricionRepo.tachados('2026-10-26')).toEqual(['huevo']);
  expect((await almacen().tabla('pesos').todos()).length).toBe(1);
});

test('dos toques rápidos en la lista no pierden ninguna casilla', async () => {
  await Promise.all([nutricionRepo.alternarTachado('s', 'a'), nutricionRepo.alternarTachado('s', 'b'), nutricionRepo.alternarTachado('s', 'c')]);
  expect((await nutricionRepo.tachados('s')).sort()).toEqual(['a', 'b', 'c']);
});

test('si un toque falla al guardar, los siguientes se guardan igual', async () => {
  const base = crearAlmacenMemoria();
  let fallar = true;
  usarAlmacen({
    ...base,
    tabla(nombre) {
      const t = base.tabla(nombre);
      if (nombre !== 'compras') return t;
      return { ...t, async poner(v) { if (fallar) { fallar = false; throw new Error('disco lleno'); } return t.poner(v); } } as typeof t;
    },
  });
  await expect(nutricionRepo.alternarTachado('s', 'a')).rejects.toThrow('disco lleno');
  await nutricionRepo.alternarTachado('s', 'b');
  expect(await nutricionRepo.tachados('s')).toEqual(['b']);
});
