// Medidas corporales: validación, registro por día y evolución.
import { parsearNumero } from '../unidades';

export type NombreMedida = 'cintura' | 'pecho' | 'brazo' | 'pierna' | 'cadera' | 'cuello';

export const MEDIDAS: { id: NombreMedida; nombre: string; articulo: 'La' | 'El'; ayuda: string }[] = [
  { id: 'cintura', nombre: 'Cintura', articulo: 'La', ayuda: 'A la altura del ombligo, relajado.' },
  { id: 'pecho', nombre: 'Pecho', articulo: 'El', ayuda: 'A la altura de las tetillas.' },
  { id: 'brazo', nombre: 'Brazo', articulo: 'El', ayuda: 'En la parte más ancha, relajado.' },
  { id: 'pierna', nombre: 'Pierna', articulo: 'La', ayuda: 'En la parte más ancha del muslo.' },
  { id: 'cadera', nombre: 'Cadera', articulo: 'La', ayuda: 'En la parte más ancha de los glúteos.' },
  { id: 'cuello', nombre: 'Cuello', articulo: 'El', ayuda: 'Debajo de la nuez.' },
];

export type Medidas = Partial<Record<NombreMedida, number>>;
export type RegistroMedidas = { id: string; fecha: number } & Medidas;

const RANGOS: Record<NombreMedida, [number, number]> = {
  cintura: [15, 250], pecho: [15, 250], brazo: [15, 250], pierna: [15, 250], cadera: [15, 250], cuello: [20, 70],
};

export function validarMedidas(textos: Partial<Record<NombreMedida, string>>): { valores: Medidas; errores: string[] } {
  const valores: Medidas = {};
  const errores: string[] = [];
  for (const m of MEDIDAS) {
    const texto = textos[m.id]?.trim();
    if (!texto) continue;
    const n = parsearNumero(texto);
    const [min, max] = RANGOS[m.id];
    if (n === null || n < min || n > max) errores.push(`${m.articulo} ${m.nombre.toLowerCase()} tiene que estar entre ${min} y ${max} cm.`);
    else valores[m.id] = n;
  }
  if (errores.length === 0 && Object.keys(valores).length === 0) errores.push('Completá al menos una medida.');
  return { valores, errores };
}

/** Un registro por día: los campos nuevos reemplazan y los que faltan conservan lo anterior. */
export function combinarMedidas(antes: RegistroMedidas | undefined, nuevo: RegistroMedidas): RegistroMedidas {
  return { ...antes, ...nuevo };
}

const porFecha = (rs: RegistroMedidas[]) => [...rs].sort((a, b) => a.fecha - b.fecha);
const redondear = (n: number) => Math.round(n * 10) / 10;

export function serieDeMedida(registros: RegistroMedidas[], m: NombreMedida): { fecha: number; valor: number }[] {
  return porFecha(registros).flatMap((r) => (r[m] === undefined ? [] : [{ fecha: r.fecha, valor: r[m]! }]));
}

/** El último valor de cada medida y la diferencia contra el anterior (null si es el primero). */
export function ultimasMedidas(registros: RegistroMedidas[]): Partial<Record<NombreMedida, { valor: number; diferencia: number | null }>> {
  const salida: Partial<Record<NombreMedida, { valor: number; diferencia: number | null }>> = {};
  for (const { id } of MEDIDAS) {
    const serie = serieDeMedida(registros, id);
    if (!serie.length) continue;
    const ultimo = serie[serie.length - 1].valor;
    salida[id] = { valor: ultimo, diferencia: serie.length > 1 ? redondear(ultimo - serie[serie.length - 2].valor) : null };
  }
  return salida;
}
