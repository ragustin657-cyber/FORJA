import { TABLAS, type Almacen, type NombreTabla, type Registro, type Tabla } from './db';

const NOMBRE_BASE = 'forja';
/** Subir este número al agregar tablas; onupgradeneeded crea las que falten. */
const VERSION_BASE = 2;

function pedido<T>(p: IDBRequest<T>): Promise<T> {
  return new Promise((ok, mal) => {
    p.onsuccess = () => ok(p.result);
    p.onerror = () => mal(p.error);
  });
}

function terminada(tx: IDBTransaction): Promise<void> {
  return new Promise((ok, mal) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => mal(tx.error);
    tx.onabort = () => mal(tx.error ?? new Error('Transacción cancelada'));
  });
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const p = indexedDB.open(NOMBRE_BASE, VERSION_BASE);
    p.onupgradeneeded = () => {
      for (const t of TABLAS) if (!p.result.objectStoreNames.contains(t)) p.result.createObjectStore(t, { keyPath: 'id' });
    };
    p.onsuccess = () => ok(p.result);
    p.onerror = () => mal(p.error);
  });
}

/** Almacén real del navegador (IndexedDB). Se prueba en las pruebas de navegador. */
export async function crearAlmacenIDB(): Promise<Almacen> {
  const db = await abrir();

  function tabla<T extends Registro>(nombre: NombreTabla): Tabla<T> {
    const store = (modo: IDBTransactionMode) => db.transaction(nombre, modo).objectStore(nombre);
    return {
      todos: () => pedido(store('readonly').getAll()) as Promise<T[]>,
      porId: (id) => pedido(store('readonly').get(id)) as Promise<T | undefined>,
      async poner(valor) {
        const s = store('readwrite');
        s.put(valor);
        await terminada(s.transaction);
      },
      async ponerVarios(valores) {
        const s = store('readwrite');
        for (const v of valores) s.put(v);
        await terminada(s.transaction);
      },
      async borrar(id) {
        const s = store('readwrite');
        s.delete(id);
        await terminada(s.transaction);
      },
    };
  }

  return {
    tabla,
    async reemplazarTodo(datos) {
      const tx = db.transaction([...TABLAS], 'readwrite');
      for (const t of TABLAS) {
        const s = tx.objectStore(t);
        s.clear();
        for (const r of datos[t] ?? []) s.put(r);
      }
      await terminada(tx);
    },
  };
}
