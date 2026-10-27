// Fotos de progreso: poses, agrupación por fecha, recordatorio y tamaños.
const DIA = 86_400_000;

export type Pose = 'frente' | 'perfil' | 'espalda';
export const POSES: { id: Pose; nombre: string }[] = [
  { id: 'frente', nombre: 'Frente' },
  { id: 'perfil', nombre: 'Perfil' },
  { id: 'espalda', nombre: 'Espalda' },
];

export interface Foto {
  id: string;
  /** AAAA-MM-DD */
  fecha: string;
  pose: Pose;
  creado: number;
}

export interface Imagen {
  id: string;
  imagen: Blob;
  miniatura: Blob;
}

export const idFoto = (fecha: string, pose: Pose) => `${fecha}-${pose}`;

function medianoche(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
}

/** true si nunca hubo fotos o pasaron 14 días desde la última, salvo que se haya pospuesto hace menos de 3 días. */
export function necesitaFotos(ultimaFoto: string | undefined, pospuestas: number | null, ahora: number): boolean {
  if (pospuestas !== null && ahora - pospuestas < 3 * DIA) return false;
  return ultimaFoto === undefined || ahora - medianoche(ultimaFoto) >= 14 * DIA;
}

export function fotosPorFecha(fotos: Foto[]): { fecha: string; poses: Partial<Record<Pose, Foto>> }[] {
  const grupos = new Map<string, Partial<Record<Pose, Foto>>>();
  for (const f of fotos) grupos.set(f.fecha, { ...grupos.get(f.fecha), [f.pose]: f });
  return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([fecha, poses]) => ({ fecha, poses }));
}

export function paresParaComparar(fotos: Foto[], pose: Pose): { antes: string; despues: string } | null {
  const fechas = fotos.filter((f) => f.pose === pose).map((f) => f.fecha).sort();
  return fechas.length < 2 ? null : { antes: fechas[0], despues: fechas[fechas.length - 1] };
}

export function posesFaltantes(fotos: Foto[], fecha: string): Pose[] {
  const hay = new Set(fotos.filter((f) => f.fecha === fecha).map((f) => f.pose));
  return POSES.map((p) => p.id).filter((p) => !hay.has(p));
}

/** Tamaño con el lado largo como máximo `max`, sin agrandar. */
export function medidasEscaladas(ancho: number, alto: number, max: number): { ancho: number; alto: number } {
  const k = Math.min(1, max / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * k), alto: Math.round(alto * k) };
}
