/** Formatos de texto para mostrar en pantalla (es-AR). */

export function kg(n: number): string {
  return `${String(Math.round(n * 100) / 100).replace('.', ',')} kg`;
}

export function numero(n: number, decimales = 1): string {
  return (Math.round(n * 10 ** decimales) / 10 ** decimales).toString().replace('.', ',');
}

function inicioDelDia(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function fechaRelativa(t: number, ahora = Date.now()): string {
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(t)) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export function duracion(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
