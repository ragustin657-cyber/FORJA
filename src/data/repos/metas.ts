import type { Meta } from '../../core/metas';
import { almacen } from '../db';

const tabla = () => almacen().tabla<Meta>('metas');

export const metasRepo = {
  todas: () => tabla().todos(),
  de: (ejercicioId: string) => tabla().porId(ejercicioId),
  guardar: (m: Meta) => tabla().poner(m),
  quitar: (ejercicioId: string) => tabla().borrar(ejercicioId),
};
