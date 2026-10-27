import { expect, test } from 'bun:test';
import patronesReales from '../../../src/contenido/patrones.json';
import {
  DIAS_POR_SEMANA, diaDeSemana, diasPermitidos, generarRutina, inicioDelPlan, OBJETIVOS, pesoDeDescarga, PLANTILLAS, semanaDelPlan, seriesDeSemana, sesionesDeLaSemana,
  type EntradaPlan, type Patrones,
} from '../../../src/core/planes';

let n = 0;
const id = () => `id${++n}`;
const reales = patronesReales as Patrones;
const entrada = (extra: Partial<EntradaPlan> = {}): EntradaPlan => ({ objetivo: 'musculo', dias: 4, equipo: 'gimnasio', nivel: 'intermedio', ...extra });
const ej = (extra = {}) => ({ ejercicioId: 'x', series: 4, repsMin: 8, repsMax: 12, descansoSeg: 90, ...extra });

test('objetivos y plantillas', () => {
  expect(OBJETIVOS.map((o) => o.nombre)).toEqual(['Fuerza', 'Ganar músculo', 'Bajar grasa', 'Forma general']);
  expect(DIAS_POR_SEMANA[3]).toEqual(['Cuerpo A', 'Cuerpo B', 'Cuerpo C']);
  expect(DIAS_POR_SEMANA[4]).toEqual(['Torso A', 'Piernas A', 'Torso B', 'Piernas B']);
  expect(DIAS_POR_SEMANA[5]).toEqual(['Empuje A', 'Tirón A', 'Piernas A', 'Torso A', 'Piernas B']);
  expect(DIAS_POR_SEMANA[6]).toEqual(['Empuje A', 'Tirón A', 'Piernas A', 'Empuje B', 'Tirón B', 'Piernas B']);
  expect(PLANTILLAS['Torso B']).toEqual(['empuje-vertical:1', 'tiron-vertical:1', 'empuje-horizontal:1', 'tiron-horizontal:1', 'hombro-lateral', 'biceps:1']);
  expect(Object.keys(PLANTILLAS).length).toBe(11);
});

test('rutina de 4 días para ganar músculo en gimnasio', () => {
  const r = generarRutina(entrada(), reales, id, 1000);
  expect(r).toMatchObject({ nombre: 'Plan de ganar músculo · 4 días', origen: 'plan', archivado: false, creada: 1000 });
  expect(r.dias.map((d) => d.nombre)).toEqual(['Torso A', 'Piernas A', 'Torso B', 'Piernas B']);
  const torso = r.dias[0].ejercicios;
  expect(torso.length).toBe(6);
  expect(torso[0]).toEqual({ ejercicioId: 'Barbell_Bench_Press_-_Medium_Grip', series: 4, repsMin: 8, repsMax: 12, descansoSeg: 90, basico: true });
  expect(torso[1].basico).toBe(true);
  expect(torso[2]).toMatchObject({ series: 3, repsMin: 8, repsMax: 12, descansoSeg: 60, basico: false });
  // Torso B usa variantes
  expect(r.dias[2].ejercicios[0].ejercicioId).toBe('Dumbbell_Shoulder_Press');
});

test('parámetros por objetivo', () => {
  const f = generarRutina(entrada({ objetivo: 'fuerza' }), reales, id, 1).dias[0].ejercicios;
  expect([f[0].series, f[0].repsMin, f[0].repsMax, f[0].descansoSeg]).toEqual([5, 3, 6, 180]);
  expect([f[2].series, f[2].repsMin, f[2].repsMax, f[2].descansoSeg]).toEqual([4, 6, 10, 120]);
  const g = generarRutina(entrada({ objetivo: 'grasa' }), reales, id, 1).dias[0].ejercicios;
  expect([g[0].series, g[0].repsMin, g[0].repsMax, g[0].descansoSeg, g[2].descansoSeg]).toEqual([3, 10, 15, 60, 45]);
  const fg = generarRutina(entrada({ objetivo: 'general' }), reales, id, 1).dias[0].ejercicios;
  expect([fg[0].series, fg[0].repsMin, fg[0].repsMax, fg[0].descansoSeg, fg[2].series, fg[2].descansoSeg]).toEqual([3, 8, 12, 90, 3, 60]);
  expect(generarRutina(entrada({ objetivo: 'fuerza', dias: 3 }), reales, id, 1).nombre).toBe('Plan de fuerza · 3 días');
});

