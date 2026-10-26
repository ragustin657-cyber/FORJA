import type { DiaRutina, Rutina } from '../data/tipos';

/**
 * El día que sigue al último entrenado, salteando los días sin ejercicios.
 * Sin historial (o si ese día ya no existe) arranca por el primero. Si todos están vacíos, devuelve el primero.
 */
export function proximoDia(rutina: Rutina, ultimoDiaId: string | null): DiaRutina | undefined {
  const n = rutina.dias.length;
  const i = rutina.dias.findIndex((d) => d.id === ultimoDiaId);
  const inicio = i === -1 ? 0 : i + 1;
  for (let k = 0; k < n; k++) {
    const dia = rutina.dias[(inicio + k) % n];
    if (dia.ejercicios.length > 0) return dia;
  }
  return rutina.dias[0];
}
