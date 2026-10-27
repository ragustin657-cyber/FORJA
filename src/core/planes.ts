// Planes de 12 semanas: armado de la rutina por plantillas y progresión por bloques con descarga.
import type { DiaRutina, EjercicioEnDia, Rutina } from '../data/tipos';
import { lunesDe } from './nutricion/semana';
import type { Nivel } from './proyeccion';
import { redondearPeso } from './unidades';

const DIA_MS = 86_400_000;
export const SEMANAS_PLAN = 12;

export type Patron =
  | 'sentadilla' | 'bisagra' | 'empuje-horizontal' | 'empuje-vertical' | 'tiron-horizontal' | 'tiron-vertical' | 'unilateral' | 'femoral'
  | 'cuadriceps' | 'gemelos' | 'pecho-aislado' | 'hombro-lateral' | 'hombro-posterior' | 'biceps' | 'triceps' | 'core';
export type Equipo = 'gimnasio' | 'mancuernas' | 'casa';
export type Patrones = Record<Patron, Record<Equipo, string[]>>;
export type ObjetivoPlan = 'fuerza' | 'musculo' | 'grasa' | 'general';
export type EntradaPlan = { objetivo: ObjetivoPlan; dias: 3 | 4 | 5 | 6; equipo: Equipo; nivel: Nivel };
export type SemanaBloque = 1 | 2 | 3 | 4;

export const OBJETIVOS: { id: ObjetivoPlan; nombre: string }[] = [
  { id: 'fuerza', nombre: 'Fuerza' },
  { id: 'musculo', nombre: 'Ganar músculo' },
  { id: 'grasa', nombre: 'Bajar grasa' },
  { id: 'general', nombre: 'Forma general' },
];

export const EQUIPOS: { id: Equipo; nombre: string; detalle: string }[] = [
  { id: 'gimnasio', nombre: 'Gimnasio completo', detalle: 'Barras, máquinas, poleas y mancuernas' },
  { id: 'mancuernas', nombre: 'Mancuernas', detalle: 'Mancuernas, peso corporal y bandas' },
  { id: 'casa', nombre: 'Casa', detalle: 'Peso corporal y bandas' },
];