test('elección de candidatos: variante, último disponible, hueco salteado y sin repetidos', () => {
  const p = Object.fromEntries(Object.keys(reales).map((k) => [k, { gimnasio: [], mancuernas: [], casa: [] }])) as unknown as Patrones;
  p['empuje-horizontal'].gimnasio = ['press'];
  p['empuje-vertical'].gimnasio = ['militar', 'mancuerna'];
  p['tiron-vertical'].gimnasio = ['jalon'];
  p['tiron-horizontal'].gimnasio = ['press', 'remo'];
  const torsoB = generarRutina(entrada(), p, id, 1).dias[2].ejercicios.map((e) => e.ejercicioId);
  // empuje-vertical:1 → mancuerna; tiron-vertical:1 → único (jalon); empuje-horizontal:1 → press; tiron-horizontal:1 → remo; el resto sin candidatos
  expect(torsoB).toEqual(['mancuerna', 'jalon', 'press', 'remo']);
  const torsoA = generarRutina(entrada(), p, id, 1).dias[0].ejercicios.map((e) => e.ejercicioId);
  // tiron-horizontal repetiría "press": toma el siguiente no usado
  expect(torsoA).toEqual(['press', 'remo', 'militar', 'jalon']);
});

test('principiante: un ejercicio menos por día', () => {
  expect(generarRutina(entrada({ nivel: 'principiante' }), reales, id, 1).dias[0].ejercicios.length).toBe(5);
});

test('en casa, 3 días: todos con ejercicios y sin repetidos', () => {
  for (const d of generarRutina(entrada({ dias: 3, equipo: 'casa' }), reales, id, 1).dias) {
    const ids = d.ejercicios.map((e) => e.ejercicioId);
    expect(ids.length, d.nombre).toBeGreaterThanOrEqual(3);
    expect(new Set(ids).size).toBe(ids.length);
  }
  for (const equipo of ['gimnasio', 'mancuernas', 'casa'] as const) for (const dias of diasPermitidos(equipo)) {
    for (const d of generarRutina(entrada({ dias, equipo }), reales, id, 1).dias) expect(d.ejercicios.length, `${dias}/${equipo}/${d.nombre}`).toBeGreaterThanOrEqual(3);
  }
});

test('en casa el plan llega hasta 4 días (no hay remos ni curls sin equipo)', () => {
  expect(diasPermitidos('casa')).toEqual([3, 4]);
  expect(diasPermitidos('gimnasio')).toEqual([3, 4, 5, 6]);
  expect(diasPermitidos('mancuernas')).toEqual([3, 4, 5, 6]);
});

test('semana del plan', () => {
  const s = (a: number, m: number, d: number, h = 12, min = 0) => semanaDelPlan('2026-10-26', new Date(a, m - 1, d, h, min));
  expect(s(2026, 10, 25).estado).toBe('por-empezar');
  expect(s(2026, 10, 26, 0)).toEqual({ estado: 'activo', semana: 1, bloque: 1, semanaBloque: 1, descarga: false });
  expect(s(2026, 11, 1, 23, 59).semana).toBe(1);
  expect(s(2026, 11, 2, 0).semana).toBe(2);
  expect(s(2026, 11, 16)).toEqual({ estado: 'activo', semana: 4, bloque: 1, semanaBloque: 4, descarga: true });
  expect(s(2026, 11, 23)).toMatchObject({ semana: 5, bloque: 2, semanaBloque: 1 });
  expect(s(2027, 1, 17)).toMatchObject({ estado: 'activo', semana: 12, bloque: 3, descarga: true });
  expect(s(2027, 1, 18)).toMatchObject({ estado: 'terminado', semana: 13 });
});

test('series según la semana del bloque', () => {
  expect([1, 2, 3, 4].map((w) => seriesDeSemana(ej({ basico: true }), w as 1))).toEqual([3, 4, 5, 2]);
  expect([1, 2, 3, 4].map((w) => seriesDeSemana(ej({ series: 3, basico: false }), w as 1))).toEqual([2, 3, 3, 2]);
  expect([1, 2, 3, 4].map((w) => seriesDeSemana(ej({ series: 3 }), w as 1))).toEqual([2, 3, 3, 2]);
  expect(seriesDeSemana(ej({ series: 2 }), 1)).toBe(2);
  expect(seriesDeSemana(ej({ series: 1 }), 4)).toBe(1);
  expect(seriesDeSemana(ej({ series: 5, basico: true }), 4)).toBe(3);
});

test('diaDeSemana aplica las series y respeta un día vacío', () => {
  const dia = { id: 'd', nombre: 'Torso A', ejercicios: [ej({ basico: true }), ej({ ejercicioId: 'y', series: 3 })] };
  expect(diaDeSemana(dia, 3).ejercicios.map((e) => e.series)).toEqual([5, 3]);
  expect(dia.ejercicios[0].series).toBe(4);
  expect(diaDeSemana({ id: 'v', nombre: 'Vacío', ejercicios: [] }, 4).ejercicios).toEqual([]);
});

