import { redondearPeso } from './unidades';

export type SerieHecha = { peso: number; reps: number; completada: boolean };
export type Objetivo = { series: number; repsMin: number; repsMax: number };
export type TipoEjercicio = 'superior' | 'inferior';
export type Sugerencia = { peso: number | null; motivo: 'subir' | 'mantener' | 'bajar' | 'primera-vez' };

/** Aumento sugerido según el tipo de ejercicio. */
const AUMENTO: Record<TipoEjercicio, number> = { superior: 2.5, inferior: 5 };
/** Factor aplicado tras dos caídas seguidas de rendimiento. */
const FACTOR_BAJA = 0.9;
const REPS_MAX_E1RM = 15;

/** Fuerza máxima estimada (fórmula de Epley). Null si las repeticiones o el peso no sirven para estimar. */
export function e1rm(peso: number, reps: number): number | null {
  if (peso <= 0 || reps < 1 || reps > REPS_MAX_E1RM) return null;
  return peso * (1 + reps / 30);
}

/** La serie completada con mayor fuerza estimada, o null si no hay ninguna válida. */
export function mejorSerie(series: SerieHecha[]): SerieHecha | null {
  let mejor: SerieHecha | null = null;
  let mejorValor = -Infinity;
  for (const s of series) {
    if (!s.completada) continue;
    const valor = e1rm(s.peso, s.reps);
    if (valor !== null && valor > mejorValor) {
      mejor = s;
      mejorValor = valor;
    }
  }
  return mejor;
}

function valorSesion(series: SerieHecha[]): number | null {
  const m = mejorSerie(series);
  return m && e1rm(m.peso, m.reps);
}

/**
 * Sugerencia de peso para la próxima sesión con doble progresión.
 * `historial` va de la sesión más vieja a la más nueva, solo con las series de este ejercicio.
 */
export function sugerirSiguiente(historial: SerieHecha[][], objetivo: Objetivo, tipo: TipoEjercicio, incremento = 2.5): Sugerencia {
  const sesiones = historial.filter((s) => s.some((x) => x.completada && x.peso > 0));
  if (sesiones.length === 0) return { peso: null, motivo: 'primera-vez' };

  const ultima = sesiones[sesiones.length - 1].filter((x) => x.completada && x.peso > 0);
  const base = Math.max(...ultima.map((x) => x.peso));

  const ultimas3 = sesiones.slice(-3).map(valorSesion);
  if (ultimas3.length === 3 && ultimas3.every((v) => v !== null)) {
    const [a, b, c] = ultimas3 as number[];
    if (a > b && b > c) return { peso: redondearPeso(base * FACTOR_BAJA, incremento), motivo: 'bajar' };
  }

  const alTope = ultima.filter((x) => x.peso === base && x.reps >= objetivo.repsMax).length;
  if (alTope >= objetivo.series) return { peso: redondearPeso(base + AUMENTO[tipo], incremento), motivo: 'subir' };

  return { peso: base, motivo: 'mantener' };
}
