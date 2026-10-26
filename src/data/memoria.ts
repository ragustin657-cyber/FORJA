import { TABLAS, type Almacen, type NombreTabla, type Registro, type Tabla } from './db';

const copiar = <T>(v: T): T => structuredClone(v);

/** Almacén en memoria con la misma interfaz que IndexedDB. Se usa en las pruebas. */
export function crearAlmacenMemoria(): Almacen {
  const datos = new Map<NombreTabla, Map<string, Registro>>(TABLAS.map((t) => [t, new Map()]));

  function tabla<T extends Registro>(nombre: NombreTabla): Tabla<T> {
    const mapa = datos.get(nombre)!;
    return {
      async todos() { return [...mapa.values()].map(copiar) as T[]; },
      async porId(id) { const v = mapa.get(id); return v && (copiar(v) as T); },
      async poner(valor) { mapa.set(valor.id, copiar(valor)); },
      async ponerVarios(valores) { for (const v of valores) mapa.set(v.id, copiar(v)); },
      async borrar(id) { mapa.delete(id); },
    };
  }

  return {
    tabla,
    async reemplazarTodo(nuevos) {
      for (const t of TABLAS) datos.set(t, new Map((nuevos[t] ?? []).map((r) => [r.id, copiar(r)])));
    },
  };
}
