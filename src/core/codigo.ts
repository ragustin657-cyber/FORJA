// Lectura de códigos de barras de productos (EAN-13, EAN-8, UPC-A, UPC-E) con ZXing.
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatOneDReader, RGBLuminanceSource } from '../../vendor/zxing.js';

let lector: MultiFormatOneDReader | null = null;
let pistas: Map<number, unknown> | null = null;

function preparar() {
  if (!lector) {
    pistas = new Map<number, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    lector = new MultiFormatOneDReader(pistas);
  }
  return { lector, pistas: pistas! };
}

/** Busca un código en una imagen en escala de grises (un byte por píxel). Devuelve null si no encuentra ninguno. */
export function decodificarLuminancia(luminancia: Uint8ClampedArray, ancho: number, alto: number): string | null {
  const { lector, pistas } = preparar();
  try {
    return lector.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminancia, ancho, alto))), pistas).getText();
  } catch {
    return null;
  }
}

/** Deja solo los dígitos de un código escrito a mano; null si no tiene 8, 12 o 13 dígitos. */
export function limpiarCodigo(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '');
  return [8, 12, 13].includes(digitos.length) ? digitos : null;
}
