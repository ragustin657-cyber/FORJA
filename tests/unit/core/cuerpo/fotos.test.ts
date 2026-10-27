import { expect, test } from 'bun:test';
import { fotosPorFecha, idFoto, medidasEscaladas, necesitaFotos, paresParaComparar, POSES, posesFaltantes, type Foto } from '../../../../src/core/cuerpo/fotos';

const DIA = 86_400_000;
const ahora = new Date(2026, 9, 27, 10).getTime();
const foto = (fecha: string, pose: Foto['pose']): Foto => ({ id: idFoto(fecha, pose), fecha, pose, creado: 1 });

test('poses e id', () => {
  expect(POSES.map((p) => p.id)).toEqual(['frente', 'perfil', 'espalda']);
  expect(idFoto('2026-10-27', 'perfil')).toBe('2026-10-27-perfil');
});

test('necesitaFotos: nunca, 13 y 14 días, y pospuesto', () => {
  expect(necesitaFotos(undefined, null, ahora)).toBe(true);
  expect(necesitaFotos('2026-10-14', null, ahora)).toBe(false);
  expect(necesitaFotos('2026-10-13', null, ahora)).toBe(true);
  expect(necesitaFotos(undefined, ahora - 2 * DIA, ahora)).toBe(false);
  expect(necesitaFotos(undefined, ahora - 3 * DIA, ahora)).toBe(true);
});

test('fotosPorFecha agrupa y deja la más nueva primero', () => {
  const g = fotosPorFecha([foto('2026-10-13', 'frente'), foto('2026-10-27', 'perfil'), foto('2026-10-13', 'espalda')]);
  expect(g.map((x) => x.fecha)).toEqual(['2026-10-27', '2026-10-13']);
  expect(Object.keys(g[1].poses).sort()).toEqual(['espalda', 'frente']);
});

test('paresParaComparar: primera y última fecha con esa pose', () => {
  const fs = [foto('2026-10-13', 'frente'), foto('2026-10-20', 'frente'), foto('2026-10-27', 'frente'), foto('2026-10-01', 'perfil')];
  expect(paresParaComparar(fs, 'frente')).toEqual({ antes: '2026-10-13', despues: '2026-10-27' });
  expect(paresParaComparar(fs, 'perfil')).toBeNull();
});

test('posesFaltantes de un día, en orden', () => {
  expect(posesFaltantes([foto('2026-10-27', 'perfil'), foto('2026-10-20', 'frente')], '2026-10-27')).toEqual(['frente', 'espalda']);
});

test('medidasEscaladas achica sin agrandar', () => {
  expect(medidasEscaladas(3024, 4032, 1600)).toEqual({ ancho: 1200, alto: 1600 });
  expect(medidasEscaladas(4032, 3024, 320)).toEqual({ ancho: 320, alto: 240 });
  expect(medidasEscaladas(800, 600, 1600)).toEqual({ ancho: 800, alto: 600 });
});
