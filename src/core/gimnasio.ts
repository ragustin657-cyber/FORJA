// El gimnasio real: alternativas cuando una máquina está ocupada y recorte de la sesión por tiempo.
import type { Patrones } from './planes';

type EjercicioBase = { id: string; nombre: string; musculos: string[]; tipo: 'superior' | 'inferior'; archivado: boolean };

const MAX_ALTERNATIVAS = 5;
const MIN_ALTERNATIVAS = 3;
const SEG_POR_SERIE = 45;
const DESCANSO_CORTO = 60;
const SERIES_ACCESORIO = 2;
const ACCESORIOS_MINIMOS = 2;

/**
 * Hasta 5 ejercicios equivalentes: primero los del mismo patrón de movimiento (en el orden de los planes),
 * después del mismo músculo principal y tipo, con los traducidos primero. Nunca los que ya están en la sesión.
 */
export function alternativas(ejercicioId: string, todos: EjercicioBase[], patrones: Patrones, traducidos: Set<string>, enSesion: Set<string>): string[] {
  const porId = new Map(todos.map((e) => [e.id, e]));
  const actual = porId.get(ejercicioId);
  if (!actual) return [];
  const sirve = (id: string) => id !== ejercicioId && !enSesion.has(id) && porId.has(id) && !porId.get(id)!.archivado;
  const salida: string[] = [];
  const sumar = (id: string) => {
    if (sirve(id) && !salida.includes(id) && salida.length < MAX_ALTERNATIVAS) salida.push(id);
  };
  for (const porEquipo of Object.values(patrones)) {
    const ids = [...porEquipo.gimnasio, ...porEquipo.mancuernas, ...porEquipo.casa];
    if (ids.includes(ejercicioId)) ids.forEach(sumar);
  }
  if (salida.length < MIN_ALTERNATIVAS) {
    todos
      .filter((e) => e.musculos[0] === actual.musculos[0] && e.tipo === actual.tipo)
      .sort((a, b) => Number(traducidos.has(b.id)) - Number(traducidos.has(a.id)) || a.nombre.localeCompare(b.nombre, 'es'))
      .forEach((e) => sumar(e.id));
  }
  return salida;
}

export type ItemTiempo = { ejercicioId: string; pendientes: number; completadas: number; descansoSeg: number; basico: boolean };
export type Recorte = { quitar: string[]; reducir: { ejercicioId: string; pendientes: number }[]; descansoMaxSeg: number | null; minutos: number; alcanza: boolean };

/** Minutos que faltan: cada serie pendiente cuenta 45 s más su descanso. */
export function estimarMinutos(items: ItemTiempo[], descansoMaxSeg?: number | null): number {
  return items.reduce((t, i) => t + i.pendientes * (SEG_POR_SERIE + Math.min(i.descansoSeg, descansoMaxSeg ?? Infinity)), 0) / 60;
}

/**
 * Recorte para que lo pendiente entre en `minutos`, sin tocar los básicos:
 * 1) saca accesorios del final (deja al menos 2); 2) deja los accesorios en 2 series;
 * 3) saca los accesorios que quedan; 4) acorta los descansos a 60 s.
 */
export function planRecorte(items: ItemTiempo[], minutos: number): Recorte {
  let actuales = items.filter((i) => i.pendientes > 0);
  const quitar: string[] = [];
  const reducidos = new Map<string, number>();
  const entra = (descanso: number | null = null) => estimarMinutos(actuales, descanso) <= minutos;
  const accesorios = () => actuales.filter((i) => !i.basico);
  const sacarUltimoAccesorio = () => {
    const ultimo = accesorios().pop()!;
    quitar.push(ultimo.ejercicioId);
    reducidos.delete(ultimo.ejercicioId);
    actuales = actuales.filter((i) => i !== ultimo);
  };

  while (!entra() && accesorios().length > ACCESORIOS_MINIMOS) sacarUltimoAccesorio();
  if (!entra()) {
    actuales = actuales.map((i) => {
      const tope = Math.max(0, SERIES_ACCESORIO - i.completadas);
      if (i.basico || i.pendientes <= tope) return i;
      reducidos.set(i.ejercicioId, tope);
      return { ...i, pendientes: tope };
    });
  }
  while (!entra() && accesorios().length > 0) sacarUltimoAccesorio();
  const descansoMaxSeg = entra() ? null : DESCANSO_CORTO;
  return {
    quitar,
    reducir: [...reducidos].map(([ejercicioId, pendientes]) => ({ ejercicioId, pendientes })),
    descansoMaxSeg,
    minutos: estimarMinutos(actuales, descansoMaxSeg),
    alcanza: entra(descansoMaxSeg),
  };
}
