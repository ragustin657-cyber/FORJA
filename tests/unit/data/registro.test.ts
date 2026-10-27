import { beforeEach, expect, test } from 'bun:test';
import { TABLAS, usarAlmacen } from '../../../src/data/db';
import { crearAlmacenMemoria } from '../../../src/data/memoria';
import { exportar, restaurar } from '../../../src/data/backup';
import { registroRepo } from '../../../src/data/repos/registro';
import { nutricionRepo } from '../../../src/data/repos/nutricion';
import type { Perfil } from '../../../src/core/nutricion/perfil';
import type { Producto } from '../../../src/core/nutricion/tipos';

const nuevo = (extra = {}) => ({
  fecha: '2026-10-26', tipo: 'almuerzo' as const, origen: 'alimento' as const, refId: 'arroz', cantidad: 100, nombre: 'Arroz',
  macros: { kcal: 350, proteina: 7, grasas: 1, carbos: 80 }, ...extra,
});
const yogur: Producto = { id: '7790070411716', nombre: 'Yogur', kcal: 80, proteina: 4, grasas: 2, carbos: 11, origen: 'off' };
const perfil: Perfil = {
  id: 'yo', sexo: 'hombre', nacimiento: '1996-05-10', alturaCm: 180, actividad: 'moderado',
  objetivo: 'bajar', comidas: 4, noComoGrupos: [], noComoTexto: [],
};

beforeEach(() => usarAlmacen(crearAlmacenMemoria()));

test('las tablas nuevas existen', () => {
  expect(TABLAS as readonly string[]).toContain('registros');
  expect(TABLAS as readonly string[]).toContain('productos');
});

test('agregar devuelve el registro con id y fecha de creación', async () => {
  const r = await registroRepo.agregar(nuevo(), 1000);
  expect(r.id).toBeTruthy();
  expect(r.creado).toBe(1000);
  expect(await registroRepo.todos()).toEqual([r]);
});

test('delDia filtra por fecha y ordena por creación', async () => {
  const b = await registroRepo.agregar(nuevo({ nombre: 'B' }), 2000);
  const a = await registroRepo.agregar(nuevo({ nombre: 'A' }), 1000);
  await registroRepo.agregar(nuevo({ fecha: '2026-10-25' }), 1500);
  expect(await registroRepo.delDia('2026-10-26')).toEqual([a, b]);
  expect(await registroRepo.delDia('2026-10-27')).toEqual([]);
});

test('borrar quita el registro', async () => {
  const r = await registroRepo.agregar(nuevo(), 1);
  await registroRepo.borrar(r.id);
  expect(await registroRepo.todos()).toEqual([]);
});

test('productos se guardan y se recuperan', async () => {
  expect(await registroRepo.producto(yogur.id)).toBeUndefined();
  await registroRepo.guardarProducto(yogur);
  expect(await registroRepo.producto(yogur.id)).toEqual(yogur);
  expect(await registroRepo.productos()).toEqual([yogur]);
});

test('registrarPeso guarda uno por día', async () => {
  const dia = new Date(2026, 9, 26, 8).getTime();
  await nutricionRepo.registrarPeso(80, dia);
  await nutricionRepo.registrarPeso(79.6, dia + 3_600_000);
  await nutricionRepo.registrarPeso(79.4, dia + 86_400_000);
  expect((await nutricionRepo.pesos()).map((p) => p.kg)).toEqual([79.6, 79.4]);
});

test('guardarAjuste cambia solo el ajuste del perfil', async () => {
  await nutricionRepo.guardarAjuste(-150, 5); // sin perfil no hace nada
  expect(await nutricionRepo.perfil()).toBeUndefined();
  await nutricionRepo.guardarPerfil(perfil, 80, 1);
  await nutricionRepo.guardarAjuste(-150, 5000);
  expect(await nutricionRepo.perfil()).toEqual({ ...perfil, ajusteKcal: -150, ultimoAjuste: 5000 });
});

test('la copia de seguridad incluye registros y productos', async () => {
  const r = await registroRepo.agregar(nuevo(), 1);
  await registroRepo.guardarProducto(yogur);
  const copia = await exportar({ incluirFotos: false });
  usarAlmacen(crearAlmacenMemoria());
  await restaurar(copia);
  expect(await registroRepo.todos()).toEqual([r]);
  expect(await registroRepo.productos()).toEqual([yogur]);
});
