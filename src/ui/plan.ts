// El plan activo con su rutina, la semana en curso y los entrenamientos de esta semana.
import { semanaDelPlan, sesionesDeLaSemana } from '../core/planes';
import { planesRepo, type Plan } from '../data/repos/planes';
import { rutinasRepo } from '../data/repos/rutinas';
import { sesionesRepo } from '../data/repos/sesiones';
import type { Rutina } from '../data/tipos';

export type PlanCargado = { plan: Plan; rutina: Rutina; semana: ReturnType<typeof semanaDelPlan>; estaSemana: number };

export async function cargarPlan(ahora = new Date()): Promise<PlanCargado | null> {
  const plan = await planesRepo.activo();
  if (!plan) return null;
  const rutina = await rutinasRepo.porId(plan.rutinaId);
  if (!rutina) return null;
  return { plan, rutina, semana: semanaDelPlan(plan.inicio, ahora), estaSemana: sesionesDeLaSemana(await sesionesRepo.finalizadas(), plan.rutinaId, ahora) };
}

/** "2/11" a partir de "2026-11-02". */
export function diaMes(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number);
  return `${d}/${m}`;
}

export const textoSemana = (s: { semana: number; bloque: number }) => `Semana ${s.semana} de 12 · Bloque ${s.bloque}`;
