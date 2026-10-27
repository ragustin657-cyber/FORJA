// Procesamiento de fotos de progreso: achica, espeja si hace falta y comprime a JPEG.
import { medidasEscaladas } from '../core/cuerpo/fotos';

const CALIDAD = 0.82;
const MAX_IMAGEN = 1600;
const MAX_MINIATURA = 320;

type Fuente = ImageBitmap | HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

function tamano(f: Fuente): { ancho: number; alto: number } {
  if (f instanceof HTMLVideoElement) return { ancho: f.videoWidth, alto: f.videoHeight };
  if (f instanceof HTMLImageElement) return { ancho: f.naturalWidth, alto: f.naturalHeight };
  return { ancho: f.width, alto: f.height };
}

function aJpeg(f: Fuente, ancho: number, alto: number, espejar: boolean): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  const g = c.getContext('2d')!;
  if (espejar) {
    g.translate(ancho, 0);
    g.scale(-1, 1);
  }
  g.drawImage(f, 0, 0, ancho, alto);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo comprimir la foto'))), 'image/jpeg', CALIDAD));
}

export async function procesarImagen(fuente: Fuente, opciones: { espejar?: boolean } = {}): Promise<{ imagen: Blob; miniatura: Blob; ancho: number; alto: number }> {
  const { ancho, alto } = tamano(fuente);
  const grande = medidasEscaladas(ancho, alto, MAX_IMAGEN);
  const chica = medidasEscaladas(ancho, alto, MAX_MINIATURA);
  const espejar = opciones.espejar ?? false;
  return {
    imagen: await aJpeg(fuente, grande.ancho, grande.alto, espejar),
    miniatura: await aJpeg(fuente, chica.ancho, chica.alto, espejar),
    ...grande,
  };
}

/**
 * Lee una foto de la galería respetando su orientación (EXIF). Si el navegador no acepta la opción
 * de orientación, la decodifica con <img>, que en Safari también aplica la orientación.
 */
export async function desdeArchivo(archivo: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(archivo);
    // Se libera más tarde: Safari puede necesitar la URL hasta que se dibuja la imagen.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  }
}
