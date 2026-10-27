// Nivel sugerido a partir del perfil, el último peso y las sesiones de los ejercicios básicos.
import { GRUPOS, nivelSugerido, type Grupo } from '../core/nivel';
import { e1rm, mejorSerie } from '../core/progresion';
import type { Nivel } from '../core/proyeccion';
import { ajustesRepo } from '../data/repos/ajustes';
import { nutricionRepo } from '../data/repos/nutricion';
import { sesionesRepo } from '../data/repos/sesiones';

/** El nivel que indican tus números, o null si no hay datos o coincide con el elegido. */
export async function cargarSugerencia(): Promise<{ nivel: Nivel; grupos: Grupo[] } | null> {
  const [perfil, peso, ajustes] = await Promise.all([nutricionRepo.perfil(), nutricionRepo.pesoActual(), ajustesRepo.obtener()]);
  if (!perfil || peso === undefined) return null;
  const ids = Object.values(GRUPOS).flat();
  const sesiones = (
    await Promise.all(
      ids.map(async (ejercicioId) =>
        (await sesionesRepo.historialConFechas(ejercicioId)).flatMap(({ fecha, series }) => {
          const m = mejorSerie(series);
          const valor = m && e1rm(m.peso, m.reps);
          return valor ? [{ ejercicioId, fecha, e1rm: valor }] : [];
        }),
      ),
    )
  ).flat();
  const s = nivelSugerido(perfil.sexo, peso, sesiones, Date.now());
  return s && s.nivel !== ajustes.nivel ? s : null;
}
