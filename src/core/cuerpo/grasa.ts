// % de grasa corporal estimado con la fórmula de la Marina de EE. UU. (cm, log10).
import type { Medidas, RegistroMedidas } from './medidas';

export type Sexo = 'hombre' | 'mujer';

export function grasaCorporal(sexo: Sexo, alturaCm: number, m: Medidas): number | null {
  const { cintura, cuello, cadera } = m;
  if (cintura === undefined || cuello === undefined || (sexo === 'mujer' && cadera === undefined)) return null;
  const base = sexo === 'hombre' ? cintura - cuello : cintura + cadera! - cuello;
  if (base <= 0) return null;
  const [a, b, c] = sexo === 'hombre' ? [1.0324, 0.19077, 0.15456] : [1.29579, 0.35004, 0.221];
  const pct = 495 / (a - b * Math.log10(base) + c * Math.log10(alturaCm)) - 450;
  return pct >= 2 && pct <= 60 ? Math.round(pct * 10) / 10 : null;
}

export function serieDeGrasa(sexo: Sexo, alturaCm: number, registros: RegistroMedidas[]): { fecha: number; valor: number }[] {
  return [...registros]
    .sort((a, b) => a.fecha - b.fecha)
    .flatMap((r) => {
      const valor = grasaCorporal(sexo, alturaCm, r);
      return valor === null ? [] : [{ fecha: r.fecha, valor }];
    });
}

/** La estimación del último registro que tenga las medidas necesarias. */
export function grasaActual(sexo: Sexo, alturaCm: number, registros: RegistroMedidas[]): number | null {
  return serieDeGrasa(sexo, alturaCm, registros).pop()?.valor ?? null;
}
