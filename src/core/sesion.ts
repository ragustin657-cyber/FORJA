import type { DiaRutina, Rutina, SerieRegistrada, Sesion } from '../data/tipos';
import { kg } from './formato';
import type { Sugerencia } from './progresion';

export type Accion =
  | { tipo: 'cambiar'; ejercicioId: string; numero: number; campo: 'peso' | 'reps'; valor: number | null }
  | { tipo: 'completar'; ejercicioId: string; numero: number }
  | { tipo: 'descompletar'; ejercicioId: string; numero: number }
  | { tipo: 'agregar'; ejercicioId: string };

/**
 * Arma una sesión nueva para un día de rutina. Un peso 0 significa "todavía sin elegir".
 * Las reps vienen de la misma serie de la última vez o, si no hay, del tope del rango.
 */
export function crearSesion(
  rutina: Rutina,
  dia: DiaRutina,
  sugerencias: Record<string, Sugerencia>,
  ultima: Record<string, SerieRegistrada[]>,
  ahora: number,
  id: string,
): Sesion {
  const series: SerieRegistrada[] = [];
  for (const e of dia.ejercicios) {
    const anteriores = ultima[e.ejercicioId] ?? [];
    for (let n = 1; n <= e.series; n++) {
      series.push({
        ejercicioId: e.ejercicioId,
        numero: n,
        peso: sugerencias[e.ejercicioId]?.peso ?? 0,
        reps: anteriores.find((s) => s.numero === n)?.reps ?? e.repsMax,
        completada: false,
      });
    }
  }
  return { id, rutinaId: rutina.id, diaId: dia.id, inicio: ahora, fin: null, series };
}

function actualizar(s: Sesion, ejercicioId: string, numero: number, cambio: (x: SerieRegistrada) => SerieRegistrada): Sesion {
  return { ...s, series: s.series.map((x) => (x.ejercicioId === ejercicioId && x.numero === numero ? cambio(x) : x)) };
}

export function reducirSesion(s: Sesion, a: Accion): Sesion {
  switch (a.tipo) {
    case 'cambiar':
      return actualizar(s, a.ejercicioId, a.numero, (x) => ({ ...x, [a.campo]: Math.max(0, a.valor ?? 0) }));
    case 'completar':
      return actualizar(s, a.ejercicioId, a.numero, (x) => (x.peso > 0 && x.reps >= 1 ? { ...x, completada: true } : x));
    case 'descompletar':
      return actualizar(s, a.ejercicioId, a.numero, (x) => ({ ...x, completada: false }));
    case 'agregar': {
      const propias = s.series.filter((x) => x.ejercicioId === a.ejercicioId);
      const ultima = propias[propias.length - 1];
      const nueva: SerieRegistrada = { ejercicioId: a.ejercicioId, numero: propias.length + 1, peso: ultima?.peso ?? 0, reps: ultima?.reps ?? 0, completada: false };
      const indice = s.series.lastIndexOf(ultima as SerieRegistrada);
      const series = [...s.series];
      series.splice(indice + 1, 0, nueva);
      return { ...s, series };
    }
  }
}

/** "60 kg × 10, 10, 9" o, con pesos distintos, "60 kg × 10 · 62,5 kg × 8". Solo series completadas. */
export function resumenSeries(series: SerieRegistrada[]): string {
  const grupos: { peso: number; reps: number[] }[] = [];
  for (const s of series.filter((x) => x.completada)) {
    const g = grupos[grupos.length - 1];
    if (g && g.peso === s.peso) g.reps.push(s.reps);
    else grupos.push({ peso: s.peso, reps: [s.reps] });
  }
  return grupos.map((g) => `${kg(g.peso)} × ${g.reps.join(', ')}`).join(' · ');
}

export function textoSugerencia(s: Sugerencia): string {
  switch (s.motivo) {
    case 'subir':
      return `¡Subí a ${kg(s.peso!)}!`;
    case 'mantener':
      return `Mantené ${kg(s.peso!)} y sumá repeticiones`;
    case 'bajar':
      return `Bajá a ${kg(s.peso!)} y reconstruí`;
    case 'primera-vez':
      return 'Primera vez: elegí un peso cómodo';
  }
}
