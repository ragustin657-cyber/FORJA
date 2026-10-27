import type { DiaMenu } from './menu';
import { ingredientesEscalados } from './platos';
import type { Alimento, Categoria, Plato } from './tipos';

export interface ItemCompra {
  alimentoId: string;
  nombre: string;
  gramos: number;
  texto: string;
}

const ORDEN: { categoria: Categoria; titulo: string }[] = [
  { categoria: 'verduleria', titulo: 'Verdulería' },
  { categoria: 'carniceria', titulo: 'Carnicería' },
  { categoria: 'lacteos', titulo: 'Lácteos y huevos' },
  { categoria: 'panaderia', titulo: 'Panadería' },
  { categoria: 'almacen', titulo: 'Almacén' },
  { categoria: 'otros', titulo: 'Otros' },
];

function peso(g: number): string {
  return g >= 1000 ? `${String(Math.round(g / 100) / 10).replace('.', ',')} kg` : `${Math.round(g)} g`;
}

/** "250 g", "1,2 kg" o, con unidad práctica, "6 huevos (300 g)" (redondeando hacia arriba). */
export function textoCantidad(gramos: number, unidad?: Alimento['unidad']): string {
  if (!unidad) return peso(gramos);
  const n = Math.max(1, Math.ceil(gramos / unidad.gramos - 1e-9));
  return `${n} ${n === 1 ? unidad.nombre : unidad.plural} (${peso(gramos)})`;
}

export function listaCompras(menu: DiaMenu[], platos: Map<string, Plato>, alimentos: Map<string, Alimento>) {
  const total = new Map<string, number>();
  for (const dia of menu) {
    for (const c of dia.comidas) {
      const plato = c.platoId ? platos.get(c.platoId) : undefined;
      if (!plato) continue;
      for (const i of ingredientesEscalados(plato, c.factor)) {
        if (alimentos.has(i.alimentoId)) total.set(i.alimentoId, (total.get(i.alimentoId) ?? 0) + i.gramos);
      }
    }
  }
  return ORDEN.map(({ categoria, titulo }) => ({
    categoria,
    titulo,
    items: [...total.entries()]
      .map(([id, gramos]) => ({ a: alimentos.get(id)!, gramos }))
      .filter(({ a }) => a.categoria === categoria)
      .map(({ a, gramos }) => ({ alimentoId: a.id, nombre: a.nombre, gramos, texto: textoCantidad(gramos, a.unidad) }))
      .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')),
  })).filter((g) => g.items.length > 0);
}

/** Para una receta: unidades solo si la cantidad está a menos de 10 % de una cantidad justa ("2 huevos (100 g)"); si no, gramos. */
export function textoPorcion(gramos: number, unidad?: Alimento['unidad']): string {
  if (!unidad) return peso(gramos);
  const n = Math.round(gramos / unidad.gramos);
  if (n < 1 || Math.abs(gramos - n * unidad.gramos) > unidad.gramos * n * 0.1) return peso(gramos);
  return `${n} ${n === 1 ? unidad.nombre : unidad.plural} (${peso(gramos)})`;
}
