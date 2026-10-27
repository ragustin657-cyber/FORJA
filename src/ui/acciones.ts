import { diaDeSemana, pesoDeDescarga, semanaDelPlan } from '../core/planes';
import { sugerirSiguiente, type Sugerencia } from '../core/progresion';
import { crearSesion } from '../core/sesion';
import { nuevoId } from '../data/db';
import { ajustesRepo } from '../data/repos/ajustes';
import { ejerciciosRepo } from '../data/repos/ejercicios';
import { planesRepo } from '../data/repos/planes';
import { sesionesRepo } from '../data/repos/sesiones';
import type { DiaRutina, EjercicioEnDia, Rutina, SerieRegistrada } from '../data/tipos';

export type InfoEjercicio = { sugerencia: Sugerencia; ultima: SerieRegistrada[] };

/** Sugerencia de progresión y series de la última vez para un ejercicio de la rutina. */
export async function infoEjercicio(e: EjercicioEnDia): Promise<InfoEjercicio> {
  const [historial, ejercicio, ajustes] = await Promise.all([
    // Las sesiones de descarga (más livianas a propósito) no cuentan para sugerir el próximo peso.
    sesionesRepo.historialDeEjercicio(e.ejercicioId, { sinDescarga: true }),
    ejerciciosRepo.porId(e.ejercicioId),
    ajustesRepo.obtener(),
  ]);
  const sugerencia = sugerirSiguiente(historial, { series: e.series, repsMin: e.repsMin, repsMax: e.repsMax }, ejercicio?.tipo ?? 'superior', ajustes.incrementoKg);
  return { sugerencia, ultima: historial[historial.length - 1] ?? [] };
}

/** La semana del plan activo si la rutina es la del plan y el plan está en curso en esa fecha; si no, null. */
export async function semanaDeRutina(rutinaId: string, fecha: number): Promise<ReturnType<typeof semanaDelPlan> | null> {
  const plan = await planesRepo.activo();
  if (!plan || plan.rutinaId !== rutinaId) return null;
  const semana = semanaDelPlan(plan.inicio, new Date(fecha));
  return semana.estado === 'activo' ? semana : null;
}

/** En semana de descarga, la sugerencia de peso baja al 90 % (redondeada al incremento). */
export function sugerenciaDeSemana(s: Sugerencia, descarga: boolean, incremento: number): Sugerencia {
  return descarga ? { ...s, peso: pesoDeDescarga(s.peso, incremento) } : s;
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
  const ahora = Date.now();
  // Si es la rutina del plan, las series y el peso se ajustan a la semana del bloque.
  const semana = await semanaDeRutina(rutina.id, ahora);
  const delDia = semana ? diaDeSemana(dia, semana.semanaBloque) : dia;
  const { incrementoKg } = await ajustesRepo.obtener();
  const sugerencias: Record<string, Sugerencia> = {};
  const ultima: Record<string, SerieRegistrada[]> = {};
  for (const e of delDia.ejercicios) {
    const info = await infoEjercicio(e);
    sugerencias[e.ejercicioId] = sugerenciaDeSemana(info.sugerencia, semana?.descarga ?? false, incrementoKg);
    ultima[e.ejercicioId] = info.ultima;
  }
  const sesion = crearSesion(rutina, delDia, sugerencias, ultima, ahora, nuevoId());
  await sesionesRepo.guardar(semana?.descarga ? { ...sesion, descarga: true } : sesion);
}
