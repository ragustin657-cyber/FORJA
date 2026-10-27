import type { Metas } from './calorias';
import { macrosDePlato, platoExcluido } from './platos';
import type { Alimento, Grupo, Macros, Plato, TipoComida } from './tipos';

export interface ComidaMenu {
  tipo: TipoComida;
  platoId: string | null;
  factor: number;
}
export interface DiaMenu {
  comidas: ComidaMenu[];
}
export type Entrada = {
  platos: Plato[];
  alimentos: Map<string, Alimento>;
  metas: Metas;
  comidas: 3 | 4 | 5;
  noComoGrupos: Grupo[];
  noComoTexto: string[];
  semilla: number;
};

export const REPARTOS: Record<3 | 4 | 5, { tipo: TipoComida; parte: number }[]> = {
  3: [{ tipo: 'desayuno', parte: 0.3 }, { tipo: 'almuerzo', parte: 0.35 }, { tipo: 'cena', parte: 0.35 }],
  4: [{ tipo: 'desayuno', parte: 0.25 }, { tipo: 'almuerzo', parte: 0.3 }, { tipo: 'merienda', parte: 0.15 }, { tipo: 'cena', parte: 0.3 }],
  5: [
    { tipo: 'desayuno', parte: 0.2 }, { tipo: 'colacion', parte: 0.1 }, { tipo: 'almuerzo', parte: 0.3 },
    { tipo: 'merienda', parte: 0.15 }, { tipo: 'cena', parte: 0.25 },
  ],
};

const FACTOR_MIN = 0.5;
const FACTOR_MAX = 2.5;
const MAX_USOS = 2;
const CANDIDATOS = 6;
const TOLERANCIA = 0.05;
const AJUSTES = 3;

const acotar = (f: number) => Math.round(Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, f)) * 100) / 100;

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function crearAzar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mezclar<T>(lista: T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function totalesDia(dia: DiaMenu, platos: Map<string, Plato>, alimentos: Map<string, Alimento>): Macros {
  const t: Macros = { kcal: 0, proteina: 0, grasas: 0, carbos: 0 };
  for (const c of dia.comidas) {
    const p = c.platoId ? platos.get(c.platoId) : undefined;
    if (!p) continue;
    const m = macrosDePlato(p, alimentos, c.factor);
    t.kcal += m.kcal;
    t.proteina += m.proteina;
    t.grasas += m.grasas;
    t.carbos += m.carbos;
  }
  return t;
}

function permitidos(e: Entrada): Plato[] {
  return e.platos.filter((p) => !platoExcluido(p, e.alimentos, e.noComoGrupos, e.noComoTexto));
}

/** Arma los 7 días del menú. Ver el plan (Task 4) para el algoritmo. */
export function armarMenu(e: Entrada): DiaMenu[] {
  const azar = crearAzar(e.semilla);
  const posibles = permitidos(e);
  const porId = new Map(e.platos.map((p) => [p.id, p]));
  const usos = new Map<string, number>();
  const reparto = REPARTOS[e.comidas];
  const semana: DiaMenu[] = [];

  for (let d = 0; d < 7; d++) {
    const comidas: ComidaMenu[] = [];
    let proteinaAcum = 0;
    let parteAcum = 0;
    for (const { tipo, parte } of reparto) {
      parteAcum += parte;
      const objetivo = e.metas.kcal * parte;
      const metaProteina = e.metas.proteina * parteAcum;
      const delTipo = posibles.filter((p) => p.tipos.includes(tipo));
      const sinAgotar = delTipo.filter((p) => (usos.get(p.id) ?? 0) < MAX_USOS);
      // Si ya se usaron todos dos veces, se repite uno antes que dejar la comida vacía.
      const candidatos = mezclar(sinAgotar.length > 0 ? sinAgotar : delTipo, azar).slice(0, CANDIDATOS);
      let mejor: { platoId: string; factor: number; proteina: number; costo: number } | null = null;
      for (const p of candidatos) {
        const base = macrosDePlato(p, e.alimentos).kcal;
        if (base <= 0) continue;
        const factor = acotar(objetivo / base);
        const m = macrosDePlato(p, e.alimentos, factor);
        const costo = Math.abs(m.kcal - objetivo) / objetivo + (0.5 * Math.abs(proteinaAcum + m.proteina - metaProteina)) / e.metas.proteina;
        if (!mejor || costo < mejor.costo) mejor = { platoId: p.id, factor, proteina: m.proteina, costo };
      }
      if (mejor) {
        usos.set(mejor.platoId, (usos.get(mejor.platoId) ?? 0) + 1);
        proteinaAcum += mejor.proteina;
        comidas.push({ tipo, platoId: mejor.platoId, factor: mejor.factor });
      } else {
        comidas.push({ tipo, platoId: null, factor: 0 });
      }
    }

    const dia: DiaMenu = { comidas };
    for (let i = 0; i < AJUSTES; i++) {
      const total = totalesDia(dia, porId, e.alimentos).kcal;
      if (total === 0 || Math.abs(total - e.metas.kcal) / e.metas.kcal <= TOLERANCIA) break;
      const escala = e.metas.kcal / total;
      for (const c of dia.comidas) if (c.platoId) c.factor = acotar(c.factor * escala);
    }
    semana.push(dia);
  }
  return semana;
}

/** Hasta 5 platos para reemplazar una comida, del más cercano en calorías al más lejano. */
export function alternativas(e: Entrada, menu: DiaMenu[], dia: number, comida: number): { platoId: string; factor: number; macros: Macros }[] {
  const actual = menu[dia].comidas[comida];
  const parte = REPARTOS[e.comidas].find((r) => r.tipo === actual.tipo)?.parte ?? 0.25;
  const objetivo = e.metas.kcal * parte;
  return permitidos(e)
    .filter((p) => p.tipos.includes(actual.tipo) && p.id !== actual.platoId)
    .map((p) => {
      const base = macrosDePlato(p, e.alimentos).kcal;
      const factor = acotar(base > 0 ? objetivo / base : 1);
      return { platoId: p.id, factor, macros: macrosDePlato(p, e.alimentos, factor) };
    })
    .sort((a, b) => Math.abs(a.macros.kcal - objetivo) - Math.abs(b.macros.kcal - objetivo) || b.macros.proteina - a.macros.proteina)
    .slice(0, 5);
}

/** Copia del menú con una comida reemplazada. */
export function reemplazarComida(menu: DiaMenu[], dia: number, comida: number, platoId: string, factor: number): DiaMenu[] {
  return menu.map((d, i) =>
    i !== dia ? d : { comidas: d.comidas.map((c, j) => (j !== comida ? c : { tipo: c.tipo, platoId, factor })) },
  );
}
