import { normalizar } from '../biblioteca';
import type { Alimento, Grupo, Macros, Plato } from './tipos';

const dos = (n: number) => Math.round(n * 100) / 100;

/** Porciones prácticas: a 5 g, o a 1 g si son menos de 20 g. */
export function redondearGramos(g: number): number {
  return g < 20 ? Math.round(g) : Math.round(g / 5) * 5;
}

/** Ingredientes con los gramos ya escalados y redondeados. */
export function ingredientesEscalados(plato: Plato, factor = 1): { alimentoId: string; gramos: number }[] {
  return plato.ingredientes.map((i) => ({ alimentoId: i.alimentoId, gramos: redondearGramos(i.gramos * factor) }));
}

export function macrosDePlato(plato: Plato, alimentos: Map<string, Alimento>, factor = 1): Macros {
  const total: Macros = { kcal: 0, proteina: 0, grasas: 0, carbos: 0 };
  for (const { alimentoId, gramos } of ingredientesEscalados(plato, factor)) {
    const a = alimentos.get(alimentoId);
    if (!a) continue;
    total.kcal += (a.kcal * gramos) / 100;
    total.proteina += (a.proteina * gramos) / 100;
    total.grasas += (a.grasas * gramos) / 100;
    total.carbos += (a.carbos * gramos) / 100;
  }
  return { kcal: dos(total.kcal), proteina: dos(total.proteina), grasas: dos(total.grasas), carbos: dos(total.carbos) };
}

export function gruposDePlato(plato: Plato, alimentos: Map<string, Alimento>): Grupo[] {
  return [...new Set(plato.ingredientes.flatMap((i) => alimentos.get(i.alimentoId)?.grupos ?? []))];
}

/** True si el plato tiene algún grupo excluido o algún ingrediente cuyo nombre contiene una palabra de "no como". */
export function platoExcluido(plato: Plato, alimentos: Map<string, Alimento>, grupos: Grupo[], texto: string[]): boolean {
  if (gruposDePlato(plato, alimentos).some((g) => grupos.includes(g))) return true;
  const palabras = texto.map(normalizar).filter(Boolean);
  if (palabras.length === 0) return false;
  return plato.ingredientes.some((i) => {
    const nombre = normalizar(alimentos.get(i.alimentoId)?.nombre ?? '');
    return palabras.some((p) => nombre.includes(p));
  });
}
