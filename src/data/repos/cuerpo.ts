import { combinarMedidas, type Medidas, type RegistroMedidas } from '../../core/cuerpo/medidas';
import type { Foto, Imagen } from '../../core/cuerpo/fotos';
import { almacen } from '../db';

const medidas = () => almacen().tabla<RegistroMedidas>('medidas');
const fotos = () => almacen().tabla<Foto>('fotos');
const imagenes = () => almacen().tabla<Imagen>('imagenes');

function dia(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const cuerpoRepo = {
  async medidas(): Promise<RegistroMedidas[]> {
    return (await medidas().todos()).sort((a, b) => a.fecha - b.fecha);
  },
  /** Un registro por día. Hoy usa la hora real; un día pasado, el mediodía de ese día. */
  async guardarMedidas(fecha: string, valores: Medidas, ahora: number) {
    const [a, m, d] = fecha.split('-').map(Number);
    const ms = fecha === dia(ahora) ? ahora : new Date(a, m - 1, d, 12).getTime();
    await medidas().poner(combinarMedidas(await medidas().porId(fecha), { id: fecha, fecha: ms, ...valores }));
  },
  borrarMedidas: (id: string) => medidas().borrar(id),
  fotos: () => fotos().todos(),
  foto: (id: string) => fotos().porId(id),
  imagen: (id: string) => imagenes().porId(id),
  /** Primero la imagen y después la foto: nunca queda una foto sin imagen. */
  async guardarFoto(f: Foto, img: Imagen) {
    await imagenes().poner(img);
    await fotos().poner(f);
  },
  async borrarFoto(id: string) {
    await fotos().borrar(id);
    await imagenes().borrar(id);
  },
};
