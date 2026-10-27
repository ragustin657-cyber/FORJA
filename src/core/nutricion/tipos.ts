export type Categoria = 'verduleria' | 'carniceria' | 'almacen' | 'lacteos' | 'panaderia' | 'otros';
export type Grupo = 'vacuna' | 'cerdo' | 'pollo' | 'pescado' | 'lacteos' | 'huevo' | 'gluten';
export type TipoComida = 'desayuno' | 'colacion' | 'almuerzo' | 'merienda' | 'cena';

/** Valores nutricionales cada 100 g. */
export interface Alimento {
  id: string;
  nombre: string;
  kcal: number;
  proteina: number;
  grasas: number;
  carbos: number;
  categoria: Categoria;
  grupos: Grupo[];
  unidad?: { nombre: string; plural: string; gramos: number };
}

export interface Plato {
  id: string;
  nombre: string;
  tipos: TipoComida[];
  ingredientes: { alimentoId: string; gramos: number }[];
  pasos: string[];
}

export type Macros = { kcal: number; proteina: number; grasas: number; carbos: number };

export const GRUPOS: Record<Grupo, string> = {
  vacuna: 'Carne vacuna',
  cerdo: 'Cerdo',
  pollo: 'Pollo',
  pescado: 'Pescado',
  lacteos: 'Lácteos',
  huevo: 'Huevo',
  gluten: 'Gluten (TACC)',
};

export const TIPOS_COMIDA: Record<TipoComida, string> = {
  desayuno: 'Desayuno',
  colacion: 'Colación',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
};
