// Proyección de la fuerza estimada: curva logarítmica con tope de prudencia por nivel.
const DIA = 86_400_000;
const MES = 30.44;
const MINIMO_PUNTOS = 4;
const MINIMO_DIAS = 21;

export type Nivel = 'principiante' | 'intermedio' | 'avanzado';
export const TASA: Record<Nivel, number> = { principiante: 0.05, intermedio: 0.02, avanzado: 0.01 };
export const NIVELES: { id: Nivel; nombre: string; detalle: string }[] = [
  { id: 'principiante', nombre: 'Principiante', detalle: 'Menos de 1 año entrenando' },
  { id: 'intermedio', nombre: 'Intermedio', detalle: 'De 1 a 3 años' },
  { id: 'avanzado', nombre: 'Avanzado', detalle: 'Más de 3 años' },
];

export type Punto = { fecha: number; e1rm: number };
export type Curva = { a: number; b: number; inicio: number; sd: number };
export type MesProyectado = { m: 1 | 3 | 6; valor: number; min: number; max: number };
export type Proyeccion =
  | { estado: 'faltan-datos'; faltanSesiones: number; faltanDias: number }
  | { estado: 'estable'; hoy: number }
  | { estado: 'ok'; hoy: number; base: number; curva: Curva; tasa: number; ahora: number; meses: MesProyectado[] };
type Ok = Extract<Proyeccion, { estado: 'ok' }>;

const medio = (n: number) => Math.round(n * 2) / 2;
const x = (inicio: number, fecha: number) => Math.log(Math.max(0, (fecha - inicio) / DIA) + 1);

/** Mínimos cuadrados de e1rm = a + b·ln(días + 1). Null con menos de 2 puntos o todos el mismo día. */
export function ajustarCurva(puntos: Punto[]): Curva | null {
  if (puntos.length < 2) return null;
  const orden = [...puntos].sort((p, q) => p.fecha - q.fecha);
  const inicio = orden[0].fecha;
  const xs = orden.map((p) => x(inicio, p.fecha));
  const ys = orden.map((p) => p.e1rm);
  const n = xs.length;
  const mx = xs.reduce((t, v) => t + v, 0) / n;
  const my = ys.reduce((t, v) => t + v, 0) / n;
  const sxx = xs.reduce((t, v) => t + (v - mx) ** 2, 0);
  if (sxx < 1e-12) return null;
  const b = xs.reduce((t, v, i) => t + (v - mx) * (ys[i] - my), 0) / sxx;
  const a = my - b * mx;
  const residuos = xs.reduce((t, v, i) => t + (ys[i] - (a + b * v)) ** 2, 0);
  const sd = n > 2 ? Math.sqrt(residuos / (n - 2)) : 0;
  return { a, b, inicio, sd };
}

export function valorCurva(c: Curva, fecha: number): number {
  return c.a + c.b * x(c.inicio, fecha);
}

/** Valor proyectado (sin redondear) a `dias` desde hoy: la curva, sin pasar el ritmo del nivel. */
export function proyectadoEn(p: Ok, dias: number): number {
  return Math.min(valorCurva(p.curva, p.ahora + dias * DIA), p.base * (1 + p.tasa) ** (dias / MES));
}

export function proyectar(puntos: Punto[], ahora: number, nivel: Nivel): Proyeccion {
  const fechas = puntos.map((p) => p.fecha);
  const span = puntos.length ? (Math.max(...fechas) - Math.min(...fechas)) / DIA : 0;
  const curva = ajustarCurva(puntos);
  if (puntos.length < MINIMO_PUNTOS || span < MINIMO_DIAS || !curva) {
    return { estado: 'faltan-datos', faltanSesiones: Math.max(0, MINIMO_PUNTOS - puntos.length), faltanDias: Math.max(0, Math.ceil(MINIMO_DIAS - span)) };
  }
  const base = valorCurva(curva, ahora);
  if (curva.b <= 0) return { estado: 'estable', hoy: medio(base) };
  const p: Ok = { estado: 'ok', hoy: medio(base), base, curva, tasa: TASA[nivel], ahora, meses: [] };
  p.meses = ([1, 3, 6] as const).map((m) => {
    const valor = proyectadoEn(p, m * MES);
    const margen = Math.max(2.5, curva.sd * (1 + m / 3));
    return { m, valor: medio(valor), min: medio(Math.max(valor - margen, base - margen)), max: medio(valor + margen) };
  });
  return p;
}
