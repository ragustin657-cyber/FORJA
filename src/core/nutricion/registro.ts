// Registro de lo que se comió: cada ítem guarda una copia de sus macros para que el historial no cambie.
import { macrosDePlato } from './platos';
import type { Alimento, Macros, Plato, Producto, TipoComida } from './tipos';

export type Origen = 'menu' | 'plato' | 'alimento' | 'producto';

export interface Registro {
  id: string;
  /** Día local, AAAA-MM-DD. */
  fecha: string;
  tipo: TipoComida;
  origen: Origen;
  refId: string;
  /** Factor del plato (menú o plato) o gramos (alimento o producto). */
  cantidad: number;
  nombre: string;
  macros: Macros;
  creado: number;
}

export interface Fuentes {
  platos: Map<string, Plato>;
  alimentos: Map<string, Alimento>;
  productos: Map<string, Producto>;
}

const dos = (n: number) => Math.round(n * 100) / 100;
const CERO: Macros = { kcal: 0, proteina: 0, grasas: 0, carbos: 0 };

function porGramos(v: Macros, gramos: number): Macros {
  return { kcal: dos((v.kcal * gramos) / 100), proteina: dos((v.proteina * gramos) / 100), grasas: dos((v.grasas * gramos) / 100), carbos: dos((v.carbos * gramos) / 100) };
}

export function macrosDeRegistro(origen: Origen, refId: string, cantidad: number, fuentes: Fuentes): Macros | null {
  if (origen === 'menu' || origen === 'plato') {
    const p = fuentes.platos.get(refId);
    return p ? macrosDePlato(p, fuentes.alimentos, cantidad) : null;
  }
  const v = origen === 'alimento' ? fuentes.alimentos.get(refId) : fuentes.productos.get(refId);
  return v ? porGramos(v, cantidad) : null;
}

export function totales(registros: Registro[]): Macros {
  const t = registros.reduce(
    (a, r) => ({ kcal: a.kcal + r.macros.kcal, proteina: a.proteina + r.macros.proteina, grasas: a.grasas + r.macros.grasas, carbos: a.carbos + r.macros.carbos }),
    CERO,
  );
  return { kcal: dos(t.kcal), proteina: dos(t.proteina), grasas: dos(t.grasas), carbos: dos(t.carbos) };
}

export function porComida(registros: Registro[], tipos: TipoComida[]): Record<TipoComida, Registro[]> {
  const salida = {} as Record<TipoComida, Registro[]>;
  for (const t of tipos) salida[t] = registros.filter((r) => r.tipo === t);
  return salida;
}

/** Los últimos ítems distintos (un plato del menú cuenta como plato), el más nuevo primero. */
export function recientes(registros: Registro[], limite = 20): Registro[] {
  const vistos = new Set<string>();
  const salida: Registro[] = [];
  for (const r of [...registros].sort((a, b) => b.creado - a.creado)) {
    const origen: Origen = r.origen === 'menu' ? 'plato' : r.origen;
    const clave = `${origen}:${r.refId}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ ...r, origen });
    if (salida.length === limite) break;
  }
  return salida;
}

export function fechaLocal(d: Date): string {
  const dd = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}
