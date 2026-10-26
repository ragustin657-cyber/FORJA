import JSZip from 'jszip';
import { almacen, TABLAS, type NombreTabla, type Registro } from './db';

export const VERSION_FORMATO = 1;
const ARCHIVO_DATOS = 'datos.json';

type Motivo = 'corrupto' | 'version-nueva' | 'no-es-forja';

const MENSAJES: Record<Motivo, string> = {
  corrupto: 'El archivo está dañado.',
  'version-nueva': 'Esta copia es de una versión más nueva de FORJA. Actualizá la app y probá de nuevo.',
  'no-es-forja': 'Este archivo no es una copia de FORJA.',
};

export class ErrorBackup extends Error {
  constructor(public motivo: Motivo) {
    super(MENSAJES[motivo]);
    this.name = 'ErrorBackup';
  }
}

type Contenido = { app: 'forja'; version: number; fecha: number; tablas: Partial<Record<NombreTabla, Registro[]>> };

export function nombreArchivo(fecha = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `forja-${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}-${d(fecha.getDate())}.zip`;
}

/** Genera un .zip con todas las tablas. Las fotos se agregan cuando exista su tabla (fase de progreso corporal). */
export async function exportar(_opciones: { incluirFotos: boolean }): Promise<Blob> {
  const tablas: Partial<Record<NombreTabla, Registro[]>> = {};
  for (const t of TABLAS) tablas[t] = await almacen().tabla(t).todos();
  const contenido: Contenido = { app: 'forja', version: VERSION_FORMATO, fecha: Date.now(), tablas };
  const zip = new JSZip();
  zip.file(ARCHIVO_DATOS, JSON.stringify(contenido));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Lee y valida una copia sin tocar los datos actuales. */
async function leer(archivo: Blob): Promise<Contenido> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await archivo.arrayBuffer());
  } catch {
    throw new ErrorBackup('corrupto');
  }
  const entrada = zip.file(ARCHIVO_DATOS);
  if (!entrada) throw new ErrorBackup('no-es-forja');
  let datos: unknown;
  try {
    datos = JSON.parse(await entrada.async('string'));
  } catch {
    throw new ErrorBackup('corrupto');
  }
  const c = datos as Partial<Contenido>;
  if (c?.app !== 'forja' || typeof c.version !== 'number') throw new ErrorBackup('no-es-forja');
  if (c.version > VERSION_FORMATO) throw new ErrorBackup('version-nueva');
  if (typeof c.tablas !== 'object' || c.tablas === null) throw new ErrorBackup('corrupto');
  for (const filas of Object.values(c.tablas)) {
    if (!Array.isArray(filas) || filas.some((f) => typeof f?.id !== 'string')) throw new ErrorBackup('corrupto');
  }
  return c as Contenido;
}

export async function leerResumen(archivo: Blob): Promise<{ fecha: number; sesiones: number; rutinas: number; fotos: number }> {
  const c = await leer(archivo);
  return {
    fecha: c.fecha,
    sesiones: c.tablas.sesiones?.length ?? 0,
    rutinas: c.tablas.rutinas?.length ?? 0,
    fotos: 0,
  };
}

/** Reemplaza todos los datos por los de la copia. Si la copia no es válida, no cambia nada. */
export async function restaurar(archivo: Blob): Promise<void> {
  const c = await leer(archivo);
  const datos = Object.fromEntries(TABLAS.map((t) => [t, c.tablas[t] ?? []])) as Record<NombreTabla, Registro[]>;
  await almacen().reemplazarTodo(datos);
}
