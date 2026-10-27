import type { TipoEjercicio } from '../core/progresion';

export interface Ejercicio {
  id: string;
  nombre: string;
  nombreOriginal: string;
  musculos: string[];
  equipo: string;
  tipo: TipoEjercicio;
  imagenes: string[];
  instrucciones: string[];
  favorito: boolean;
  propio: boolean;
  archivado: boolean;
}

export interface EjercicioEnDia {
  ejercicioId: string;
  series: number;
  repsMin: number;
  repsMax: number;
  descansoSeg: number;
}

export interface DiaRutina {
  id: string;
  nombre: string;
  ejercicios: EjercicioEnDia[];
}

export interface Rutina {
  id: string;
  nombre: string;
  origen: 'manual' | 'plan';
  dias: DiaRutina[];
  archivado: boolean;
  creada: number;
}

export interface SerieRegistrada {
  ejercicioId: string;
  numero: number;
  peso: number;
  reps: number;
  completada: boolean;
}

export interface Sesion {
  id: string;
  rutinaId: string;
  diaId: string;
  inicio: number;
  fin: number | null;
  series: SerieRegistrada[];
}

export interface Ajustes {
  incrementoKg: number;
  ultimaCopia: number | null;
  /** Temporizador de la cámara de fotos de progreso (segundos). */
  temporizadorFoto: 0 | 5 | 10;
  /** Cuándo se tocó "Ahora no" en el recordatorio de fotos. */
  fotosPospuestas: number | null;
}
