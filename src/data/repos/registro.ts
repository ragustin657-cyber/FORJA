import type { Registro } from '../../core/nutricion/registro';
import type { Producto } from '../../core/nutricion/tipos';
import { almacen, nuevoId } from '../db';

const registros = () => almacen().tabla<Registro>('registros');
const productos = () => almacen().tabla<Producto>('productos');

export const registroRepo = {
  todos: () => registros().todos(),
  async delDia(fecha: string): Promise<Registro[]> {
    return (await registros().todos()).filter((r) => r.fecha === fecha).sort((a, b) => a.creado - b.creado);
  },
  async agregar(r: Omit<Registro, 'id' | 'creado'>, ahora: number): Promise<Registro> {
    const completo: Registro = { ...r, id: nuevoId(), creado: ahora };
    await registros().poner(completo);
    return completo;
  },
  borrar: (id: string) => registros().borrar(id),
  producto: (id: string) => productos().porId(id),
  productos: () => productos().todos(),
  guardarProducto: (p: Producto) => productos().poner(p),
};
