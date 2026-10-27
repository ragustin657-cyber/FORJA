// Tipos mínimos de lo que FORJA usa de ZXing (ver scripts/vendor-zxing.mjs).
export declare const BarcodeFormat: { EAN_13: number; EAN_8: number; UPC_A: number; UPC_E: number };
export declare const DecodeHintType: { POSSIBLE_FORMATS: number; TRY_HARDER: number };
export declare class RGBLuminanceSource { constructor(luminancias: Uint8ClampedArray, ancho: number, alto: number) }
export declare class HybridBinarizer { constructor(fuente: RGBLuminanceSource) }
export declare class BinaryBitmap { constructor(binarizador: HybridBinarizer) }
export declare class MultiFormatOneDReader {
  constructor(hints: Map<number, unknown>);
  decode(imagen: BinaryBitmap, hints?: Map<number, unknown>): { getText(): string };
}
