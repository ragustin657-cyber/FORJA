import JSZip from 'jszip';
import { almacen, TABLAS, type NombreTabla, type Registro } from './db';

export const VERSION_FORMATO = 2;
const CARPETA_FOTOS = 'fotos/';
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

/** Tablas que no van como JSON: las imágenes viajan como archivos en `fotos/`. */
const FUERA_DEL_JSON: NombreTabla[] = ['imagenes'];
const DE_FOTOS: NombreTabla[] = ['fotos', 'imagenes'];

type ImagenGuardada = Registro & { imagen: Blob; miniatura: Blob };

/** Bytes que ocupan las fotos (imagen + miniatura), para avisar el tamaño de la copia. */
export async function tamanoFotos(): Promise<number> {
  const imgs = await almacen().tabla<ImagenGuardada>('imagenes').todos();
  return imgs.reduce((t, i) => t + i.imagen.size + i.miniatura.size, 0);
}

/** Genera un .zip con todas las tablas y, si se pide, las fotos. */
export async function exportar(opciones: { incluirFotos: boolean }): Promise<Blob> {
  const tablas: Partial<Record<NombreTabla, Registro[]>> = {};
  for (const t of TABLAS) {
    if (FUERA_DEL_JSON.includes(t) || (!opciones.incluirFotos && DE_FOTOS.includes(t))) continue;
    tablas[t] = await almacen().tabla(t).todos();
  }
  const contenido: Contenido = { app: 'forja', version: VERSION_FORMATO, fecha: Date.now(), tablas };
  const zip = new JSZip();
  zip.file(ARCHIVO_DATOS, JSON.stringify(contenido));
  if (opciones.incluirFotos) {
    for (const i of await almacen().tabla<ImagenGuardada>('imagenes').todos()) {
      zip.file(`${CARPETA_FOTOS}${i.id}.jpg`, await i.imagen.arrayBuffer(), { compression: 'STORE' });
      zip.file(`${CARPETA_FOTOS}${i.id}-mini.jpg`, await i.miniatura.arrayBuffer(), { compression: 'STORE' });
    }
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Lee y valida una copia sin tocar los datos actuales. */
async function leer(archivo: Blob): Promise<{ c: Contenido; zip: JSZip }> {
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
  return { c: c as Contenido, zip };
}

export async function leerResumen(archivo: Blob): Promise<{ fecha: number; sesiones: number; rutinas: number; fotos: number }> {
  const { c } = await leer(archivo);
  return {
    fecha: c.fecha,
    sesiones: c.tablas.sesiones?.length ?? 0,
    rutinas: c.tablas.rutinas?.length ?? 0,
    fotos: c.tablas.fotos?.length ?? 0,
  };
}

/**
 * Reemplaza todos los datos por los de la copia. Si la copia no es válida, no cambia nada.
 * Si la copia no trae fotos, se conservan las del iPhone; si las trae, se descartan las que no tienen su imagen.
 */
export async function restaurar(archivo: Blob): Promise<void> {
  const { c, zip } = await leer(archivo);
  const datos = Object.fromEntries(TABLAS.map((t) => [t, c.tablas[t] ?? []])) as Record<NombreTabla, Registro[]>;
  if (c.tablas.fotos === undefined) {
    datos.fotos = await almacen().tabla('fotos').todos();
    datos.imagenes = await almacen().tabla('imagenes').todos();
  } else {
    const fotos: Registro[] = [];
    const imagenes: ImagenGuardada[] = [];
    for (const f of c.tablas.fotos) {
      const grande = zip.file(`${CARPETA_FOTOS}${f.id}.jpg`);
      const mini = zip.file(`${CARPETA_FOTOS}${f.id}-mini.jpg`);
      if (!grande || !mini) continue;
      const jpg = async (e: JSZip.JSZipObject) => new Blob([await e.async('arraybuffer')], { type: 'image/jpeg' });
      fotos.push(f);
      imagenes.push({ id: f.id, imagen: await jpg(grande), miniatura: await jpg(mini) });
    }
    datos.fotos = fotos;
    datos.imagenes = imagenes;
  }
  await almacen().reemplazarTodo(datos);
}
