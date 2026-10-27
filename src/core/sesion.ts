import type { DiaRutina, Rutina, SerieRegistrada, Sesion } from '../data/tipos';
import { kg } from './formato';
import type { Sugerencia } from './progresion';

export type Accion =
  | { tipo: 'cambiar'; ejercicioId: string; numero: number; campo: 'peso' | 'reps'; valor: number | null }
  | { tipo: 'completar'; ejercicioId: string; numero: number; sinPeso?: boolean }
  | { tipo: 'descompletar'; ejercicioId: string; numero: number }
  | { tipo: 'agregar'; ejercicioId: string }
  | { tipo: 'reemplazar'; ejercicioId: string; nuevoId: string; peso: number | null }
  | { tipo: 'recortar'; quitar: string[]; reducir: { ejercicioId: string; pendientes: number }[]; descansoMaxSeg: number | null };

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
      return actualizar(s, a.ejercicioId, a.numero, (x) => {
        const v = Math.max(0, a.valor ?? 0);
        return { ...x, [a.campo]: a.campo === 'reps' ? Math.round(v) : v };
      });
    case 'completar':
      return actualizar(s, a.ejercicioId, a.numero, (x) => ((x.peso > 0 || a.sinPeso) && x.reps >= 1 ? { ...x, completada: true } : x));
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
    case 'reemplazar': {
      // Las series hechas quedan con el ejercicio original; las pendientes pasan al nuevo, en el mismo lugar.
      let n = 0;
      const series = s.series.map((x) =>
        x.ejercicioId === a.ejercicioId && !x.completada ? { ...x, ejercicioId: a.nuevoId, numero: ++n, peso: a.peso ?? 0 } : x,
      );
      const previos = s.cambios ?? [];
      const encadenado = previos.find((c) => c.a === a.ejercicioId);
      const cambios = encadenado
        ? previos.map((c) => (c === encadenado ? { ...c, a: a.nuevoId } : c))
        : [...previos, { de: a.ejercicioId, a: a.nuevoId }];
      return { ...s, series, cambios };
    }
    case 'recortar': {
      const pendientesVistas = new Map<string, number>();
      const series = s.series.filter((x) => {
        if (x.completada) return true;
        if (a.quitar.includes(x.ejercicioId)) return false;
        const limite = a.reducir.find((r) => r.ejercicioId === x.ejercicioId)?.pendientes;
        if (limite === undefined) return true;
        const vistas = (pendientesVistas.get(x.ejercicioId) ?? 0) + 1;
        pendientesVistas.set(x.ejercicioId, vistas);
        return vistas <= limite;
      });
      return a.descansoMaxSeg === null ? { ...s, series } : { ...s, series, descansoMaxSeg: a.descansoMaxSeg };
    }
  }
}

/** "60 kg × 10, 10, 9", con pesos distintos "60 kg × 10 · 62,5 kg × 8", sin peso "10, 8 reps". Solo series completadas. */
export function resumenSeries(series: SerieRegistrada[]): string {
  const grupos: { peso: number; reps: number[] }[] = [];
  for (const s of series.filter((x) => x.completada)) {
    const g = grupos[grupos.length - 1];
    if (g && g.peso === s.peso) g.reps.push(s.reps);
    else grupos.push({ peso: s.peso, reps: [s.reps] });
  }
  return grupos.map((g) => (g.peso > 0 ? `${kg(g.peso)} × ${g.reps.join(', ')}` : `${g.reps.join(', ')} reps`)).join(' · ');
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
