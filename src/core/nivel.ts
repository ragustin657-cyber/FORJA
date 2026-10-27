// Nivel sugerido según la fuerza relativa al peso corporal en los ejercicios básicos.
import type { Nivel } from './proyeccion';

const DIA = 86_400_000;
const VENTANA_DIAS = 90;
const ORDEN: Nivel[] = ['principiante', 'intermedio', 'avanzado'];

export type Grupo = 'banca' | 'sentadilla' | 'peso muerto' | 'press militar';

export const GRUPOS: Record<Grupo, string[]> = {
  banca: ['Barbell_Bench_Press_-_Medium_Grip'],
  sentadilla: ['Barbell_Squat'],
  'peso muerto': ['Barbell_Deadlift', 'Sumo_Deadlift'],
  'press militar': ['Standing_Military_Press', 'Barbell_Shoulder_Press', 'Seated_Barbell_Military_Press'],
};

/** Umbrales [intermedio, avanzado] del 1RM estimado dividido el peso corporal. */
const UMBRALES: Record<'hombre' | 'mujer', Record<Grupo, [number, number]>> = {
  hombre: { banca: [1, 1.5], sentadilla: [1.25, 1.75], 'peso muerto': [1.5, 2.25], 'press militar': [0.65, 0.9] },
  mujer: { banca: [0.6, 0.9], sentadilla: [0.9, 1.3], 'peso muerto': [1.1, 1.6], 'press militar': [0.4, 0.6] },
};

export function nivelSugerido(
  sexo: 'hombre' | 'mujer' | undefined,
  pesoKg: number | undefined,
  sesiones: { ejercicioId: string; fecha: number; e1rm: number }[],
  ahora: number,
): { nivel: Nivel; grupos: Grupo[] } | null {
  if (!sexo || !pesoKg) return null;
  const recientes = sesiones.filter((s) => ahora - s.fecha <= VENTANA_DIAS * DIA);
  const porGrupo: [Grupo, Nivel][] = [];
  for (const g of Object.keys(GRUPOS) as Grupo[]) {
    const valores = recientes.filter((s) => GRUPOS[g].includes(s.ejercicioId)).map((s) => s.e1rm);
    if (!valores.length) continue;
    const ratio = Math.max(...valores) / pesoKg;
    const [inter, avanz] = UMBRALES[sexo][g];
    porGrupo.push([g, ratio >= avanz ? 'avanzado' : ratio >= inter ? 'intermedio' : 'principiante']);
  }
  if (porGrupo.length < 2) return null;
  const votos = ORDEN.map((n) => porGrupo.filter(([, v]) => v === n).length);
  const max = Math.max(...votos);
  const nivel = ORDEN[votos.indexOf(max)];
  return { nivel, grupos: porGrupo.filter(([, v]) => v === nivel).map(([g]) => g) };
}

export function textoNivel(s: { nivel: Nivel; grupos: Grupo[] }): string {
  const g = s.grupos;
  const lista = g.length === 1 ? g[0] : `${g.slice(0, -1).join(', ')} y ${g[g.length - 1]}`;
  return `Tus números en ${lista} indican nivel ${s.nivel}.`;
}