test('peso de descarga', () => {
  expect(pesoDeDescarga(100, 2.5)).toBe(90);
  expect(pesoDeDescarga(52.5, 2.5)).toBe(47.5);
  expect(pesoDeDescarga(102.5, 2.5)).toBe(92.5);
  expect(pesoDeDescarga(null, 2.5)).toBeNull();
});

test('inicio del plan: este lunes o el próximo', () => {
  const mie = new Date(2026, 9, 28, 10);
  expect(inicioDelPlan('este', mie)).toBe('2026-10-26');
  expect(inicioDelPlan('proximo', mie)).toBe('2026-11-02');
  expect(inicioDelPlan('este', new Date(2026, 10, 1, 22))).toBe('2026-10-26');
});

test('entrenamientos de esta semana', () => {
  const t = (d: number, h = 18) => new Date(2026, 9, d, h).getTime();
  const sesiones = [
    { rutinaId: 'p', inicio: t(25), fin: t(25, 19) },
    { rutinaId: 'p', inicio: t(26), fin: t(26, 19) },
    { rutinaId: 'p', inicio: t(28), fin: t(28, 19) },
    { rutinaId: 'p', inicio: t(29), fin: null },
    { rutinaId: 'otra', inicio: t(27), fin: t(27, 19) },
  ];
  expect(sesionesDeLaSemana(sesiones, 'p', new Date(2026, 9, 29, 20))).toBe(2);
});

// ── Arreglos de la revisión ──
import { sugerirSiguiente, type SerieHecha } from '../../../src/core/progresion';

test('en 12 semanas haciendo todas las repeticiones, el peso de un básico sube', () => {
  const base = { ejercicioId: 'banca', series: 4, repsMin: 8, repsMax: 12, descansoSeg: 90, basico: true };
  const historial: { series: SerieHecha[]; descarga: boolean }[] = [];
  const pesos: number[] = [];
  let peso = 100;
  for (let semana = 1; semana <= 12; semana++) {
    const sb = (((semana - 1) % 4) + 1) as 1 | 2 | 3 | 4;
    const series = seriesDeSemana(base, sb);
    const sinDescarga = historial.filter((h) => !h.descarga).map((h) => h.series);
    const s = sugerirSiguiente(sinDescarga, { series, repsMin: 8, repsMax: 12 }, 'superior', 2.5);
    peso = s.peso ?? peso;
    const usado = sb === 4 ? pesoDeDescarga(peso, 2.5)! : peso;
    pesos.push(usado);
    historial.push({ series: Array.from({ length: series }, () => ({ peso: usado, reps: 12, completada: true })), descarga: sb === 4 });
  }
  const normales = pesos.filter((_, i) => (i + 1) % 4 !== 0);
  for (let i = 1; i < normales.length; i++) expect(normales[i], `semana ${i}`).toBeGreaterThanOrEqual(normales[i - 1]);
  expect(pesos[10]).toBeGreaterThan(pesos[0] + 10);
});

test('la descarga baja el peso aunque sea liviano', () => {
  expect(pesoDeDescarga(10, 2.5)).toBe(7.5);
  expect(pesoDeDescarga(12.5, 2.5)).toBe(10);
  expect(pesoDeDescarga(2.5, 2.5)).toBe(2.5);
});

test('con mancuernas no hay dominadas ni puentes como básicos', () => {
  for (const dias of [3, 4, 5, 6] as const) {
    for (const d of generarRutina(entrada({ dias, equipo: 'mancuernas' }), reales, id, 1).dias) {
      const ids = d.ejercicios.map((e) => e.ejercicioId);
      expect(ids.some((x) => x === 'Pullups' || x === 'Chin-Up'), d.nombre).toBe(false);
      expect(d.ejercicios.filter((e) => e.basico).map((e) => e.ejercicioId), d.nombre).not.toContain('Single_Leg_Glute_Bridge');
    }
  }
});

test('ningún día queda con menos de 3 ejercicios, tampoco para principiantes', () => {
  for (const nivel of ['principiante', 'intermedio'] as const)
    for (const equipo of ['gimnasio', 'mancuernas', 'casa'] as const)
      for (const dias of diasPermitidos(equipo))
        for (const d of generarRutina(entrada({ dias, equipo, nivel }), reales, id, 1).dias) expect(d.ejercicios.length, `${nivel}/${equipo}/${dias}/${d.nombre}`).toBeGreaterThanOrEqual(3);
});
