/** Redondea a 2 decimales para evitar errores de coma flotante (0,1 + 0,2). */
function limpiar(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Redondea un peso al múltiplo más cercano del incremento disponible (2,5 kg por defecto). */
export function redondearPeso(kg: number, incremento = 2.5): number {
  return limpiar(Math.round(kg / incremento) * incremento);
}

/** Lee un número escrito con coma o punto decimal. Devuelve null si está vacío o no es válido. */
export function parsearNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(limpio)) return null;
  return Number(limpio);
}

/** Suma o resta un paso al valor, sin bajar de `min`. Un valor vacío arranca desde `min`. */
export function sumarPaso(valor: number | null, paso: number, direccion: 1 | -1, min = 0): number {
  const base = valor ?? min;
  return Math.max(min, limpiar(base + paso * direccion));
}
