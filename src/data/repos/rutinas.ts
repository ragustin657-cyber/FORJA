import { almacen } from '../db';
import type { Rutina } from '../tipos';

const tabla = () => almacen().tabla<Rutina>('rutinas');

export const rutinasRepo = {
  /** Rutinas no archivadas, de la más vieja a la más nueva. */
  async activas(): Promise<Rutina[]> {
    return (await tabla().todos()).filter((r) => !r.archivado).sort((a, b) => a.creada - b.creada);
  },
  porId: (id: string) => tabla().porId(id),
  guardar: (r: Rutina) => tabla().poner(r),
  async archivar(id: string) {
    const r = await tabla().porId(id);
    if (r) await tabla().poner({ ...r, archivado: true });
  },
};
