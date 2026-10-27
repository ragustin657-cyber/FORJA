// Peso corporal: recordatorio semanal y tendencia.
const DIA = 86_400_000;

export interface PuntoPeso {
  fecha: number;
  kg: number;
}

/** true si nunca se pesó o pasaron 7 días o más desde el último peso. */
export function necesitaPesarse(ultimaFecha: number | undefined, ahora: number): boolean {
  return ultimaFecha === undefined || ahora - ultimaFecha >= 7 * DIA;
}

/** Para cada peso, el promedio de los pesos de los últimos `dias` días (incluido ese). */
export function promedioMovil(pesos: PuntoPeso[], dias = 7): PuntoPeso[] {
  const orden = [...pesos].sort((a, b) => a.fecha - b.fecha);
  return orden.map((p) => {
    const ventana = orden.filter((q) => q.fecha <= p.fecha && q.fecha > p.fecha - dias * DIA);
    return { fecha: p.fecha, kg: ventana.reduce((t, q) => t + q.kg, 0) / ventana.length };
  });
}
