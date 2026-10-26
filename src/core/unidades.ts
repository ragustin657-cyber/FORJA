/** Redondea a 2 decimales para evitar errores de coma flotante (0,1 + 0,2). */
function limpiar(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Suma o resta un paso al valor, sin bajar de `min`. Un valor vacío arranca desde `min`. */
export function sumarPaso(valor: number | null, paso: number, direccion: 1 | -1, min = 0): number {
  const base = valor ?? min;
  return Math.max(min, limpiar(base + paso * direccion));
}
