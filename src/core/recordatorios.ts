const TREINTA_DIAS = 30 * 86_400_000;

/** El recordatorio de copia aparece si hay entrenamientos guardados y la última copia tiene 30 días o más (o nunca se hizo). */
export function necesitaCopia(ultimaCopia: number | null, hayDatos: boolean, ahora: number): boolean {
  if (!hayDatos) return false;
  return ultimaCopia === null || ahora - ultimaCopia >= TREINTA_DIAS;
}
