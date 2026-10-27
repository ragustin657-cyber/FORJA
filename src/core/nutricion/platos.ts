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

/** Palabras normalizadas y en singular; se descarta la palabra que sigue a "sin" ("maní sin sal" no tiene sal). */
function raices(texto: string): string[] {
  const palabras = normalizar(texto).split(/[^a-zñ]+/).filter(Boolean);
  const salida: string[] = [];
  for (let i = 0; i < palabras.length; i++) {
    if (palabras[i] === 'sin') {
      i++;
      continue;
    }
    salida.push(singular(palabras[i]));
  }
  return salida;
}

/** Forma canónica para comparar singular y plural: "tomates" y "tomate" → "tomat"; "huevos" → "huevo". */
function singular(p: string): string {
  let r = p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p;
  if (r.length > 3 && r.endsWith('e')) r = r.slice(0, -1);
  return r;
}

/**
 * True si el plato tiene algún grupo excluido, o si alguna palabra de "no como" aparece como palabra completa
 * (sin importar tildes, mayúsculas ni plural) en sus ingredientes, su nombre o su preparación.
 */
export function platoExcluido(plato: Plato, alimentos: Map<string, Alimento>, grupos: Grupo[], texto: string[]): boolean {
  if (gruposDePlato(plato, alimentos).some((g) => grupos.includes(g))) return true;
  const buscadas = texto.flatMap(raices);
  if (buscadas.length === 0) return false;
  const delPlato = new Set([
    ...plato.ingredientes.flatMap((i) => raices(alimentos.get(i.alimentoId)?.nombre ?? '')),
    ...raices(plato.nombre),
    ...plato.pasos.flatMap(raices),
  ]);
  return buscadas.some((b) => delPlato.has(b));
}
