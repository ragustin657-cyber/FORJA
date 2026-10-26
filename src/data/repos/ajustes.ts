import { almacen } from '../db';
import type { Ajustes } from '../tipos';

type Fila = Ajustes & { id: 'app' };
const DEFAULTS: Ajustes = { incrementoKg: 2.5, ultimaCopia: null };
const tabla = () => almacen().tabla<Fila>('ajustes');

export const ajustesRepo = {
  async obtener(): Promise<Ajustes> {
    const fila = await tabla().porId('app');
    if (!fila) return { ...DEFAULTS };
    const { id: _id, ...ajustes } = fila;
    return { ...DEFAULTS, ...ajustes };
  },
  async guardar(cambios: Partial<Ajustes>) {
    await tabla().poner({ ...(await this.obtener()), ...cambios, id: 'app' });
  },
};
