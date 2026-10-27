import type { DiaMenu } from '../../core/nutricion/menu';
import type { Perfil } from '../../core/nutricion/perfil';
import { almacen } from '../db';

export interface RegistroPeso {
  id: string;
  fecha: number;
  kg: number;
}
export interface MenuGuardado {
  id: string;
  semilla: number;
  perfilHash: string;
  dias: DiaMenu[];
}
type Tachados = { id: string; alimentos: string[] };

const dia = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function pesos(): Promise<RegistroPeso[]> {
  return (await almacen().tabla<RegistroPeso>('pesos').todos()).sort((a, b) => a.fecha - b.fecha);
}

export const nutricionRepo = {
  perfil: () => almacen().tabla<Perfil>('perfil').porId('yo'),
  /** Guarda el perfil y el peso del día (un registro por día: el último reemplaza al anterior). */
  async guardarPerfil(p: Perfil, pesoKg: number, ahora: number) {
    await almacen().tabla<Perfil>('perfil').poner(p);
    await almacen().tabla<RegistroPeso>('pesos').poner({ id: dia(ahora), fecha: ahora, kg: pesoKg });
  },
  pesos,
  async pesoActual(): Promise<number | undefined> {
    return (await pesos()).pop()?.kg;
  },
  menu: (semana: string) => almacen().tabla<MenuGuardado>('menus').porId(semana),
  guardarMenu: (m: MenuGuardado) => almacen().tabla<MenuGuardado>('menus').poner(m),
  async tachados(semana: string): Promise<string[]> {
    return (await almacen().tabla<Tachados>('compras').porId(semana))?.alimentos ?? [];
  },
  async alternarTachado(semana: string, alimentoId: string) {
    const actuales = await this.tachados(semana);
    const alimentos = actuales.includes(alimentoId) ? actuales.filter((x) => x !== alimentoId) : [...actuales, alimentoId];
    await almacen().tabla<Tachados>('compras').poner({ id: semana, alimentos });
  },
};
