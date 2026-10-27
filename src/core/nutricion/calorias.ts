import type { Perfil } from './perfil';

export type Sexo = 'hombre' | 'mujer';
export type Actividad = 'sedentario' | 'liviano' | 'moderado' | 'alto' | 'muyAlto';
export type ObjetivoNutri = 'bajar' | 'mantener' | 'ganar';

export interface Metas {
  kcal: number;
  proteina: number;
  grasas: number;
  carbos: number;
  basal: number;
  gasto: number;
  topeAplicado: boolean;
  explicacion: string[];
  /** Aviso cuando los números salen fuera de lo razonable. */
  alerta?: string;
}

export const FACTOR_ACTIVIDAD: Record<Actividad, number> = { sedentario: 1.2, liviano: 1.375, moderado: 1.55, alto: 1.725, muyAlto: 1.9 };
const AJUSTE: Record<ObjetivoNutri, number> = { bajar: -0.2, mantener: 0, ganar: 0.1 };
const MINIMO: Record<Sexo, number> = { hombre: 1500, mujer: 1200 };
const KCAL_POR_KG = 7700;
const LIMITE_RAZONABLE = 4500;

const decena = (n: number) => Math.round(n / 10) * 10;
const miles = (n: number) => n.toLocaleString('es-AR');

/** Años cumplidos a la fecha `hoy`. Nacimiento en formato AAAA-MM-DD. */
export function edad(nacimiento: string, hoy: Date): number {
  const [a, m, d] = nacimiento.split('-').map(Number);
  let anios = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) anios--;
  return anios;
}

/** Mifflin-St Jeor. */
export function metabolismoBasal(sexo: Sexo, pesoKg: number, alturaCm: number, anios: number): number {
  return 10 * pesoKg + 6.25 * alturaCm - 5 * anios + (sexo === 'hombre' ? 5 : -161);
}

export function calcularMetas(perfil: Perfil, pesoKg: number, hoy: Date): Metas {
  const basal = metabolismoBasal(perfil.sexo, pesoKg, perfil.alturaCm, edad(perfil.nacimiento, hoy));
  const gasto = basal * FACTOR_ACTIVIDAD[perfil.actividad];
  const ajuste = perfil.ajusteKcal ?? 0;
  const buscado = gasto * (1 + AJUSTE[perfil.objetivo]) + ajuste;
  const maxDeficit = (pesoKg * 0.01 * KCAL_POR_KG) / 7;
  // El piso vale para todos los objetivos; el tope del 1 % por semana, solo para bajar.
  const minimo = Math.max(basal, MINIMO[perfil.sexo], perfil.objetivo === 'bajar' ? gasto - maxDeficit : 0);
  const exacto = Math.max(buscado, minimo);
  const topeAplicado = exacto > buscado;
  const kcal = decena(exacto);

  const proteina = Math.round(pesoKg * (perfil.objetivo === 'mantener' ? 1.8 : 2));
  const grasasExactas = Math.max((kcal * 0.25) / 9, pesoKg * 0.6);
  const grasas = Math.round(grasasExactas);
  const carbos = Math.max(0, Math.round((kcal - proteina * 4 - grasasExactas * 9) / 4));

  const explicacion = [`Tu cuerpo gasta unas ${miles(decena(gasto))} kcal por día.`];
  if (perfil.objetivo === 'mantener') explicacion.push('Para mantener tu peso comés lo mismo que gastás.');
  else if (perfil.objetivo === 'ganar') explicacion.push(`Para ganar músculo comés un 10 % más: ${miles(kcal)} kcal.`);
  else explicacion.push(`Para bajar grasa comés un 20 % menos: ${miles(decena(buscado - ajuste))} kcal.`);
  if (ajuste) explicacion.push(`Según cómo viene tu peso, le ${ajuste < 0 ? 'restamos' : 'sumamos'} ${miles(Math.abs(ajuste))} kcal.`);
  if (topeAplicado) explicacion.push(`Lo subimos a ${miles(kcal)} kcal para que no sea un plan demasiado estricto.`);

  const alerta = kcal > LIMITE_RAZONABLE ? 'Tus números dan muy altos. Revisá los datos y, si están bien, consultá a un profesional.' : undefined;
  return { kcal, proteina, grasas, carbos, basal, gasto: Math.round(gasto), topeAplicado, explicacion, ...(alerta ? { alerta } : {}) };
}
