import { edad, type Actividad, type ObjetivoNutri, type Sexo } from './calorias';
import type { Grupo } from './tipos';

export interface Perfil {
  id: 'yo';
  sexo: Sexo;
  nacimiento: string;
  alturaCm: number;
  actividad: Actividad;
  objetivo: ObjetivoNutri;
  comidas: 3 | 4 | 5;
  noComoGrupos: Grupo[];
  noComoTexto: string[];
}

/** Mensajes de error del perfil; vacío si es válido. */
export function validarPerfil(p: Partial<Perfil> & { pesoKg?: number }, hoy: Date): string[] {
  const errores: string[] = [];
  if (!p.sexo) errores.push('Elegí tu sexo.');
  const fecha = p.nacimiento && /^\d{4}-\d{2}-\d{2}$/.test(p.nacimiento) ? new Date(p.nacimiento + 'T00:00') : null;
  if (!fecha || Number.isNaN(fecha.getTime()) || fecha > hoy) errores.push('Revisá la fecha de nacimiento.');
  else {
    const anios = edad(p.nacimiento!, hoy);
    if (anios < 14 || anios > 90) errores.push('La edad tiene que estar entre 14 y 90 años.');
  }
  if (!p.alturaCm || p.alturaCm < 120 || p.alturaCm > 230) errores.push('La altura tiene que estar entre 120 y 230 cm.');
  if (!p.pesoKg || p.pesoKg < 35 || p.pesoKg > 250) errores.push('El peso tiene que estar entre 35 y 250 kg.');
  if (!p.actividad) errores.push('Elegí tu nivel de actividad.');
  if (!p.objetivo) errores.push('Elegí tu objetivo.');
  return errores;
}

/** Huella de los datos que cambian las metas o el menú. */
export function hashPerfil(p: Perfil, pesoKg: number): string {
  return JSON.stringify([
    p.sexo, p.nacimiento, p.alturaCm, p.actividad, p.objetivo, p.comidas, pesoKg,
    [...p.noComoGrupos].sort(), [...p.noComoTexto].map((t) => t.trim().toLowerCase()).sort(),
  ]);
}
