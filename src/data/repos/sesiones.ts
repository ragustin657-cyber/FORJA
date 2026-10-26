import { almacen } from '../db';
import type { SerieRegistrada, Sesion } from '../tipos';

const tabla = () => almacen().tabla<Sesion>('sesiones');

async function terminadas(): Promise<Sesion[]> {
  return (await tabla().todos()).filter((s) => s.fin !== null).sort((a, b) => a.inicio - b.inicio);
}

export const sesionesRepo = {
  async enCurso(): Promise<Sesion | undefined> {
    return (await tabla().todos()).find((s) => s.fin === null);
  },
  porId: (id: string) => tabla().porId(id),
  guardar: (s: Sesion) => tabla().poner(s),
  async finalizar(id: string, fin: number) {
    const s = await tabla().porId(id);
    if (s) await tabla().poner({ ...s, fin });
  },
  descartar: (id: string) => tabla().borrar(id),
  /** Sesiones terminadas, de la más nueva a la más vieja. */
  async finalizadas(): Promise<Sesion[]> {
    return (await terminadas()).reverse();
  },
  /** Series de un ejercicio por sesión terminada, de la más vieja a la más nueva. */
  async historialDeEjercicio(ejercicioId: string): Promise<SerieRegistrada[][]> {
    return (await terminadas())
      .map((s) => s.series.filter((x) => x.ejercicioId === ejercicioId))
      .filter((series) => series.length > 0);
  },
  /** Igual que historialDeEjercicio, con la fecha de cada sesión. */
  async historialConFechas(ejercicioId: string): Promise<{ fecha: number; series: SerieRegistrada[] }[]> {
    return (await terminadas())
      .map((s) => ({ fecha: s.inicio, series: s.series.filter((x) => x.ejercicioId === ejercicioId) }))
      .filter((x) => x.series.length > 0);
  },
  /** Ids de ejercicios que aparecen en sesiones terminadas. */
  async ejerciciosConHistorial(): Promise<string[]> {
    return [...new Set((await terminadas()).flatMap((s) => s.series.map((x) => x.ejercicioId)))];
  },
  async ultimaDeDia(diaId: string): Promise<Sesion | undefined> {
    return (await terminadas()).filter((s) => s.diaId === diaId).pop();
  },
};
