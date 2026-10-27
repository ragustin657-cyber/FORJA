// Metas por ejercicio: objetivo de fuerza, avance y fecha estimada.
import { e1rm } from './progresion';
import { proyectadoEn, type Proyeccion } from './proyeccion';
import { parsearNumero } from './unidades';

const DIA = 86_400_000;
const MES = 30.44;
const HORIZONTE = 730;
const PRONTO = 14;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export interface Meta {
  /** El id del ejercicio. */
  id: string;
  peso: number;
  reps: number;
  creada: number;
}

export type EstadoMeta =
  | { tipo: 'lograda' }
  | { tipo: 'sin-estimar'; motivo: 'faltan-datos' | 'estable' }
  | { tipo: 'pronto' }
  | { tipo: 'fecha'; dias: number; fecha: number }
  | { tipo: 'mas-de-2-anios' };

export function validarMeta(peso: string, reps: string): { valores?: { peso: number; reps: number }; errores: string[] } {
  const errores: string[] = [];
  const p = parsearNumero(peso);
  if (p === null || p < 1 || p > 500) errores.push('El peso tiene que estar entre 1 y 500 kg.');
  const textoReps = reps.trim();
  const r = textoReps === '' ? 1 : /^\d+$/.test(textoReps) ? Number(textoReps) : NaN;
  if (!(r >= 1 && r <= 15)) errores.push('Las repeticiones tienen que ser un número entero de 1 a 15.');
  return errores.length ? { errores } : { valores: { peso: p!, reps: r }, errores };
}

/** Fuerza que hay que alcanzar. A 1 repetición es el peso tal cual; con más, la fórmula de Epley. */
export const objetivoMeta = (m: { peso: number; reps: number }): number => (m.reps === 1 ? m.peso : e1rm(m.peso, m.reps)!);

export const avance = (mejor: number | null, objetivo: number): number => (mejor === null ? 0 : Math.min(1, mejor / objetivo));

export const faltaKg = (mejor: number | null, objetivo: number): number => Math.max(0, Math.round((objetivo - (mejor ?? 0)) * 2) / 2);

export function fechaMeta(p: Proyeccion, objetivo: number, mejor: number | null): EstadoMeta {
  if (mejor !== null && mejor >= objetivo) return { tipo: 'lograda' };
  if (p.estado !== 'ok') return { tipo: 'sin-estimar', motivo: p.estado };
  for (let d = 0; d <= HORIZONTE; d++) {
    if (proyectadoEn(p, d) >= objetivo) return d <= PRONTO ? { tipo: 'pronto' } : { tipo: 'fecha', dias: d, fecha: p.ahora + d * DIA };
  }
  return { tipo: 'mas-de-2-anios' };
}

export function textoMeta(e: EstadoMeta): string {
  switch (e.tipo) {
    case 'lograda':
      return '¡Ya llegaste! 🏆';
    case 'pronto':
      return 'En las próximas 2 semanas';
    case 'mas-de-2-anios':
      return 'Más de 2 años al ritmo actual';
    case 'sin-estimar':
      return e.motivo === 'estable' ? 'Cuando vuelvas a subir, estimamos la fecha.' : 'Con más entrenamientos estimamos la fecha.';
    case 'fecha': {
      const f = new Date(e.fecha);
      const parte = f.getDate() <= 10 ? 'principios' : f.getDate() <= 20 ? 'mediados' : 'fines';
      const cuando = e.dias < 61 ? `en unas ${Math.round(e.dias / 7)} semanas` : `en unos ${Math.round(e.dias / MES)} meses`;
      return `Llegarías a ${parte} de ${MESES[f.getMonth()]} de ${f.getFullYear()}, ${cuando}`;
    }
  }
}
