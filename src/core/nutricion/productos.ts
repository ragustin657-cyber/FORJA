// Productos envasados: respuesta de Open Food Facts y etiqueta cargada a mano.
import type { Producto } from './tipos';

const dos = (n: number) => Math.round(n * 100) / 100;

function numero(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim().replace(',', '.')) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Interpreta la respuesta de la API v2 de Open Food Facts. null = no encontrado o sin datos suficientes. */
export function leerProductoOFF(codigo: string, json: unknown): Producto | null {
  if (!json || typeof json !== 'object') return null;
  const { status, product } = json as { status?: unknown; product?: Record<string, unknown> };
  if (status !== 1 || !product) return null;
  const n = (product.nutriments ?? {}) as Record<string, unknown>;
  const kj = numero(n.energy_100g);
  const kcal = numero(n['energy-kcal_100g']) ?? (kj === null ? null : kj / 4.184);
  const macros = [numero(n.proteins_100g), numero(n.fat_100g), numero(n.carbohydrates_100g)];
  if (kcal === null || macros.every((m) => m === null)) return null;
  const [proteina, grasas, carbos] = macros.map((m) => dos(m ?? 0));
  const salida: Producto = { id: codigo, nombre: texto(product.product_name) || `Producto ${codigo}`, kcal: dos(kcal), proteina, grasas, carbos, origen: 'off' };
  const marca = texto(product.brands).split(',')[0].trim();
  if (marca) salida.marca = marca;
  const porcion = numero(product.serving_quantity);
  if (porcion) salida.porcionG = porcion;
  return salida;
}

export interface Etiqueta {
  nombre: string;
  kcal: number | null;
  proteina: number | null;
  grasas: number | null;
  carbos: number | null;
}

/** Errores de una etiqueta cargada a mano (valores cada 100 g). Vacío = válida. */
export function validarEtiqueta(e: Etiqueta): string[] {
  const errores: string[] = [];
  const entre = (v: number | null, max: number) => v !== null && v >= 0 && v <= max;
  if (!e.nombre.trim()) errores.push('Poné un nombre');
  if (!entre(e.kcal, 900)) errores.push('Las calorías tienen que estar entre 0 y 900');
  const macros: [number | null, string][] = [[e.proteina, 'Proteínas'], [e.grasas, 'Grasas'], [e.carbos, 'Carbohidratos']];
  for (const [v, nombre] of macros) if (!entre(v, 100)) errores.push(`${nombre} tiene que estar entre 0 y 100 g`);
  if (macros.every(([v]) => entre(v, 100)) && macros.reduce((t, [v]) => t + v!, 0) > 100) errores.push('Proteínas, grasas y carbohidratos no pueden sumar más de 100 g');
  return errores;
}
