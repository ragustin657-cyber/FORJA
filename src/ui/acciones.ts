import { sugerirSiguiente, type Sugerencia } from '../core/progresion';
import { crearSesion } from '../core/sesion';
import { nuevoId } from '../data/db';
import { ajustesRepo } from '../data/repos/ajustes';
import { ejerciciosRepo } from '../data/repos/ejercicios';
import { sesionesRepo } from '../data/repos/sesiones';
import type { DiaRutina, EjercicioEnDia, Rutina, SerieRegistrada } from '../data/tipos';

export type InfoEjercicio = { sugerencia: Sugerencia; ultima: SerieRegistrada[] };

/** Sugerencia de progresión y series de la última vez para un ejercicio de la rutina. */
export async function infoEjercicio(e: EjercicioEnDia): Promise<InfoEjercicio> {
  const [historial, ejercicio, ajustes] = await Promise.all([
    sesionesRepo.historialDeEjercicio(e.ejercicioId),
    ejerciciosRepo.porId(e.ejercicioId),
    ajustesRepo.obtener(),
  ]);
  const sugerencia = sugerirSiguiente(historial, { series: e.series, repsMin: e.repsMin, repsMax: e.repsMax }, ejercicio?.tipo ?? 'superior', ajustes.incrementoKg);
  return { sugerencia, ultima: historial[historial.length - 1] ?? [] };
}

let empezando: Promise<void> | null = null;

/** Crea y guarda la sesión del día, salvo que ya haya una en curso. Un doble toque no crea dos. */
export function empezarDia(rutina: Rutina, dia: DiaRutina): Promise<void> {
  empezando ??= crearSiNoHay(rutina, dia).finally(() => {
    empezando = null;
  });
  return empezando;
}

async function crearSiNoHay(rutina: Rutina, dia: DiaRutina): Promise<void> {
  if (await sesionesRepo.enCurso()) return;
  const sugerencias: Record<string, Sugerencia> = {};
  const ultima: Record<string, SerieRegistrada[]> = {};
  for (const e of dia.ejercicios) {
    const info = await infoEjercicio(e);
    sugerencias[e.ejercicioId] = info.sugerencia;
    ultima[e.ejercicioId] = info.ultima;
  }
  await sesionesRepo.guardar(crearSesion(rutina, dia, sugerencias, ultima, Date.now(), nuevoId()));
}
