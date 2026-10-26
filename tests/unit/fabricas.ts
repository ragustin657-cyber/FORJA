import type { Ejercicio } from '../../src/data/tipos';

export const ejercicio = (id: string, extra: Partial<Ejercicio> = {}): Ejercicio => ({
  id, nombre: `Ejercicio ${id}`, nombreOriginal: id, musculos: ['chest'], equipo: 'barbell', tipo: 'superior',
  imagenes: [], instrucciones: [], favorito: false, propio: false, archivado: false, ...extra,
});
