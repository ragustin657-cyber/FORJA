import type { SerieRegistrada } from '../data/tipos';
import { kg } from './formato';
import { e1rm, mejorSerie } from './progresion';

export type Records = { mejorE1rm: number | null; mayorPeso: number | null; repsPorPeso: Record<number, number> };
export type NuevoRecord = { tipo: 'e1rm' | 'peso' | 'reps'; valor: number; peso?: number };
export type PuntoProgreso = { fecha: number; e1rm: number; peso: number; reps: number };

const completadas = (series: SerieRegistrada[]) => series.filter((s) => s.completada && s.peso > 0 && s.reps > 0);

function maximo(actual: number | null, nuevo: number | null): number | null {
  if (nuevo === null) return actual;
  return actual === null || nuevo > actual ? nuevo : actual;
}

/** Mejores marcas de un ejercicio a partir de su historial (solo series completadas). */
export function calcularRecords(historial: SerieRegistrada[][]): Records {
  const r: Records = { mejorE1rm: null, mayorPeso: null, repsPorPeso: {} };
  for (const s of completadas(historial.flat())) {
    r.mejorE1rm = maximo(r.mejorE1rm, e1rm(s.peso, s.reps));
    r.mayorPeso = maximo(r.mayorPeso, s.peso);
    r.repsPorPeso[s.peso] = Math.max(r.repsPorPeso[s.peso] ?? 0, s.reps);
  }
  return r;
}

/** Récords que una sesión supera respecto de los anteriores. La primera sesión de un ejercicio no cuenta. */
export function detectarRecords(previos: Records, sesion: SerieRegistrada[]): NuevoRecord[] {
  if (previos.mayorPeso === null) return [];
  const ahora = calcularRecords([sesion]);
  const nuevos: NuevoRecord[] = [];
  if (previos.mejorE1rm !== null && ahora.mejorE1rm !== null && ahora.mejorE1rm > previos.mejorE1rm) {
    nuevos.push({ tipo: 'e1rm', valor: ahora.mejorE1rm });
  }
  if (ahora.mayorPeso !== null && ahora.mayorPeso > previos.mayorPeso) nuevos.push({ tipo: 'peso', valor: ahora.mayorPeso });
  for (const [peso, reps] of Object.entries(ahora.repsPorPeso)) {
    const antes = previos.repsPorPeso[Number(peso)];
    if (antes !== undefined && reps > antes) nuevos.push({ tipo: 'reps', valor: reps, peso: Number(peso) });
  }
  return nuevos;
}

/** Un punto por sesión con la mejor serie (para el gráfico de fuerza). Sesiones sin serie válida se omiten. */
export function puntosDeProgreso(sesiones: { fecha: number; series: SerieRegistrada[] }[]): PuntoProgreso[] {
  const puntos: PuntoProgreso[] = [];
  for (const { fecha, series } of sesiones) {
    const m = mejorSerie(series);
    if (m) puntos.push({ fecha, e1rm: e1rm(m.peso, m.reps)!, peso: m.peso, reps: m.reps });
  }
  return puntos;
}

export type RecordReciente = { fecha: number; ejercicioId: string; record: NuevoRecord };
const IMPORTANCIA: Record<NuevoRecord['tipo'], number> = { peso: 0, reps: 1, e1rm: 2 };

/**
 * Récords conseguidos en cada sesión (uno por ejercicio y sesión: el más importante), el más nuevo primero.
 * `sesiones` va de la más vieja a la más nueva.
 */
export function recordsRecientes(sesiones: { inicio: number; series: SerieRegistrada[] }[], limite: number): RecordReciente[] {
  const historial = new Map<string, SerieRegistrada[][]>();
  const salida: RecordReciente[] = [];
  for (const s of sesiones) {
    for (const ejercicioId of new Set(s.series.map((x) => x.ejercicioId))) {
      const propias = s.series.filter((x) => x.ejercicioId === ejercicioId);
      const previo = historial.get(ejercicioId) ?? [];
      const nuevos = detectarRecords(calcularRecords(previo), propias).sort((a, b) => IMPORTANCIA[a.tipo] - IMPORTANCIA[b.tipo]);
      if (nuevos.length > 0) salida.push({ fecha: s.inicio, ejercicioId, record: nuevos[0] });
      historial.set(ejercicioId, [...previo, propias]);
    }
  }
  return salida.reverse().slice(0, limite);
}

/** "Press 62,5 kg", "Press 11 reps con 60 kg" o "Press: fuerza estimada 84 kg". */
export function descripcionRecord(nombre: string, r: NuevoRecord): string {
  switch (r.tipo) {
    case 'peso':
      return `${nombre} ${kg(r.valor)}`;
    case 'reps':
      return `${nombre} ${r.valor} reps con ${kg(r.peso!)}`;
    case 'e1rm':
      return `${nombre}: fuerza estimada ${kg(Math.round(r.valor))}`;
  }
}
