// Ajuste de calorías cada 2 semanas según cómo viene el peso.
import { calcularMetas, type ObjetivoNutri } from './calorias';
import type { Perfil } from './perfil';
import type { PuntoPeso } from './peso';

const DIA = 86_400_000;
const PASO = 150;

export interface Propuesta {
  delta: 150 | -150;
  /** Cambio de peso por semana, en kg (negativo = bajó). */
  cambioKgSemana: number;
  motivo: string;
  kcalAntes: number;
  kcalDespues: number;
  /** El ajuste total que queda guardado: el que realmente cambia las calorías (los topes pueden recortarlo). */
  ajusteNuevo: number;
}

/** Umbrales del cambio semanal en % del peso: por encima de `max` se resta, por debajo de `min` se suma. */
const UMBRALES: Record<ObjetivoNutri, { min: number; max: number }> = {
  bajar: { min: -1, max: -0.25 },
  mantener: { min: -0.25, max: 0.25 },
  ganar: { min: 0.1, max: 0.5 },
};

const promedio = (xs: PuntoPeso[]) => xs.reduce((t, p) => t + p.kg, 0) / xs.length;

function textoKg(kg: number): string {
  return kg.toFixed(1).replace('.', ',').replace(/,0$/, '');
}

function motivo(objetivo: ObjetivoNutri, kgSemana: number, delta: number): string {
  const cambio = Math.abs(kgSemana) < 0.05 ? 'tu peso casi no cambió' : `${kgSemana < 0 ? 'bajaste' : 'subiste'} ${textoKg(Math.abs(kgSemana))} kg por semana`;
  if (objetivo === 'mantener') return `${cambio} y tu objetivo es mantenerte`;
  // Bajando, restar calorías es porque va lento; ganando, restar es porque va rápido.
  const lento = (objetivo === 'bajar') === (delta < 0);
  return `${cambio}, ${lento ? 'más lento de lo buscado' : objetivo === 'bajar' ? 'más rápido de lo recomendable' : 'más rápido de lo buscado'}`;
}

/**
 * null = todavía no corresponde revisar (faltan pesos o pasaron menos de 14 días del último chequeo);
 * 'sin-cambios' = se revisó y no hace falta ajustar (o los topes no dejan mover las calorías).
 */
export function proponerAjuste(perfil: Perfil, pesos: PuntoPeso[], ahora: number): Propuesta | null | 'sin-cambios' {
  if (perfil.ultimoAjuste !== undefined && ahora - perfil.ultimoAjuste < 14 * DIA) return null;
  const orden = [...pesos].sort((a, b) => a.fecha - b.fecha);
  if (!orden.length || orden[0].fecha > ahora - 28 * DIA) return null;
  const recientes = orden.filter((p) => p.fecha >= ahora - 14 * DIA && p.fecha <= ahora);
  const anteriores = orden.filter((p) => p.fecha >= ahora - 28 * DIA && p.fecha < ahora - 14 * DIA);
  if (!recientes.length || !anteriores.length) return null;

  const a = promedio(recientes);
  const kgSemana = (a - promedio(anteriores)) / 2;
  const pct = (kgSemana / a) * 100;
  const { min, max } = UMBRALES[perfil.objetivo];
  const delta = pct > max ? -PASO : pct < min ? PASO : 0;
  if (!delta) return 'sin-cambios';

  const pesoKg = orden[orden.length - 1].kg;
  const hoy = new Date(ahora);
  const actual = perfil.ajusteKcal ?? 0;
  const kcalAntes = calcularMetas(perfil, pesoKg, hoy).kcal;
  const kcalDespues = calcularMetas({ ...perfil, ajusteKcal: actual + delta }, pesoKg, hoy).kcal;
  if (kcalDespues === kcalAntes) return 'sin-cambios';
  return {
    delta: delta as 150 | -150,
    cambioKgSemana: kgSemana,
    motivo: motivo(perfil.objetivo, kgSemana, delta),
    kcalAntes,
    kcalDespues,
    ajusteNuevo: actual + (kcalDespues - kcalAntes),
  };
}
