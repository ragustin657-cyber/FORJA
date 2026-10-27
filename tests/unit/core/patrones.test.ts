import { expect, test } from 'bun:test';
import ejercicios from '../../../src/contenido/ejercicios.json';
import patrones from '../../../src/contenido/patrones.json';

const PATRONES = ['sentadilla', 'bisagra', 'empuje-horizontal', 'empuje-vertical', 'tiron-horizontal', 'tiron-vertical', 'unilateral', 'femoral', 'cuadriceps', 'gemelos', 'pecho-aislado', 'hombro-lateral', 'hombro-posterior', 'biceps', 'triceps', 'core'];
const PERMITIDO: Record<string, string[] | null> = { gimnasio: null, mancuernas: ['dumbbell', 'body only', 'bands'], casa: ['body only', 'bands'] };
const porId = new Map((ejercicios as { id: string; equipo: string; traducido: boolean }[]).map((e) => [e.id, e]));
const P = patrones as Record<string, Record<string, string[]>>;

test('están los 16 patrones', () => {
  expect(Object.keys(P).sort()).toEqual([...PATRONES].sort());
});

test('cada candidato existe, está traducido y encaja con su equipo', () => {
  for (const [patron, porEquipo] of Object.entries(P)) {
    for (const [equipo, ids] of Object.entries(porEquipo)) {
      for (const id of ids) {
        const e = porId.get(id);
        expect(e, `${patron}/${equipo}/${id}`).toBeDefined();
        expect(e!.traducido, id).toBe(true);
        if (PERMITIDO[equipo]) expect(PERMITIDO[equipo], `${id} (${e!.equipo}) en ${equipo}`).toContain(e!.equipo);
      }
    }
  }
});

test('cobertura mínima por equipo', () => {
  for (const p of PATRONES) {
    expect(P[p].gimnasio.length, p).toBeGreaterThanOrEqual(2);
    expect(P[p].mancuernas.length, p).toBeGreaterThanOrEqual(1);
    expect(P[p].mancuernas, p).not.toContain('Pullups');
  }
  for (const p of ['sentadilla', 'bisagra', 'empuje-horizontal', 'unilateral', 'core']) expect(P[p].casa.length, p).toBeGreaterThanOrEqual(1);
  expect(P['tiron-horizontal'].casa.length + P['tiron-vertical'].casa.length).toBeGreaterThanOrEqual(1);
});
