/**
 * Almacenamiento local de FORJA. Las pantallas nunca usan este módulo directamente:
 * pasan por los repositorios en data/repos.
 */

/** Tablas del esquema. Agregar una tabla nueva acá la incluye sola en las copias de seguridad. */
export const TABLAS = ['ejercicios', 'rutinas', 'sesiones', 'ajustes', 'perfil', 'pesos', 'menus', 'compras'] as const;
export type NombreTabla = (typeof TABLAS)[number];

export interface Registro {
  id: string;
}

export interface Tabla<T extends Registro> {
  todos(): Promise<T[]>;
  porId(id: string): Promise<T | undefined>;
  poner(valor: T): Promise<void>;
  ponerVarios(valores: T[]): Promise<void>;
  borrar(id: string): Promise<void>;
}

export interface Almacen {
  tabla<T extends Registro>(nombre: NombreTabla): Tabla<T>;
  /** Reemplaza el contenido de todas las tablas en una sola operación (todo o nada). */
  reemplazarTodo(datos: Record<NombreTabla, Registro[]>): Promise<void>;
}

let actual: Almacen | null = null;

export function usarAlmacen(almacen: Almacen): void {
  actual = almacen;
}

export function almacen(): Almacen {
  if (!actual) throw new Error('El almacenamiento no está inicializado');
  return actual;
}

export function nuevoId(): string {
  return crypto.randomUUID();
}
