// Búsqueda de productos envasados en Open Food Facts (base libre y gratuita).
import { leerProductoOFF } from '../core/nutricion/productos';
import type { Producto } from '../core/nutricion/tipos';

const TIEMPO_MAXIMO = 8000;
const CAMPOS = 'product_name,brands,nutriments,serving_quantity';

/** El producto, null si no está o no tiene datos; lanza un error si no se pudo consultar (sin internet, demora). */
export async function buscarEnOFF(codigo: string): Promise<Producto | null> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_MAXIMO);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}?fields=${CAMPOS}`, { signal: control.signal });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Open Food Facts respondió ${r.status}`);
    return leerProductoOFF(codigo, await r.json());
  } finally {
    clearTimeout(reloj);
  }
}