export const PLANTILLAS: Record<string, string[]> = {
  'Cuerpo A': ['sentadilla', 'empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'femoral', 'core'],
  'Cuerpo B': ['bisagra', 'empuje-vertical', 'tiron-vertical', 'unilateral', 'triceps', 'core'],
  'Cuerpo C': ['sentadilla:1', 'tiron-vertical', 'empuje-horizontal:1', 'unilateral:1', 'biceps', 'core'],
  'Torso A': ['empuje-horizontal', 'tiron-horizontal', 'empuje-vertical', 'tiron-vertical', 'triceps', 'biceps'],
  'Torso B': ['empuje-vertical:1', 'tiron-vertical:1', 'empuje-horizontal:1', 'tiron-horizontal:1', 'hombro-lateral', 'biceps:1'],
  'Piernas A': ['sentadilla', 'bisagra', 'unilateral', 'femoral', 'gemelos', 'core'],
  'Piernas B': ['bisagra:1', 'sentadilla:1', 'cuadriceps', 'femoral:1', 'gemelos', 'core'],
  'Empuje A': ['empuje-horizontal', 'empuje-vertical', 'pecho-aislado', 'hombro-lateral', 'triceps', 'triceps:1'],
  'Tirón A': ['tiron-vertical', 'tiron-horizontal', 'tiron-horizontal:1', 'hombro-posterior', 'biceps', 'biceps:1'],
  'Empuje B': ['empuje-vertical:1', 'empuje-horizontal:1', 'pecho-aislado:1', 'hombro-lateral', 'triceps:1', 'core'],
  'Tirón B': ['tiron-horizontal:1', 'tiron-vertical:1', 'hombro-posterior', 'unilateral', 'biceps:1', 'core'],
};

export const DIAS_POR_SEMANA: Record<3 | 4 | 5 | 6, string[]> = {
  3: ['Cuerpo A', 'Cuerpo B', 'Cuerpo C'],
  4: ['Torso A', 'Piernas A', 'Torso B', 'Piernas B'],
  5: ['Empuje A', 'Tirón A', 'Piernas A', 'Torso A', 'Piernas B'],
  6: ['Empuje A', 'Tirón A', 'Piernas A', 'Empuje B', 'Tirón B', 'Piernas B'],
};

/** En casa no hay remos, curls ni vuelos sin equipo: con 5 o 6 días quedarían días casi vacíos. */
export function diasPermitidos(equipo: Equipo): (3 | 4 | 5 | 6)[] {
  return equipo === 'casa' ? [3, 4] : [3, 4, 5, 6];
}

type Parametros = { series: number; repsMin: number; repsMax: number; descansoSeg: number };
const PARAMETROS: Record<ObjetivoPlan, { basico: Parametros; accesorio: Parametros }> = {
  fuerza: { basico: { series: 5, repsMin: 3, repsMax: 6, descansoSeg: 180 }, accesorio: { series: 4, repsMin: 6, repsMax: 10, descansoSeg: 120 } },
  musculo: { basico: { series: 4, repsMin: 8, repsMax: 12, descansoSeg: 90 }, accesorio: { series: 3, repsMin: 8, repsMax: 12, descansoSeg: 60 } },
  grasa: { basico: { series: 3, repsMin: 10, repsMax: 15, descansoSeg: 60 }, accesorio: { series: 3, repsMin: 10, repsMax: 15, descansoSeg: 45 } },
  general: { basico: { series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }, accesorio: { series: 3, repsMin: 8, repsMax: 12, descansoSeg: 60 } },
};

/** El candidato de la variante pedida (o el último que haya), sin repetir uno ya usado en el día. */
function elegir(lista: string[], variante: number, usados: Set<string>): string | null {
  if (!lista.length) return null;
  const i = Math.min(variante, lista.length - 1);
  const orden = [...lista.slice(i), ...lista.slice(0, i)];
  return orden.find((id) => !usados.has(id)) ?? null;
}

export function generarRutina(e: EntradaPlan, patrones: Patrones, id: () => string, ahora: number): Rutina {
  const p = PARAMETROS[e.objetivo];
  const dias: DiaRutina[] = DIAS_POR_SEMANA[e.dias].map((nombre) => {
    const huecos = PLANTILLAS[nombre].slice(0, e.nivel === 'principiante' ? -1 : undefined);
    const usados = new Set<string>();
    const ejercicios: EjercicioEnDia[] = [];
    huecos.forEach((hueco, posicion) => {
      const [patron, variante] = hueco.split(':');
      const elegido = elegir(patrones[patron as Patron][e.equipo], Number(variante ?? 0), usados);
      if (!elegido) return;
      usados.add(elegido);
      const basico = posicion < 2;
      ejercicios.push({ ejercicioId: elegido, ...(basico ? p.basico : p.accesorio), basico });
    });
    return { id: id(), nombre, ejercicios };
  });
  const objetivo = OBJETIVOS.find((o) => o.id === e.objetivo)!.nombre.toLowerCase();
  return { id: id(), nombre: `Plan de ${objetivo} · ${e.dias} días`, origen: 'plan', dias, archivado: false, creada: ahora };
}

function aFecha(texto: string): Date {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function semanaDelPlan(inicio: string, ahora: Date): { estado: 'por-empezar' | 'activo' | 'terminado'; semana: number; bloque: number; semanaBloque: SemanaBloque; descarga: boolean } {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const dias = Math.round((hoy.getTime() - aFecha(inicio).getTime()) / DIA_MS);
  const semana = Math.floor(dias / 7) + 1;
  const estado = semana < 1 ? 'por-empezar' : semana > SEMANAS_PLAN ? 'terminado' : 'activo';
  const semanaBloque = (semana < 1 ? 1 : ((semana - 1) % 4) + 1) as SemanaBloque;
  return { estado, semana, bloque: Math.max(1, Math.ceil(semana / 4)), semanaBloque, descarga: estado === 'activo' && semanaBloque === 4 };
}

export function seriesDeSemana(e: EjercicioEnDia, semanaBloque: SemanaBloque): number {
  if (semanaBloque === 1) return Math.max(2, e.series - 1);
  if (semanaBloque === 3) return e.basico ? e.series + 1 : e.series;
  if (semanaBloque === 4) return Math.max(1, Math.round(e.series * 0.6));
  return e.series;
}

export function diaDeSemana(dia: DiaRutina, semanaBloque: SemanaBloque): DiaRutina {
  return { ...dia, ejercicios: dia.ejercicios.map((e) => ({ ...e, series: seriesDeSemana(e, semanaBloque) })) };
}

export function pesoDeDescarga(peso: number | null, incremento: number): number | null {
  return peso === null ? null : redondearPeso(peso * 0.9, incremento);
}

export function inicioDelPlan(opcion: 'este' | 'proximo', ahora: Date): string {
  const lunes = aFecha(lunesDe(ahora));
  if (opcion === 'proximo') lunes.setDate(lunes.getDate() + 7);
  return lunesDe(lunes);
}

export function sesionesDeLaSemana(sesiones: { rutinaId: string; inicio: number; fin: number | null }[], rutinaId: string, ahora: Date): number {
  const semana = lunesDe(ahora);
  return sesiones.filter((s) => s.rutinaId === rutinaId && s.fin !== null && lunesDe(new Date(s.inicio)) === semana).length;
}
