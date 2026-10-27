import alimentosJson from '../contenido/alimentos.json';
import platosJson from '../contenido/platos.json';
import { calcularMetas, type Metas } from '../core/nutricion/calorias';
import { armarMenu, type Entrada } from '../core/nutricion/menu';
import { hashPerfil, type Perfil } from '../core/nutricion/perfil';
import { lunesDe } from '../core/nutricion/semana';
import type { Alimento, Plato } from '../core/nutricion/tipos';
import { nutricionRepo, type MenuGuardado } from '../data/repos/nutricion';

export const ALIMENTOS = new Map((alimentosJson as Alimento[]).map((a) => [a.id, a]));
export const PLATOS_LISTA = platosJson as Plato[];
export const PLATOS = new Map(PLATOS_LISTA.map((p) => [p.id, p]));

export type EstadoNutricion = {
  perfil: Perfil;
  peso: number;
  metas: Metas;
  semana: string;
  menu: MenuGuardado;
  desactualizado: boolean;
};

export function entradaMenu(perfil: Perfil, metas: Metas, semilla: number): Entrada {
  return {
    platos: PLATOS_LISTA,
    alimentos: ALIMENTOS,
    metas,
    comidas: perfil.comidas,
    noComoGrupos: perfil.noComoGrupos,
    noComoTexto: perfil.noComoTexto,
    semilla,
  };
}

export async function generarMenu(perfil: Perfil, peso: number, semana: string, semilla = Math.floor(Math.random() * 2 ** 31)): Promise<MenuGuardado> {
  const metas = calcularMetas(perfil, peso, new Date());
  const menu: MenuGuardado = { id: semana, semilla, perfilHash: hashPerfil(perfil, peso), dias: armarMenu(entradaMenu(perfil, metas, semilla)) };
  await nutricionRepo.guardarMenu(menu);
  return menu;
}

/** Perfil, metas y menú de la semana actual (lo arma si todavía no existe). Undefined si no hay perfil. */
export async function cargarNutricion(): Promise<EstadoNutricion | undefined> {
  const [perfil, peso] = await Promise.all([nutricionRepo.perfil(), nutricionRepo.pesoActual()]);
  if (!perfil || peso === undefined) return undefined;
  const semana = lunesDe(new Date());
  const metas = calcularMetas(perfil, peso, new Date());
  const menu = (await nutricionRepo.menu(semana)) ?? (await generarMenu(perfil, peso, semana));
  return { perfil, peso, metas, semana, menu, desactualizado: menu.perfilHash !== hashPerfil(perfil, peso) };
}

/** 0 = lunes … 6 = domingo. */
export function diaDeHoy(): number {
  return (new Date().getDay() + 6) % 7;
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const miles = (n: number) => Math.round(n).toLocaleString('es-AR');
