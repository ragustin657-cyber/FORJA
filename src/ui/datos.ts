import { useCallback, useEffect, useRef, useState } from 'react';
import contenido from '../contenido/ejercicios.json';
import { ejerciciosRepo } from '../data/repos/ejercicios';
import type { Ejercicio } from '../data/tipos';

type EjercicioContenido = Omit<Ejercicio, 'favorito' | 'propio' | 'archivado'> & { traducido: boolean };

/** Ejercicios de la biblioteca tal como vienen en el contenido de la app. */
export function ejerciciosDeContenido(): Ejercicio[] {
  return (contenido as EjercicioContenido[]).map(({ traducido: _t, ...e }) => ({ ...e, favorito: false, propio: false, archivado: false }));
}

export async function prepararBiblioteca() {
  await ejerciciosRepo.sincronizarBiblioteca(ejerciciosDeContenido());
}

/** Carga datos asíncronos y permite recargarlos. `recargar()` termina cuando los datos nuevos ya están en pantalla. */
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[] = []): { datos: T | undefined; recargar: () => Promise<void> } {
  const [datos, setDatos] = useState<T>();
  const [vuelta, setVuelta] = useState(0);
  const pendientes = useRef<(() => void)[]>([]);
  useEffect(() => {
    let vivo = true;
    const avisar = () => pendientes.current.splice(0).forEach((r) => r());
    cargar().then(
      (d) => {
        if (!vivo) return;
        setDatos(d);
        avisar();
      },
      () => vivo && avisar(),
    );
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, vuelta]);
  const recargar = useCallback(
    () =>
      new Promise<void>((r) => {
        pendientes.current.push(r);
        setVuelta((v) => v + 1);
      }),
    [],
  );
  return { datos, recargar };
}

/** Ruta pública de una imagen de ejercicio. */
export function urlImagen(ruta: string): string {
  return './' + ruta;
}
