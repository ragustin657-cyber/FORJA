import type { Equipo, ObjetivoPlan } from '../../core/planes';
import { almacen } from '../db';
import type { Rutina } from '../tipos';
import { rutinasRepo } from './rutinas';

export interface Plan {
  id: string;
  rutinaId: string;
  objetivo: ObjetivoPlan;
  dias: 3 | 4 | 5 | 6;
  equipo: Equipo;
  /** Lunes de la semana 1, AAAA-MM-DD. */
  inicio: string;
  creado: number;
  estado: 'activo' | 'terminado' | 'cortado';
}

const tabla = () => almacen().tabla<Plan>('planes');

export const planesRepo = {
  /** El plan activo, si su rutina sigue existiendo. Si la rutina se borró, el plan pasa a cortado. */
  async activo(): Promise<Plan | undefined> {
    const plan = (await tabla().todos()).filter((p) => p.estado === 'activo').sort((a, b) => b.creado - a.creado)[0];
    if (!plan) return undefined;
    const rutina = await rutinasRepo.porId(plan.rutinaId);
    if (!rutina || rutina.archivado) {
      await tabla().poner({ ...plan, estado: 'cortado' });
      return undefined;
    }
    return plan;
  },
  /** Guarda la rutina y el plan nuevo; el plan activo anterior queda cortado (su rutina se conserva). */
  async crear(plan: Plan, rutina: Rutina) {
    await rutinasRepo.guardar(rutina);
    for (const p of await tabla().todos()) if (p.estado === 'activo') await tabla().poner({ ...p, estado: 'cortado' });
    await tabla().poner(plan);
  },
  async cambiarEstado(id: string, estado: Plan['estado']) {
    const p = await tabla().porId(id);
    if (p) await tabla().poner({ ...p, estado });
  },
};
