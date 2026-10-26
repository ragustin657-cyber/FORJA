import type { TipoEjercicio } from './progresion';

/** Lo mínimo que la búsqueda necesita de un ejercicio. */
export type EjercicioBuscable = {
  id: string;
  nombre: string;
  nombreOriginal: string;
  musculos: string[];
  equipo: string;
  favorito: boolean;
  archivado: boolean;
  propio?: boolean;
};

export type Filtro = { texto?: string; musculo?: string; equipo?: string; soloFavoritos?: boolean };

const INFERIOR = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']);

export const MUSCULOS: Record<string, string> = {
  chest: 'Pecho',
  shoulders: 'Hombros',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  forearms: 'Antebrazos',
  lats: 'Dorsales',
  'middle back': 'Espalda media',
  'lower back': 'Lumbares',
  traps: 'Trapecios',
  neck: 'Cuello',
  abdominals: 'Abdominales',
  quadriceps: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  adductors: 'Aductores',
  abductors: 'Abductores',
};

export const EQUIPOS: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  cable: 'Polea',
  machine: 'Máquina',
  'body only': 'Peso corporal',
  kettlebells: 'Pesa rusa',
  'e-z curl bar': 'Barra W',
  bands: 'Bandas',
  'medicine ball': 'Pelota medicinal',
  'exercise ball': 'Pelota suiza',
  'foam roll': 'Rodillo',
  other: 'Otro',
};

export function tipoDeEjercicio(musculosPrimarios: string[]): TipoEjercicio {
  return musculosPrimarios.some((m) => INFERIOR.has(m)) ? 'inferior' : 'superior';
}

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Favoritos primero, después los propios y los que ya tienen nombre en español, al final los que siguen en inglés. */
function prioridad(e: EjercicioBuscable): number {
  if (e.favorito) return 0;
  return e.propio || e.nombre !== e.nombreOriginal ? 1 : 2;
}

export function filtrarEjercicios<T extends EjercicioBuscable>(lista: T[], f: Filtro): T[] {
  const palabras = normalizar(f.texto ?? '').split(/\s+/).filter(Boolean);
  return lista
    .filter((e) => !e.archivado)
    .filter((e) => !f.soloFavoritos || e.favorito)
    .filter((e) => !f.musculo || e.musculos.includes(f.musculo))
    .filter((e) => !f.equipo || e.equipo === f.equipo)
    .filter((e) => {
      if (palabras.length === 0) return true;
      const nombre = normalizar(e.nombre);
      const original = normalizar(e.nombreOriginal);
      return palabras.every((p) => nombre.includes(p)) || palabras.every((p) => original.includes(p));
    })
    .sort((a, b) => prioridad(a) - prioridad(b) || a.nombre.localeCompare(b.nombre, 'es'));
}
