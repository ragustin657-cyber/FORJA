import { almacen } from '../db';
import type { Ejercicio } from '../tipos';

const tabla = () => almacen().tabla<Ejercicio>('ejercicios');

export const ejerciciosRepo = {
  /** Ejercicios no archivados. */
  async todos(): Promise<Ejercicio[]> {
    return (await tabla().todos()).filter((e) => !e.archivado);
  },
  /** Incluye archivados, para mostrar el historial. */
  porId: (id: string) => tabla().porId(id),
  guardar: (e: Ejercicio) => tabla().poner(e),
  async archivar(id: string) {
    const e = await tabla().porId(id);
    if (e) await tabla().poner({ ...e, archivado: true });
  },
  async alternarFavorito(id: string) {
    const e = await tabla().porId(id);
    if (e) await tabla().poner({ ...e, favorito: !e.favorito });
  },
  /** Agrega y actualiza los ejercicios de la biblioteca sin pisar favoritos ni archivados. */
  async sincronizarBiblioteca(lista: Ejercicio[]) {
    const existentes = new Map((await tabla().todos()).map((e) => [e.id, e]));
    await tabla().ponerVarios(
      lista.map((nuevo) => {
        const previo = existentes.get(nuevo.id);
        return previo ? { ...nuevo, favorito: previo.favorito, archivado: previo.archivado } : nuevo;
      }),
    );
  },
};
