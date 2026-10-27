// Datos de la pantalla "Hoy": registros del día, menú de esa semana y metas.
import { REPARTOS, type DiaMenu } from '../core/nutricion/menu';
import { fechaLocal, macrosDeRegistro, type Fuentes, type Origen, type Registro } from '../core/nutricion/registro';
import { lunesDe } from '../core/nutricion/semana';
import type { TipoComida } from '../core/nutricion/tipos';
import { nutricionRepo } from '../data/repos/nutricion';
import { registroRepo } from '../data/repos/registro';
import { ALIMENTOS, PLATOS, cargarNutricion, miles, type EstadoNutricion } from './nutricion';

export const fechaDeHoy = () => fechaLocal(new Date());

export function aFecha(texto: string): Date {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function moverDia(texto: string, dias: number): string {
  const d = aFecha(texto);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

export type DiaRegistro = {
  estado: EstadoNutricion;
  fecha: string;
  tipos: TipoComida[];
  menuDia: DiaMenu | undefined;
  registros: Registro[];
};

export async function cargarDia(fecha: string): Promise<DiaRegistro | null> {
  const estado = await cargarNutricion();
  if (!estado) return null;
  const dia = aFecha(fecha);
  const semana = lunesDe(dia);
  const menu = semana === estado.semana ? estado.menu : await nutricionRepo.menu(semana);
  return {
    estado,
    fecha,
    tipos: REPARTOS[estado.perfil.comidas].map((r) => r.tipo),
    menuDia: menu?.dias[(dia.getDay() + 6) % 7],
    registros: await registroRepo.delDia(fecha),
  };
}

export async function fuentes(): Promise<Fuentes> {
  return { platos: PLATOS, alimentos: ALIMENTOS, productos: new Map((await registroRepo.productos()).map((p) => [p.id, p])) };
}

/** Registra un ítem calculando la copia de sus macros. Devuelve false si la referencia ya no existe. */
export async function registrar(r: { fecha: string; tipo: TipoComida; origen: Origen; refId: string; cantidad: number; porcion?: number; nombre: string }): Promise<boolean> {
  const macros = macrosDeRegistro(r.origen, r.refId, r.cantidad, await fuentes());
  if (!macros) return false;
  await registroRepo.agregar({ ...r, macros }, Date.now());
  return true;
}

const FRACCIONES: Record<number, string> = { 0.5: '½', 1: '1', 1.5: '1½', 2: '2' };
export const textoPorcionPlato = (n: number) => `${FRACCIONES[n] ?? miles(n)} ${n > 1 ? 'porciones' : 'porción'}`;

export function textoCantidad(r: Registro): string {
  return r.origen === 'menu' || r.origen === 'plato' ? textoPorcionPlato(r.porcion ?? 1) : `${miles(r.cantidad)} g`;
}
